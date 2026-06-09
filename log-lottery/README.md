# log-lottery（婚礼整合版）

本目录基于开源项目 **[LOG1997/log-lottery](https://github.com/LOG1997/log-lottery)**（MIT），并包含与 **wedding-seating-plan** 排座站点对接的补丁。

## 上游

| 项目 | 链接 |
|------|------|
| 仓库 | https://github.com/LOG1997/log-lottery |
| 默认 dev | `http://localhost:6719`，base `/log-lottery/` |

## 本仓库额外改动（相对上游）

- `src/utils/weddingSeatingBridge.ts` — 预览页一键导入
- `src/utils/weddingSeatingLiveSync.ts` — 隐藏 iframe 实时同步
- `src/utils/seatingSyncExclusions.ts` — 抽奖端删人后不恢复
- `src/constant/brand.ts` — 与排座站统一品牌占位
- `src/store/globalConfig.ts` — 标题迁移、语言默认值等
- 奖项「可重复抽取」、同奖去重等现场修复

协议说明见上级目录 [docs/INTEGRATION.md](../docs/INTEGRATION.md)。

## 开发

```bash
npm install
npm run dev
# 或在上级目录：npm run dev:stack
```

## 发布到 GitHub 时

若存在 **`log-lottery/.git`**，请先删除该目录再 `git add`，否则父仓库无法包含这些文件。见 [docs/GITHUB-PUBLISH.md](../docs/GITHUB-PUBLISH.md)。

## License

遵循上游 MIT；再分发时请保留 [ACKNOWLEDGMENTS.md](../ACKNOWLEDGMENTS.md) 中的署名。
