# 开源前隐私与安全检查清单

上传到 **公开 GitHub** 前，请逐项确认。本清单针对「婚礼宾客姓名、联系方式、部署密钥、个人域名」等常见泄露点。

---

## 1. 绝对不要提交的内容

| 类型 | 典型路径 / 位置 | 处理 |
|------|-------------------|------|
| 环境变量与密钥 | `.env`, `.env.local`, `.env.production` | 已在 `.gitignore`；只提交 `.env.example` |
| 本地数据库 | `prisma/dev.db`, `*.db-journal` | 已忽略；确认 `git status` 无 db 文件 |
| 含真实宾客的 JSON / Excel | 导出的 `*.json`, `*.xlsx`, `*.csv` | 不要放进仓库；用 `.gitignore` 排除 |
| 私人照片 / 视频 | `public/` 下婚礼照、抽奖背景媒体 | 仅保留通用 icon / 占位图 |
| Vercel / 部署令牌 | `.vercel/` | 已忽略 |

执行：

```bash
git status
git log -p --all -S "@"   # 可选：搜索历史 commit 是否含邮箱
```

若历史 commit 里已有隐私数据，需 **`git filter-repo`** 或 BFG 清理历史后再公开（单纯删除文件不够）。

---

## 2. 代码与文案中的个人信息

本仓库开源版已将默认新人姓名改为 **「示例新人」**。发布前请再搜一遍：

```bash
# PowerShell 示例：在仓库根目录搜索常见泄露
git grep -i "你的姓名|朋友|@qq|@163|1[3-9][0-9]{9}" -- . ":!node_modules"
```

| 检查项 | 文件 | 说明 |
|--------|------|------|
| 新人姓名 | `src/lib/brand.ts`, `log-lottery/src/constant/brand.ts` | 改为你愿意公开的名字，或保持「示例新人」 |
| PWA / SEO | `public/manifest.json`, `src/app/layout.tsx` | 随 `brand.ts` 或改为通用标题 |
| 博客作者 | `src/app/(main)/blog/**/layout.tsx` | 勿写真实新人全名 |
| 弹窗窗口名 | `src/lib/lotteryBridge.ts` | 勿用姓名缩写（已改为通用名） |
| 演示 URL | `README.md` | 若 pearl.vercel.app 曾部署 **你的** 真实数据，勿在文档中宣传该实例；可只链上游 [weddingseats.app](https://weddingseats.app) |
| 结构化数据 | `src/app/page.tsx` | 已移除示例 `aggregateRating`；勿添加虚假评分 |

---

## 3. 运行时数据（不在 Git 里，但公开部署时仍危险）

| 场景 | 风险 | 建议 |
|------|------|------|
| 线上 Vercel / 自建站 | 浏览器 localStorage 里可能有真实名单 | 公开 Demo 用 **空方案** 或 **虚构姓名** |
| `/sync` + 数据库 | 云端存真实方案 | Demo 关 sync；生产用强密码、HTTPS、非默认 admin 密码 |
| 抽奖 IndexedDB / localStorage | 含宾客、中奖记录；键 **`globalConfig`** 含大屏主标题 | 演示前在 `localhost:6719` 清除站点数据，或配置页重置标题 |
| Analytics | Vercel Analytics 等 | 确认隐私政策符合当地法规 |

默认 seed 密码 `88888888` **仅适合本机**；`prisma/seed.ts` 会在弱密码时警告。

---

## 4. log-lottery 子目录

| 检查项 | 说明 |
|--------|------|
| 是否包含私人媒体 | `images/`, `videos/` 下婚礼照片、录屏 |
| `.env` / `.env.local` | 勿提交 |
| 上游 LICENSE | 保留 `log-lottery/LICENSE`（若存在） |
| 补丁说明 | 在 README 或 ACKNOWLEDGMENTS 注明基于上游哪一版 |

若 `log-lottery` 体积过大，公开仓库可改为 **submodule** 指向 [LOG1997/log-lottery](https://github.com/LOG1997/log-lottery)，本仓只保留 wedding 对接补丁文件清单。

---

## 5. GitHub 仓库设置（上传后）

- [ ] Repository **Description** 写清「整合排座 + log-lottery」，链到 ACKNOWLEDGMENTS
- [ ] 添加 **LICENSE**（MIT）与 **ACKNOWLEDGMENTS.md**
- [ ] 关闭 **Wiki** 若不需要，避免误贴私人信息
- [ ] **Secrets**：CI 只用 `GITHUB_TOKEN`，勿写 JWT / 数据库 URL
- [ ] 若曾误 push 密钥：立即轮换密钥，并用 GitHub Secret scanning 处理

---

## 6. 快速自检命令

```bash
npm run verify
npm run verify:stack    # 若含 log-lottery

# 确认 ignore 生效
git check-ignore -v prisma/dev.db .env
```

---

## 7. 宾客数据的法律与礼仪提示（非法律意见）

公开仓库、公开 Demo 或截图时：

- 未取得同意的 **宾客姓名、电话、座位、饮食禁忌** 等均不宜公开。
- 婚礼照片中含 **宾客正脸** 时注意肖像权。
- 开源的是 **工具**，不是 **你的婚礼名单**。

---

完成以上检查后，再执行 `git push -u origin main`。若需帮助清理 Git 历史中的误提交，请在 Issue 中说明（勿在 Issue 里粘贴真实名单）。
