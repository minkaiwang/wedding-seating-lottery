# 致谢 / Acknowledgments

本仓库 **不是从零写起的独立产品**，而是在两位（组）优秀开源作者的作品之上，做婚礼现场流程整合与定制。**我们主要是「缝合工」**：排座、抽奖的核心能力与 UI 来自上游；本仓库的贡献集中在两者之间的数据格式、导入桥接、实时同步、可选云端备份与现场使用文档等。

若你使用了本仓库，请同时了解并尊重下列上游项目与作者。

---

## 1. 婚礼排座（Wedding Seats）

| 项目 | 说明 |
|------|------|
| **作者** | [Ajdin Catic](https://github.com/ajdincatic)（GitHub: `ajdincatic`） |
| **仓库** | [github.com/ajdincatic/wedding-seats](https://github.com/ajdincatic/wedding-seats) |
| **官网 / 品牌** | [weddingseats.app](https://weddingseats.app) |
| **在线演示** | [wedding-seating-plan-pearl.vercel.app](https://wedding-seating-plan-pearl.vercel.app/)（上游仓库 homepage） |
| **技术栈** | Next.js、TypeScript、Tailwind CSS、拖拽排桌等 |
| **许可** | 上游 README 标示为 MIT；仓库当前未见独立 LICENSE 文件，授权边界请以原作者后续声明为准 |

**我们做了什么（相对上游）：**

- 可选 **Prisma + JWT** 云端方案同步（`/sync`、`/api/plan`）
- 与 **log-lottery** 的 Excel 导出列、一键 `postMessage` 导入、隐藏 iframe **实时同步**
- 多语言文案、宾客 Excel/CSV 导入预览、桌台筛选与现场流程优化
- 本仓库 **不包含** 上游未授权的个人数据；品牌化文案请自行修改 `src/lib/brand.ts`

**支持原作者：**

- [Buy Me a Coffee — ajdin70230](https://buymeacoffee.com/ajdin70230)

排座相关 Issue / 功能请求，若属于上游核心排桌体验，请优先向 **[ajdincatic/wedding-seats](https://github.com/ajdincatic/wedding-seats)** 反馈；属于「与抽奖联动 / 云端同步」的部分可在本仓库讨论。

---

## 2. 婚礼 / 年会抽奖（log-lottery）

| 项目 | 说明 |
|------|------|
| **作者 / 维护** | [LOG1997](https://github.com/LOG1997)（GitHub 用户 / 组织） |
| **仓库** | [github.com/LOG1997/log-lottery](https://github.com/LOG1997/log-lottery) |
| **许可** | MIT |
| **技术栈** | Vue 3、Vite、Pinia、Three.js、Dexie（IndexedDB）等 |
| **默认开发地址** | `http://localhost:6719`，部署 `base`: `/log-lottery/` |

**我们做了什么（相对上游）：**

- 在 `log-lottery/` 目录内维护与排座站点对接的补丁，例如：
  - `weddingSeatingBridge.ts` — 预览页弹窗一键导入
  - `weddingSeatingLiveSync.ts` — 隐藏 iframe 实时合并同步
  - `seatingSyncExclusions.ts` — 抽奖端删除未到场宾客后不被同步覆盖
  - 奖项「可重复抽取」、同奖去重等现场向修复
- 根目录 `npm run dev:stack` 并行启动排座 + 抽奖，便于本地联调
- 使用可复现的纯合成生成器替换上游快照中的内置音频素材；生成器不读取录音、音乐采样或其它第三方媒体

**本仓库的 vendored 基线：** `log-lottery/` 已作为普通源码目录纳入本仓库（不是 submodule），基于上游 [v0.6.0-5](https://github.com/LOG1997/log-lottery/tree/v0.6.0-5)（该 tag 指向 commit `07d0948ea7741bd890bd097dee0f2fc2b995a316`），并包含本仓库为排座联动维护的本地补丁。保留该目录中的上游 LICENSE；补丁范围以本仓库提交记录和本文件所列桥接文件为准。

抽奖核心功能（3D 球体、奖项配置、音乐管理功能等）的 Issue 与 PR，请优先向 **[LOG1997/log-lottery](https://github.com/LOG1997/log-lottery)** 提交；本仓库生成的内置提示音，以及仅与 wedding-seating-plan 桥接协议相关的问题，可在本仓库讨论。

---

## 3. 本仓库（整合层）

| 项目 | 说明 |
|------|------|
| **定位** | 婚礼 **排座 + 抽奖** 工具链整合与部署示例 |
| **整合代码示例** | `src/lib/lotteryBridge.ts`、`src/lib/lotteryLiveSync.ts`、`src/lib/storage-core.ts`（`buildLotteryPersonRows`） |
| **协议说明** | [docs/INTEGRATION.md](docs/INTEGRATION.md) |

感谢在实际婚礼中梳理名单字段、Excel 模板与现场流程的同事与朋友——这些经验落在导出列规范、同步策略与文档里，而非任何宾客的真实姓名（请勿将私人名单提交到公开 Git）。

---

## 4. 其它依赖

运行时主要 npm 依赖（Next.js、React、Prisma、Vue、Vite、xlsx 等）各自遵循其开源许可证。汇总见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

---

## 5. 如何正确引用

若在博客、README 或婚礼现场屏幕中致谢，可参考：

> 排座基于 [Ajdin Catic 的 Wedding Seats](https://github.com/ajdincatic/wedding-seats)；抽奖基于 [LOG1997/log-lottery](https://github.com/LOG1997/log-lottery)；整合与现场定制见本仓库。

**English (short):**

> Seating planner derived from [ajdincatic/wedding-seats](https://github.com/ajdincatic/wedding-seats); lottery from [LOG1997/log-lottery](https://github.com/LOG1997/log-lottery); integration layer in this repository.

---

## 6. 商标与名称

「Wedding Seats / weddingseats.app」等名称与品牌归原作者所有。本仓库使用上游代码时保留其版权声明；请勿暗示本仓库由上游官方直接运营，除非获得作者明确授权。根目录的 MIT 许可证仅适用于本仓库可由维护者授权的整合层贡献；上游组件的授权与署名以其各自仓库和随附文件为准。
