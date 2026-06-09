# 排座 ↔ 抽奖 集成协议

本仓库在 **排座站点（Next.js）** 与 **log-lottery（Vue）** 之间约定 `postMessage` 类型与 Excel 列格式。上游 log-lottery 原生支持 Excel 导入；下列为 **wedding-seating-plan 扩展**。

用户向流程见 [USAGE.md](USAGE.md)；部署配对见下文 §8。

---

## 1. 人员名单行格式

由 `src/lib/storage-core.ts` → `buildLotteryPersonRows()` 生成：

| 字段 | 类型 | 说明 |
|------|------|------|
| `uid` | number | 导出序号（从 1 起，仅展示用） |
| `plannerGuestId` | string | 排座宾客 `Guest.id`（UUID），**稳定匹配**与同步排除 |
| `name` | string | 宾客姓名（空白则跳过） |
| `department` | string | 通常为题/table 名（桌号） |
| `identity` | string | 标签，逗号连接 |
| `avatar` | string | 可选，一般为空 |

log-lottery 侧 `addOtherInfo()` 会补充 `id`（uuid）、`isWin`、`prizeId` 等内部字段。

**Excel 建议：** 婚礼导出含 `plannerGuestId` 列；仅 `uid,name,department,identity` 的旧模板仍可导入，但跨「Excel → 实时同步」时可能产生重复行，直到全量 bridge 导入。

---

## 2. 允许的来源 Origin

抽奖端通过 `allowedWeddingSeatingOrigins()` 校验 `postMessage` 的 `e.origin`（`log-lottery/src/utils/weddingSeatingOrigins.ts`）。

- **默认** 含 `http://localhost:3000`（及 3001、3002）、`127.0.0.1` 同源、上游 pearl Vercel 演示域。
- **`VITE_WEDDING_SEATING_ORIGINS`**（逗号分隔）**追加**到默认列表，不会替换默认值。
- 生产环境 **必须** 配置你的排座站点 HTTPS origin（可保留 localhost 便于本地联调）。

---

## 3. 一键导入（弹窗 Bridge）

### 时序

```text
排座预览页 window.open(人员名单?bridge=1&from=排座origin)
  → 抽奖 Vue 挂载，setupWeddingSeatingImportBridge
  → 抽奖 postMessage { type: LOG_LOTTERY_IMPORT_BRIDGE_READY }
  → 排座 postMessage { type: WEDDING_SEATING_IMPORT, persons: Row[] }  // READY 时重新 build 名单
  → 抽奖全量 replace + clearSyncExclusions()
  → 抽奖 postMessage { type: WEDDING_SEATING_IMPORT_DONE, ok: boolean }
```

| 消息 | 方向 | 载荷 |
|------|------|------|
| `LOG_LOTTERY_IMPORT_BRIDGE_READY` | 抽奖 → 排座 | 无 |
| `WEDDING_SEATING_IMPORT` | 排座 → 抽奖 | `{ persons: Row[] }` |
| `WEDDING_SEATING_IMPORT_DONE` | 抽奖 → 排座 | `{ ok: boolean }` |

实现：`src/lib/lotteryBridge.ts`、`log-lottery/src/utils/weddingSeatingBridge.ts`

行为：

- **全量替换** 抽奖人员名单；**清空** `logLottery:seatingSyncExcludedKeys`。
- 排座侧默认 **25 s** 超时；弹窗被拦截、用户关窗、或 `ok: false`（如零个有效姓名）分别回调。
- **勿** 对弹窗使用 `noopener`（子页需 `window.opener`）。

预览页带 **`?lottery=1`** 会在进入时 **自动** 触发 bridge（见 `src/app/(main)/preview/page.tsx`）。

---

## 4. 实时同步（隐藏 iframe）

### 时序

```text
宾客页勾选「实时同步」→ 隐藏 iframe 加载 人员名单?liveSync=1&from=…&embed=1
  → 抽奖 setupWeddingSeatingLiveSync + postMessage { type: WEDDING_SEATING_SYNC_READY }
  → 排座收到 READY 或 iframe onLoad 后 postMessage { type: WEDDING_SEATING_SYNC, persons, seq, … }
  → 抽奖 mergeFromSeatingPlanner（保留中奖、尊重排除列表）
```

| 字段 | 说明 |
|------|------|
| `type` | `WEDDING_SEATING_SYNC` |
| `persons` | `Row[]` |
| `seq` | 单调递增序号，抽奖端忽略旧 seq |
| `guestCount` | 有效 `persons.length` |
| `plannerGuestTotal` | 排座宾客总数（含被过滤的空姓名） |
| `tableCount` | 餐桌数量 |
| `sentAt` | `Date.now()`，调试用延迟 |

| 消息 | 方向 | 说明 |
|------|------|------|
| `WEDDING_SEATING_SYNC_READY` | 抽奖 → 排座 | listener 已挂载，可安全推送首包 |
| `WEDDING_SEATING_SYNC` | 排座 → 抽奖 | 合并同步载荷 |

实现：`src/lib/lotteryLiveSync.ts`、`log-lottery/src/utils/weddingSeatingLiveSync.ts`

行为：

- **合并同步** — 更新姓名/桌位/新增宾客；保留 `isWin` / 奖项字段。
- **不恢复** 在抽奖端删除且已记入 `logLottery:seatingSyncExcludedKeys` 的人员。
- 按 **`plannerGuestId`** 优先匹配；若旧名单来自 Excel（无 `plannerGuestId`），合并时会尝试 **legacy 姓名+桌+标签** 升级同一人，避免重复。
- 若排座仍有宾客但 payload 归一化后为 **空**（异常/ transient），**跳过** 清空，避免误删中奖记录。
- 仅当排座 **确实零宾客** 时才清空抽奖名单。
- 排座侧 debounce：**0.8 s** 空闲 + 最长 **2.8 s** 必发；首包带 **0 / 600 / 1800 ms** 重试。

开关持久化：`localStorage` 键 `weddingSeats:lotteryLiveSync`（`1` / `0`）。

---

## 5. 排除列表（抽奖端删人）

| 键 | 说明 |
|----|------|
| `logLottery:seatingSyncExcludedKeys` | JSON 字符串数组，元素为 `gid:…` / `uid:…` / `legacy:…` |

- `deletePerson()` 在抽奖端删人时写入。
- **Bridge 全量导入** 与 **Excel 全量导入** 会 `clearSyncExclusions()`。
- 实时同步 merge 时跳过 excluded keys。

---

## 6. 环境变量

| 变量 | 所在 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_LOTTERY_IMPORT_URL` | 排座 `.env` | 抽奖「人员名单」页完整 URL（**build 时** 嵌入） |
| `VITE_WEDDING_SEATING_ORIGINS` | log-lottery `.env` | 额外允许的排座 origin（**合并**默认值） |
| `VITE_WEDDING_SEATING_URL` | log-lottery | Hub 链回排座 |
| `VITE_WEDDING_LOTTERY_HOME_URL` | log-lottery | Hub 链回抽奖主页 |

本地 `dev:stack` 可不设任何变量（缺省 3000 + 6719）。

---

## 7. 调试

抽奖端控制台：

```js
localStorage.setItem('logLottery:liveSyncDebug', '1')
location.reload()
```

会输出 `[wedding-seating-live-sync]` 合并/sync 日志（含 stale skip、空 payload 跳过）。完成后 `removeItem`。

Bridge 失败时检查：

- 弹窗是否被拦截
- `NEXT_PUBLIC_LOTTERY_IMPORT_URL` 的 **origin** 是否与打开的抽奖页一致
- 抽奖端 `?from=` 是否与排座 `window.location.origin` 一致

---

## 8. 生产部署配对清单

| 步骤 | 排座 | 抽奖 |
|------|------|------|
| 1 | 设置 `NEXT_PUBLIC_LOTTERY_IMPORT_URL` 为线上人员名单 URL | 设置 `VITE_WEDDING_SEATING_ORIGINS` 含线上排座 HTTPS origin |
| 2 | `npm run build && npm start`（或平台 build） | `npm run build --prefix log-lottery`，静态托管于 `/log-lottery/` |
| 3 | 两边均 **HTTPS** | 同域或跨域均可，origin 必须精确匹配 |
| 4 | 彩排：bridge + live sync + Excel 各走一遍 | 确认 IndexedDB 有名单、试抽一轮 |

---

## 9. 版本与兼容

- 排座：Next.js 15；`/log-lottery/` 路径 **不** 由排座托管（除非自行反向代理）。
- 抽奖：Vite `base: '/log-lottery/'`，dev **port 6719**（`strictPort: true`）。
- 升级上游 log-lottery 后请运行 `npm run verify:stack` 并回归：Excel 导入、bridge、live sync、抽奖端删人后再同步、重复抽奖多轮。

更完整的用户向说明见 [USAGE.md](USAGE.md)。
