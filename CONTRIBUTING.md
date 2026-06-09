# Contributing

感谢考虑为本 **整合仓库** 贡献代码。请先阅读 [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) 了解上游边界。

## 适合在本仓库提 Issue / PR 的内容

- 排座与 log-lottery 之间的导入、同步、列格式
- 云端 `/sync`、备份、部署文档
- 国际化、宾客导入、现场流程 UX
- 本仓库 CI（`.github/workflows/ci.yml`）

## 应向上游提交的内容

- 排座核心拖拽、桌型、PDF 版式 → [ajdincatic/wedding-seats](https://github.com/ajdincatic/wedding-seats)
- 3D 抽奖、奖项 UI、音效 → [LOG1997/log-lottery](https://github.com/LOG1997/log-lottery)

## 开发

```bash
npm install
cp .env.example .env
# 可选：克隆 log-lottery 到 ./log-lottery
npm run dev:stack
npm run verify:stack
```

## PR 要求

- 勿提交 `.env`、数据库文件、真实宾客导出
- 修改联动协议时同步更新 `docs/INTEGRATION.md`
- 通过 `npm run verify`（及 `verify:stack` 若触及 lottery）

## 隐私

贡献前阅读 [docs/PRIVACY-CHECKLIST.md](docs/PRIVACY-CHECKLIST.md)。
