# 使用指南

面向婚礼筹备人与现场执行人员的 **排座 + 抽奖** 操作说明。技术协议见 [INTEGRATION.md](INTEGRATION.md)；部署见根目录 [README.md](../README.md)。

---

## 一、你会用到什么

| 模块 | 作用 | 数据存在哪 |
|------|------|------------|
| **排座站点**（本仓库 Next.js） | 录入宾客、分桌、场地布局、导出 | 默认浏览器 **localStorage**（键 `wedding-seating-plan`）；可选 **云端**（需自建数据库） |
| **抽奖站点**（log-lottery） | 3D 抽奖、奖项配置、中奖记录 | 浏览器 **IndexedDB** + **localStorage**（`globalConfig` 等）；按域名/浏览器隔离 |

两者 **默认不共享数据库**；通过 **Excel**、**一键导入 Bridge** 或 **实时同步 iframe** 传递名单。

---

## 二、本地首次启动（排座 + 抽奖）

```bash
git clone https://github.com/minkaiwang/wedding-seating-lottery.git
cd wedding-seating-lottery
npm install

# 若仓库已含 log-lottery/ 子目录（本 fork 已内置）：
npm install --prefix log-lottery

cp .env.example .env          # Windows: Copy-Item .env.example .env
# 可选: cp log-lottery/.env.example log-lottery/.env

npm run dev:stack
```

成功标志：

- 排座：[http://localhost:3000](http://localhost:3000)
- 抽奖：[http://localhost:6719/log-lottery/home](http://localhost:6719/log-lottery/home)

若 6719 被占用，需改 `log-lottery/vite.config.ts` 并同步 `NEXT_PUBLIC_LOTTERY_IMPORT_URL`。

---

## 三、推荐现场流程（婚礼当天）

```text
1. 排座：导入/核对宾客 → 排桌 → 预览页检查
2. 备份：预览页「导出 JSON」存到 U 盘 / 网盘
3. 抽奖名单（三选一）：
   A. 预览页导出「抽奖用 Excel」→ 在抽奖系统手动导入
   B. 预览页「一键导入婚礼抽奖」（弹窗 bridge，全量替换）
   C. 宾客页开启「实时同步到抽奖」（合并同步，适合彩排后仍改名单）
4. 抽奖端：删掉未到场的人（实时同步下不会自动恢复，见 §4.3）
5. 抽奖页面试抽一轮 → 正式活动
```

**同一台电脑、同一个浏览器** 操作最省心；换浏览器 = 数据不自动跟过去，需重新导入或登录云端同步。

---

## 四、排座：逐步操作

### 4.1 品牌化

修改 **`src/lib/brand.ts`** 与 **`log-lottery/src/constant/brand.ts`** 中的新人姓名（开源版默认为「示例新人」）。改完后若顶栏仍显示旧名：`npm run clean:next` 并重启 dev。

### 4.2 宾客

- **单个添加**：宾客页填写姓名、标签（亲友 / 同事 / 素食等）。
- **批量**：文本框「姓名, 标签1, 标签2」或 **Excel / CSV 导入**（第一行须有「姓名」或 `name` 列）。
- **实时同步开关**：宾客页粉色提示框内勾选；状态保存在 `weddingSeats:lotteryLiveSync`。

### 4.3 餐桌与排座

- **餐桌页**：新增圆桌 / 长桌、容量、桌名（导出到抽奖时作为 `department` 列）。
- **排座页**：拖拽宾客到桌；可用「一键排座」按标签自动分桌。
- **布局页**：调整桌位在平面图上的位置。

### 4.4 预览与导出

| 导出类型 | 用途 |
|----------|------|
| **JSON** | 整份方案备份 / 换电脑恢复 |
| **PDF / CSV** | 给婚庆、酒店或签到台 |
| **抽奖 Excel** | 列含 `uid`, `plannerGuestId`, `name`, `department`, `identity` |
| **一键导入** | 打开抽奖弹窗，全量替换名单（约 25 s 内完成握手） |

访问 **`/preview?lottery=1`** 会在页面加载后 **自动** 发起一键导入（适合顶栏「预览 → 抽奖」链接）。

---

## 五、抽奖：三种联动方式对比

| 方式 | 排座侧 | 抽奖侧效果 | 删未到场 | 改排座后 |
|------|--------|------------|----------|----------|
| Excel | 导出文件 | 手动导入 | 在抽奖端删 | 需重新导入 Excel |
| 一键 Bridge | 预览页按钮 / `?lottery=1` | **全量替换** | 在抽奖端删 | 需再次一键导入 |
| 实时同步 | 宾客页勾选 | **合并** | 抽奖端删 **不会恢复** | 约 0.8～2.8 s 自动更新 |

### 5.1 Excel 手动导入

1. 排座预览页下载抽奖 Excel。
2. 抽奖 → **人员配置 / 人员名单** → 文件导入。
3. 会 **清空** 旧名单与同步排除列表（与 bridge 一致）。

### 5.2 一键导入（Bridge）

1. 确保 `NEXT_PUBLIC_LOTTERY_IMPORT_URL` 指向「人员名单」页（本地默认 `http://localhost:6719/log-lottery/config/person/all`）。
2. 预览页点击「一键导入婚礼抽奖」；**允许弹窗**。
3. 零个有效姓名时会收到错误提示（空白名宾客会被过滤）。

### 5.3 实时同步

1. 宾客页勾选 **实时同步到 … 抽奖**。
2. 后台隐藏 iframe 加载抽奖页；首次同步在抽奖 listener READY 后推送（含短延迟重试）。
3. **抽奖端单独删除** 的未到场宾客 **不会恢复**（`logLottery:seatingSyncExcludedKeys`）。
4. 若希望名单与排座 **完全一致**（不要在抽奖端留删人记录）：关闭实时同步，改用 **一键导入** 或 Excel。
5. 大屏主标题在抽奖 `localStorage` 键 **`globalConfig`**；改 `brand.ts` 后刷新抽奖页（会自动迁移旧自动标题）。

调试：见 [INTEGRATION.md §7](INTEGRATION.md#7-调试)。

---

## 六、可选：云端同步（`/sync`）

适合 **自己部署**、有多人或多设备编辑同一方案的场景。

1. `.env` 配置 `DATABASE_URL`、`JWT_SECRET`（生产 ≥32 字符随机串）。
2. `npm run db:init` → 创建 SQLite + seed 管理员。
3. 默认登录：**用户名 `admin`**，密码 **`88888888`**（若未设置 `ADMIN_PASSWORD`）— **生产务必修改**。
4. 浏览器打开 `/sync` 登录；按提示拉取 / 推送。云端较新时会提示先拉取。
5. **`planKey`**（默认 `singleton`）区分多份方案；同一 key 的读写需登录。

连续登录失败会触发 **429 限流**（见 [SECURITY.md](../SECURITY.md)）。

**不要** 把含真实宾客的 `prisma/dev.db` 提交到 Git。

---

## 七、常见问题

| 问题 | 处理 |
|------|------|
| 换浏览器后排座空了 | 正常；用 JSON 备份导入 |
| 一键导入超时（25 s） | 抽奖未启动、弹窗被拦、origin 不一致；或改用 Excel |
| 实时同步首包丢失 | 已修复 READY 握手；仍异常时改宾客触发二次同步，或开 `logLottery:liveSyncDebug` |
| 抽奖删的人又回来了 | 是否用了 bridge/Excel 全量覆盖；或旧版未合并同步 |
| 同一人出现两条 | 先 Excel 后实时同步且缺 `plannerGuestId`；改用含该列的导出或 bridge 全量导入 |
| 端口不对 | 抽奖默认 **6719**；排座 **3000**（3001/3002 已在抽奖 origin 白名单） |
| 改 env 不生效 | `NEXT_PUBLIC_*` / `VITE_*` 需 **重新 build** |
| 登录 429 | 等待 `Retry-After` 秒数后再试 |

---

## 八、开源 Fork 后必做

1. 修改 `src/lib/brand.ts` 与 `log-lottery/src/constant/brand.ts`。
2. 阅读 [PRIVACY-CHECKLIST.md](PRIVACY-CHECKLIST.md) 再 `git push`。
3. 阅读 [ACKNOWLEDGMENTS.md](../ACKNOWLEDGMENTS.md) 保留上游署名。

---

## English summary

- **Seating** runs in the browser (`localStorage`); export JSON for backup.
- **Lottery** is separate (`log-lottery`); import via Excel, popup bridge, or live sync iframe.
- Live sync **merges** lists and **remembers** people removed only in the lottery.
- Bridge **replaces** the full list and clears exclusion keys.
- Configure couple names in both `brand.ts` files before publishing your fork.
