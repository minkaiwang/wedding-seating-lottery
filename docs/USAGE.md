# 使用指南

面向婚礼筹备人与现场执行人员的 **排座 + 抽奖** 操作说明。技术部署细节见根目录 [README.md](../README.md)。

---

## 一、你会用到什么

| 模块 | 作用 | 数据存在哪 |
|------|------|------------|
| **排座站点**（本仓库 Next.js） | 录入宾客、分桌、场地布局、导出 | 默认浏览器 **localStorage**；可选 **云端**（需自建数据库） |
| **抽奖站点**（log-lottery） | 3D 抽奖、奖项配置、中奖记录 | 浏览器 **IndexedDB**（按域名/浏览器隔离） |

两者 **默认不共享数据库**；通过 **Excel 导出** 或 **联动导入 / 实时同步** 传递名单。

---

## 二、推荐现场流程（婚礼当天）

```text
1. 排座：导入/核对宾客 → 排桌 → 预览页检查
2. 备份：预览页「导出 JSON」存到 U 盘 / 网盘
3. 抽奖名单（三选一）：
   A. 预览页导出「抽奖用 Excel」→ 在抽奖系统手动导入
   B. 预览页「导入到抽奖」（弹窗握手，适合彩排一次到位）
   C. 宾客页开启「实时同步到抽奖」（适合彩排后仍改名单）
4. 抽奖端：删掉未到场的人（实时同步下不会自动恢复，见下文）
5. 抽奖页面试抽一轮 → 正式活动
```

**同一台电脑、同一个浏览器** 操作最省心；换浏览器 = 数据不自动跟过去，需重新导入或登录云端同步。

---

## 三、排座：逐步操作

### 3.1 首次使用

1. 启动：`npm run dev`（仅排座）或 `npm run dev:stack`（排座 + 抽奖）。
2. 打开 [http://localhost:3000](http://localhost:3000)。
3. 修改 **`src/lib/brand.ts`** 中的新人姓名与站点标题（开源版默认为「示例新人」）。

### 3.2 宾客

- **单个添加**：宾客页填写姓名、标签（亲友 / 同事 / 素食等）。
- **批量**：文本框「姓名, 标签1, 标签2」或 **Excel / CSV 导入**（第一行须有「姓名」或 `name` 列）。
- **搜索 / 编辑 / 删除**：在宾客列表中操作；删除排座宾客会在开启实时同步时同步到抽奖端（从抽奖名单移除）。

### 3.3 餐桌与排座

- **餐桌页**：新增圆桌 / 长桌、容量、桌名（导出到抽奖时作为 `department` 列，通常是桌号或桌名）。
- **排座页**：拖拽宾客到桌；可用标签辅助分组。
- **布局页**：调整桌位在平面图上的位置（便于打印或现场沟通）。

### 3.4 预览与导出

| 导出类型 | 用途 |
|----------|------|
| **JSON** | 整份方案备份 / 换电脑恢复 |
| **PDF / CSV** | 给婚庆、酒店或签到台 |
| **抽奖 Excel** | 列：`uid`, `name`, `department`, `identity` — 与 log-lottery 模板一致 |

---

## 四、抽奖：三种联动方式

### 4.1 Excel 手动导入（最稳、与排座是否在线无关）

1. 排座预览页下载抽奖 Excel。
2. 打开抽奖系统 → **人员配置 / 人员名单** → 文件导入。

### 4.2 预览页一键导入（`?lottery=1` 流程）

1. 配置 `NEXT_PUBLIC_LOTTERY_IMPORT_URL` 指向抽奖「人员名单」页，例如：  
   `http://localhost:6719/log-lottery/config/person/all`
2. 预览页点击导入抽奖；允许弹窗。
3. 抽奖页通过 `postMessage` 接收名单（**全量替换**，会清空抽奖端旧名单）。

协议见 [INTEGRATION.md](INTEGRATION.md)。

### 4.3 宾客页「实时同步到抽奖」

1. 宾客页勾选 **实时同步**；后台隐藏 iframe 加载抽奖页。
2. 宾客 / 餐桌变更后约 **0.8～2.8 秒** 推送更新。
3. **抽奖端单独删除的未到场宾客不会恢复**（排除列表保存在抽奖端 localStorage）。
4. **大屏主标题**保存在抽奖端 `localStorage` 键 `globalConfig`；修改 `log-lottery/src/constant/brand.ts` 后需 **刷新抽奖页**（会自动迁移旧标题）；仍不对可在配置 → 界面设置里改，或清除站点数据。

若希望抽奖名单与排座 **完全一致**（不要抽奖端单独删人）：关闭实时同步，改用 **一键导入** 或 Excel。

---

## 五、可选：云端同步（`/sync`）

适合 **自己部署**、有多人或多设备编辑同一方案的场景。

1. 复制 `.env.example` → `.env`，配置 `DATABASE_URL`、`JWT_SECRET`。
2. `npm run db:init` 初始化数据库与管理员账号。
3. 生产环境务必设置 **强密码**（`ADMIN_PASSWORD`）与 **随机 JWT_SECRET**（≥32 字符）。
4. 浏览器打开 `/sync` 登录，按页面提示拉取 / 推送方案。

**不要** 把含真实宾客的 `prisma/dev.db` 提交到 Git（已在 `.gitignore` 中忽略）。

---

## 六、常见问题

| 问题 | 处理 |
|------|------|
| 换浏览器后排座空了 | 正常；用 JSON 备份导入 |
| 一键导入没反应 | 检查抽奖是否启动、`NEXT_PUBLIC_LOTTERY_IMPORT_URL` 的 **origin** 是否一致 |
| 抽奖删的人又回来了 | 是否开启了实时同步且未更新到合并版本；或用了「一键导入」全量覆盖 |
| 端口不对 | 抽奖默认 **6719**；排座默认 **3000** |
| 弹窗被拦截 | 浏览器允许弹窗，或改用 Excel / 实时同步 |

---

## 七、开源 Fork 后必做

1. 修改 `src/lib/brand.ts` 与 `log-lottery/src/constant/brand.ts` 中的新人姓名。
2. 阅读 [PRIVACY-CHECKLIST.md](PRIVACY-CHECKLIST.md) 再 `git push`。
3. 阅读 [ACKNOWLEDGMENTS.md](../ACKNOWLEDGMENTS.md) 保留上游署名。

---

## English summary

- **Seating** runs in the browser (localStorage by default); export JSON for backup.
- **Lottery** is a separate app (`log-lottery`); import via Excel, popup bridge, or live sync iframe.
- Live sync **merges** lists and **remembers** people removed only in the lottery.
- Configure couple names in `src/lib/brand.ts` before publishing your fork.
