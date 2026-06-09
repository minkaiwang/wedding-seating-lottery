# 项目计划与后续改动指引

基于当前仓库现状整理：**排座**（Next.js + `localStorage`）、**可选云端同步**（Prisma + JWT + `/api/plan`）、**抽奖联动**（`log-lottery` 桥接与实时同步）。下列按优先级分组，并列出预计主要涉及的文件，便于排期与分工。

---

## 现状摘要（规划起点）

| 模块 | 说明 |
|------|------|
| 本地方案 | `src/lib/storage.ts`，布局侧大量状态在 `src/app/(main)/layout.tsx` |
| 云端方案 | `prisma/schema.prisma`（`CloudPlan` 按 `planKey` 存 JSON），`src/app/api/plan/*`，`/sync`：`src/app/(main)/sync/page.tsx` |
| 会话 | `src/lib/auth-session.ts`，`src/app/api/auth/*` |
| 抽奖 | `src/lib/lotteryBridge.ts`，`src/lib/lotteryLiveSync.ts`，`src/components/LotteryLiveSyncIframe.tsx`，宾客/预览页引用 |
| 文案与品牌 | `src/lib/i18n.ts`，`src/lib/brand.ts` |
| CI | `.github/workflows/ci.yml`，`scripts/engine-strict-run.mjs` |

---

## 阶段 A — 上线与安全基线

**目标：** 自建部署可放心使用，减少默认密钥与误配置风险。

| 方向 | 建议 | 主要涉及文件 |
|------|------|----------------|
| 密钥与 seed | 生产强制 `JWT_SECRET` / 强 `ADMIN_PASSWORD`；可选启动时拒绝弱配置 | `prisma/seed.ts`，`src/lib/auth-session.ts`，`src/app/api/auth/session/route.ts`，`.env.example` |
| 登录限流 | 当前为进程内内存 Map，多实例部署时效递减；可迁 Redis 或边缘限流 | `src/lib/loginRateLimit.ts`，`src/app/api/auth/login/route.ts` |
| 健康与运维 | 已有 `/api/health`；可加版本号、Git SHA（构建注入） | `src/app/api/health/route.ts`，`next.config.ts` |
| 数据库 | Serverless 不用文件 SQLite；文档化 Postgres 连接串与迁移流程 | `prisma/schema.prisma`，`README.md`，可选 `prisma/migrations/*` |

---

## 阶段 B — 云端同步与数据体验

**目标：** 多人/多设备场景下冲突更清晰，备份路径更明确。

| 方向 | 建议 | 主要涉及文件 |
|------|------|----------------|
| 冲突策略 | 现状接近「最后写入优先」+ 登录后拉取提示；可选合并向导或导出三方比对 | `src/app/(main)/sync/page.tsx`，`src/app/api/plan/route.ts`，`src/lib/planImport.ts` |
| PlanKey 体验 | 默认 key、校验与说明已在同步页；可加「复制分享提示」与安全警告（任意知道 key 且能登录者可覆盖云端） | `src/lib/planKey.ts`，`src/lib/cloudPlanKeyStorage.ts`，`src/app/(main)/sync/page.tsx`，`src/lib/i18n.ts` |
| 本地备份 | Session 级导出提醒已有（`backupRemind`）；可扩展为周期性提示或导出到剪贴板摘要 | `src/lib/backupRemind.ts`，`src/app/(main)/layout.tsx` |
| 审计 / 历史 | 如需「Who/when 改过云端方案」，需 schema 与 API 扩展 | `prisma/schema.prisma`，新路由 `src/app/api/plan/...`，管理 UI（可选） |

---

## 阶段 C — 抽奖联动与上游兼容

**目标：** `LOG1997/log-lottery` 升级时减少断裂；现场操作更稳。

| 方向 | 建议 | 主要涉及文件 |
|------|------|----------------|
| 协议版本 | `postMessage` 类型与字段约定文档化；必要时加版本号协商 | `src/lib/lotteryBridge.ts`，`src/lib/lotteryLiveSync.ts`，`README.md` |
| URL / 路径 | 部署子路径或 CDN 与 `NEXT_PUBLIC_LOTTERY_IMPORT_URL` 一致性自检（开发环境控制台警告） | `src/lib/lotteryBridge.ts`，`.env.example` |
| 失败重试 | iframe 同步失败时的退避与用户提示已部分在 i18n；可统一 toast 策略 | `src/lib/lotteryLiveSync.ts`，`src/app/(main)/guests/page.tsx`，`src/lib/i18n.ts` |
| 子仓库 CI | 确保 `log-lottery` 在 fork 中可重复构建（lockfile、Node 版本对齐） | `log-lottery/package.json`（上游），`.github/workflows/ci.yml` |

---

## 阶段 D — 产品功能与可用性

**目标：** 排座核心流程与国际化持续打磨。

| 方向 | 建议 | 主要涉及文件 |
|------|------|----------------|
| 宾客导入 | 大面积表格导入预览与列识别 | `src/lib/guestImport.ts`，`src/components/GuestImportPreviewModal.tsx`，`src/app/(main)/guests/page.tsx` |
| 桌台 / 筛选 | 列表筛选与布局交互 | `src/lib/tableListFilter.ts`，`src/app/(main)/tables/page.tsx`，`src/app/(main)/layout/page.tsx` |
| 无障碍与移动端 | 拖拽替代操作、触控目标、焦点顺序 | 各 `src/app/(main)/*/page.tsx`，`src/components/Modal.tsx` |
| 文案与 SEO | 域名 canonical 多处（`weddingseats.app` / `wedding-seats.com`）宜统一策略 | `src/app/sitemap.ts`，`src/app/layout.tsx`，`src/app/page.tsx`，各 `blog/**/layout.tsx` |

---

## 阶段 E — 质量与自动化

**目标：** 重构与创新功能时有回归抓手。

| 方向 | 建议 | 主要涉及文件 |
|------|------|----------------|
| 单元测试 | `normalizeSeatingPlan`、导入解析、planKey 校验 | `src/lib/planImport.ts`，`src/lib/planKey.ts`，新 `*.test.ts` |
| E2E | 核心路径：建宾客 → 拖桌 → 导出 | 新 Playwright 配置与 `e2e/*` |
| Lint/类型 | 保持 `verify` 与 CI 绿色；大文件（如 `i18n`）可按语言拆模块降低冲突 | `eslint.config.mjs`，可选拆分 `src/lib/i18n/` |

---

## 使用说明

- **不必按阶段顺序严格执行**：例如「只为婚礼上一版静态站」可只做 A 中与部署相关的条目；深度用云端同步则优先 B。
- **改文件时**：同步更新 `README.md` 里环境变量、部署与 API 表（若行为变化）。
- **与上游同步**：`ajdincatic/wedding-seats`、`LOG1997/log-lottery` 发版后，优先跑 `npm run verify:stack` 再合并大改动。

此表随仓库演进修订；重大范围变更时在本文件更新对应行并注明大致日期即可。

---

## 与 README 的衔接

上线或婚礼前的 **实操自检清单**（导入 → 排座 → JSON 备份 → 抽奖导入彩排）已写在仓库根目录 [**README.md**](README.md) 的「婚礼或正式发布前自检」一节，与本文件中阶段 E（质量与彩排）互为补充。
