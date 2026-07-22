# GitHub Pages 部署（暂缓）

首次推送不含 `.github/workflows/`，以免 PAT 缺少 `workflow` scope 导致失败。

## 日后启用

1. 将本机的 `.github/workflows/deploy-pages.yml`（若仍在工作区）加入版本库并推送；或自行恢复同等 workflow。
2. PAT / 凭据需具备 `workflow` scope（或改用 SSH / `gh auth`）。
3. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
4. 确认 `mkdocs.yml` 中 `site_url` / `repo_url` 正确后，推送 `main` 触发部署。

本地预览与构建见 README。
