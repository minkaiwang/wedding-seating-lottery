# 首次推送到 GitHub 指南

面向 **公开开源** 本整合仓库。推送前请先跑：

```bash
npm run check:publish
npm run verify:stack
```

完整隐私清单：[PRIVACY-CHECKLIST.md](PRIVACY-CHECKLIST.md)

---

## 1. 重要：不要推到上游仓库

当前若 `git remote -v` 仍显示 `ajdincatic/wedding-seats`，那是 **排座原作者** 的仓库，**请勿直接 push**。

```bash
# 保留只读上游（可选）
git remote rename origin upstream

# 在 GitHub 网页新建空仓库，例如：your-user/wedding-seating-lottery
git remote add origin https://github.com/YOUR_USER/wedding-seating-lottery.git
```

创建仓库后，更新 `package.json` 里 `repository.url` 为你的地址。

---

## 2. 处理 `log-lottery/` 嵌套 Git

若存在 `log-lottery/.git`，Git 会把抽奖目录当成 **子模块**，首次 push **不会带上抽奖源码**。

**推荐（单体 monorepo，含我们的对接补丁）：**

```powershell
# PowerShell — 删除嵌套 .git，保留文件
Remove-Item -Recurse -Force log-lottery\.git

git add log-lottery
```

说明见 [log-lottery/README.md](../log-lottery/README.md)。

---

## 3. 确认不会提交的内容

| 路径 | 原因 |
|------|------|
| `.env` | 密钥 |
| `prisma/dev.db` | 可能含云端方案 |
| `.next/`、`log-lottery/dist/` | 构建缓存 |
| `node_modules/` | 依赖 |
| `*.xlsx` / `*.csv` / 导出 JSON | 宾客名单 |
| `log-lottery/videos/`、`images/` 私人媒体 | 隐私 |

```bash
git status
git check-ignore -v prisma/dev.db .env
```

---

## 4. 首次提交与推送

```bash
git add .
git status   # 再次目视：无 .env、无 db、无表格导出

git commit -m "Open-source wedding seating + log-lottery integration"

git push -u origin main
```

若本地分支不叫 `main`：

```bash
git branch -M main
git push -u origin main
```

---

## 5. GitHub 仓库设置（网页端）

- **Description**：Wedding seating planner + log-lottery integration (MIT)
- **Website**：留空或你的 Demo（勿链含真实宾客数据的 Vercel）
- **Topics**：`wedding` `seating-chart` `lottery` `nextjs` `vue`
- 勾选 **Public**
- 阅读 [SECURITY.md](../SECURITY.md)，可选启用 **Security advisories**
- **Actions**：首次 push 后查看 CI 是否绿色（`.github/workflows/ci.yml`）

---

## 6. 本地浏览器数据（与 Git 无关）

开源前在本机：

- 排座站点：DevTools → Application → 删除 `wedding-seating-plan`（localStorage）
- 抽奖站点：删除 `globalConfig` 及 IndexedDB `person`（若含真实名单）

---

## 7. 若 Git 历史里曾误提交隐私

仅删除文件不够，需清理历史后再公开：

```bash
# 示例：使用 git-filter-repo（需单独安装）
git filter-repo --path prisma/dev.db --invert-paths
```

误推密钥到 GitHub 后：**立即轮换 JWT / 数据库密码**，并在 GitHub Settings → Security 处理。

---

## 8. 推送后

- 在 README 顶部可加 **Live Demo**（使用虚构宾客数据的实例）
- 给上游 Star / 致谢链接：[ACKNOWLEDGMENTS.md](../ACKNOWLEDGMENTS.md)
- Issue 分流见 [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## English (short)

1. Do **not** push to `ajdincatic/wedding-seats`; add your own `origin`.
2. Remove `log-lottery/.git` before `git add log-lottery`.
3. Run `npm run check:publish` and `npm run verify:stack`.
4. Never commit `.env`, `prisma/dev.db`, or guest export files.
