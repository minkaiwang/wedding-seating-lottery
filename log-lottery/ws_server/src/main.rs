use actix_cors::Cors;
use actix_web::{
    App, Error, HttpRequest, HttpResponse, HttpServer, Responder, post, rt, web, web::Payload,
};
use actix_ws::AggregatedMessage;
use futures_util::StreamExt as _;
use serde::Deserialize;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};
use tokio::{
    select,
    sync::{RwLock, broadcast},
};

const MAX_USER_MESSAGE_BYTES: usize = 64 * 1024;
const MAX_USER_SIGNATURE_BYTES: usize = 128;

// 统一响应结构体
#[derive(serde::Serialize)]
struct ApiResponse<T> {
    code: i32,
    success: bool,
    msg: String,
    data: Option<T>,
}

impl<T> ApiResponse<T> {
    // 添加一个专门用于无数据响应的静态方法
    fn success_without_data(msg: String) -> ApiResponse<()> {
        ApiResponse {
            code: 200,
            success: true,
            msg,
            data: None,
        }
    }

    fn error(code: i32, msg: String) -> ApiResponse<()> {
        ApiResponse {
            code,
            success: false,
            msg,
            data: None,
        }
    }
}

#[derive(Deserialize)]
struct EchoQuery {
    #[serde(rename = "userSignature")]
    user_signature: String,
}

fn is_valid_user_signature(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_USER_SIGNATURE_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
}

fn allowed_origins() -> HashSet<String> {
    let configured = std::env::var("WEDDING_SEATING_ORIGINS").unwrap_or_default();
    let mut origins: HashSet<String> = configured
        .split(',')
        .map(str::trim)
        .filter(|origin| origin.starts_with("http://") || origin.starts_with("https://"))
        .map(|origin| origin.trim_end_matches('/').to_string())
        .collect();

    if origins.is_empty() {
        for port in [3000, 3001, 3002, 6719] {
            origins.insert(format!("http://localhost:{port}"));
            origins.insert(format!("http://127.0.0.1:{port}"));
        }
    }
    origins
}
// 定义消息类型（可以根据需求扩展为结构体）
type WsMessage = String;
#[derive(Clone)]
struct AppState {
    // 使用 HashMap 存储不同 user_signature 的广播通道
    tx_map: web::Data<RwLock<HashMap<String, broadcast::Sender<WsMessage>>>>,
}

#[post("/user-msg")]
async fn user_msg(req: HttpRequest, req_body: String, data: web::Data<AppState>) -> impl Responder {
    let Some(target_user_signature) = req
        .headers()
        .get("userSignature")
        .and_then(|value| value.to_str().ok())
        .filter(|value| is_valid_user_signature(value))
    else {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            400,
            "userSignature 缺失或格式不正确".to_string(),
        ));
    };

    // 获取对应 user_signature 的发送端
    let tx_map = data.tx_map.read().await;
    if let Some(tx) = tx_map.get(target_user_signature) {
        match tx.send(req_body.clone()) {
            Ok(_) => HttpResponse::Ok().json(ApiResponse::<()>::success_without_data(
                "发送成功".to_string(),
            )),
            Err(e) => {
                eprintln!("Failed to send message: {}", e);
                HttpResponse::InternalServerError()
                    .json(ApiResponse::<()>::error(500, "系统服务异常".to_string()))
            }
        }
    } else {
        HttpResponse::NotFound().json(ApiResponse::<()>::error(
            404,
            "后台服务未启动，请联系管理员".to_string(),
        ))
    }
}

async fn echo(
    req: HttpRequest,
    stream: Payload,
    data: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let query = match web::Query::<EchoQuery>::from_query(req.query_string()) {
        Ok(query) if is_valid_user_signature(&query.user_signature) => query,
        _ => {
            return Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                400,
                "userSignature 缺失或格式不正确".to_string(),
            )));
        }
    };
    let user_signature = query.user_signature.clone();
    let (res, mut session, stream) = actix_ws::handle(&req, stream)?;

    // 订阅广播通道（每个连接创建独立的接收端）
    // 为当前 user_signature 创建或获取广播通道
    let tx = {
        let mut tx_map = data.tx_map.write().await;
        if !tx_map.contains_key(&user_signature) {
            // 为这个 user_signature 创建新的广播通道
            let (new_tx, _) = broadcast::channel::<WsMessage>(1024);
            tx_map.insert(user_signature.clone(), new_tx.clone());
            new_tx
        } else {
            tx_map
                .get(&user_signature)
                .expect("channel exists after contains_key")
                .clone()
        }
    };

    let mut rx = tx.subscribe();
    let mut stream = stream
        .aggregate_continuations()
        .max_continuation_size(2_usize.pow(20));

    // 启动异步任务处理 WebSocket 消息和广播消息
    let tx_map = data.tx_map.clone();
    rt::spawn(async move {
        // 同时监听：1. WebSocket 客户端消息 2. 广播通道消息
        loop {
            select! {
                // 监听来自客户端的 WebSocket 消息（原 echo 逻辑）
                msg = stream.next() => {
                    match msg {
                        Some(Ok(AggregatedMessage::Text(text))) => {
                            println!("WebSocket client sent: {}", text);
                            // 回声（可选：保留原 echo 功能）
                            // 如果是ping消息则不回声
                            if text != "ping" {
                                // 回声
                                if let Err(e) = session.text(text.clone()).await {
                                    eprintln!("Failed to send text: {}", e);
                                    break;
                                }
                            }
                        }
                        Some(Ok(AggregatedMessage::Binary(bin))) => {
                            println!("WebSocket client sent binary: {:?}", bin);
                            if let Err(e) = session.binary(bin).await {
                                eprintln!("Failed to send binary: {}", e);
                                break;
                            }
                        }
                        Some(Ok(AggregatedMessage::Ping(msg))) => {
                            println!("WebSocket client sent ping: {:?}", msg);
                            // if let Err(e) = session.pong(&msg).await {
                            //     eprintln!("Failed to send pong: {}", e);
                            //     break;
                            // }
                        }
                        // 客户端断开连接或出错，退出循环
                        None | Some(Err(_)) => {
                            println!("WebSocket connection closed");
                            break;
                        }
                        _ => {}
                    }
                }
                // 监听广播通道的消息（来自 /user-msg）
                msg = rx.recv() => {
                    match msg {
                        Ok(text) => {
                            // 将广播消息发送给 WebSocket 客户端
                            if let Err(e) = session.text(text).await {
                                eprintln!("Failed to send broadcast msg: {}", e);
                                break;
                            }
                        }
                        Err(broadcast::error::RecvError::Closed) => {
                            eprintln!("Broadcast channel closed");
                            break;
                        }
                        Err(broadcast::error::RecvError::Lagged(_)) => {
                            eprintln!("Broadcast message lagged, missed some messages");
                        }
                    }
                }
            }
        }

        // 关闭 WebSocket 连接
        let _ = session.close(None).await;
        drop(rx);
        let mut channels = tx_map.write().await;
        if channels
            .get(&user_signature)
            .is_some_and(|sender| sender.receiver_count() == 0)
        {
            channels.remove(&user_signature);
        }
    });

    Ok(res)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let tx_map = web::Data::new(RwLock::new(HashMap::new()));
    let app_state = AppState { tx_map };
    let allowed_origins = Arc::new(allowed_origins());

    HttpServer::new(move || {
        let cors_origins = allowed_origins.clone();
        App::new()
            // 注入应用状态（广播通道发送端）
            .app_data(web::Data::new(app_state.clone()))
            .app_data(web::PayloadConfig::new(MAX_USER_MESSAGE_BYTES))
            .wrap(
                Cors::default()
                    .allowed_origin_fn(move |origin, _| {
                        origin
                            .to_str()
                            .is_ok_and(|value| cors_origins.contains(value.trim_end_matches('/')))
                    })
                    .allowed_methods(vec!["GET", "POST"])
                    .allow_any_header(),
            )
            .service(web::scope("/api").service(user_msg))
            .route("/echo", web::get().to(echo))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::{allowed_origins, is_valid_user_signature};

    #[test]
    fn signature_validation_is_bounded_and_ascii_only() {
        assert!(is_valid_user_signature("guest_01.test-id"));
        assert!(!is_valid_user_signature(""));
        assert!(!is_valid_user_signature("contains space"));
        assert!(!is_valid_user_signature("../escape"));
        assert!(!is_valid_user_signature(&"a".repeat(129)));
    }

    #[test]
    fn default_origins_are_local_only() {
        if std::env::var("WEDDING_SEATING_ORIGINS").is_ok() {
            return;
        }
        let origins = allowed_origins();
        assert!(origins.contains("http://localhost:3000"));
        assert!(origins.contains("http://127.0.0.1:6719"));
        assert!(origins.iter().all(|origin| {
            origin.starts_with("http://localhost:") || origin.starts_with("http://127.0.0.1:")
        }));
    }
}
