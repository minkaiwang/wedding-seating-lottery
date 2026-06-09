# 排座 ↔ 抽奖 集成协议

本仓库在 **排座站点（Next.js）** 与 **log-lottery（Vue）** 之间约定 `postMessage` 类型与 Excel 列格式。上游 log-lottery 原生支持 Excel 导入；下列为 **wedding-seating-plan 扩展**。

---

## 1. 人员名单行格式

由 `src/lib/storage-core.ts` → `buildLotteryPersonRows()` 生成：

| 字段 | 类型 | 说明 |
|------|------|------|
| `uid` | number | 导出序号（从 1 起，仅展示用） |
| `plannerGuestId` | string | 排座宾客 `Guest.id`，用于稳定匹配与同步排除 |
| `name` | string | 宾客姓名（空白则跳过） |
| `department` | string | 通常为题/table 名（桌号） |
| `identity` | string | 标签，逗号连接 |
| `avatar` | string | 可选，一般为空 |

log-lottery 侧 `addOtherInfo()` 会补充 `id`（uuid）、`isWin`、`prizeId` 等内部字段。

---

## 2. 允许的来源 Origin

抽奖端通过 `allowedWeddingSeatingOrigins()` 校验 `postMessage` 的 `e.origin`（见 `log-lottery` 内 `weddingSeatingOrigins` 与 `VITE_WEDDING_SEATING_ORIGINS`）。

本地默认常见：`http://localhost:3000`（及 3001、3002）。生产环境 **必须** 配置为你的排座站点 HTTPS origin。

---

## 3. 一键导入（弹窗 Bridge）

**排座 → 抽奖**

| 步骤 | 说明 |
|------|------|
| 打开 URL | `{LOTTERY_IMPORT_URL}?bridge=1&from={encodeURIComponent(seatingOrigin)}` |
| 抽奖 → 排座 | `{ type: 'LOG_LOTTERY_IMPORT_BRIDGE_READY' }` |
| 排座 → 抽奖 | `{ type: 'WEDDING_SEATING_IMPORT', persons: Row[] }` |
| 完成 | `{ type: 'WEDDING_SEATING_IMPORT_DONE', ok: boolean }` |

实现：`src/lib/lotteryBridge.ts`、`log-lottery/src/utils/weddingSeatingBridge.ts`

行为：**全量替换** 抽奖人员名单；会 **清空** 抽奖端同步排除列表。

---

## 4. 实时同步（隐藏 iframe）

**排座 → 抽奖（单向）**

| 字段 | 说明 |
|------|------|
| `type` | `WEDDING_SEATING_SYNC` |
| `persons` | `Row[]` |
| `seq` | 单调递增序号，抽奖端忽略旧 seq |
| `guestCount` | 有效 `persons.length` |
| `plannerGuestTotal` | 排座宾客总数（含被过滤的空姓名） |
| `tableCount` | 餐桌数量 |
| `sentAt` | `Date.now()`，调试用延迟 |

实现：`src/lib/lotteryLiveSync.ts`、`log-lottery/src/utils/weddingSeatingLiveSync.ts`

行为：**合并同步** — 更新姓名/桌位/新增宾客；保留中奖状态；**不恢复** 在抽奖端删除且已记入 `logLottery:seatingSyncExcludedKeys` 的人员。

iframe URL：`{LOTTERY_IMPORT_URL}?liveSync=1&from=...&embed=1`

---

## 5. 环境变量

| 变量 | 所在 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_LOTTERY_IMPORT_URL` | 排座 `.env` | 抽奖「人员名单」页完整 URL |
| `VITE_WEDDING_SEATING_ORIGINS` | log-lottery `.env` | 允许的排座 origin 列表 |
| `VITE_WEDDING_SEATING_URL` | log-lottery | Hub 链回排座 |
| `VITE_WEDDING_LOTTERY_HOME_URL` | log-lottery | Hub 链回抽奖主页 |

---

## 6. 调试

抽奖端控制台：

```js
localStorage.setItem('logLottery:liveSyncDebug', '1')
location.reload()
```

会输出 `[wedding-seating-live-sync]` 合并/sync 日志。完成后 `removeItem`。

---

## 7. 版本与兼容

- 排座：Next.js 15，`/log-lottery/` 路径 **不** 由排座托管（除非自行反向代理）。
- 抽奖：Vite `base: '/log-lottery/'`，dev **port 6719**（`strictPort: true`）。
- 升级上游 log-lottery 后请运行 `npm run verify:stack` 并回归：Excel 导入、bridge、live sync、抽奖端删人后再同步。

更完整的用户向说明见 [USAGE.md](USAGE.md)。
