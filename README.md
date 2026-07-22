# Quant Research Handbook
# 量化策略研究新人手册

基于 **MkDocs Material** 的量化策略团队内部研究手册 / Wiki。面向股票量化策略实习生，系统覆盖从数据、因子、组合、回测到生产部署的研究流程。

## 本地预览

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
mkdocs serve
```

浏览器打开：<http://127.0.0.1:8000>

## 构建静态站点

```bash
mkdocs build --strict
```

产物输出到 `site/`。

## 目录结构

```text
quant-research-handbook/
├── docs/                      # Markdown 内容
│   ├── index.md
│   ├── part-i/ … part-ix/     # 九个主题模块
│   ├── appendix/                # 术语表 / FAQ 等
│   ├── stylesheets/
│   └── javascripts/
├── overrides/                 # Material 主题覆盖
├── scripts/generate_site.py   # 从大纲生成章节骨架（可复用）
├── mkdocs.yml
├── requirements.txt
└── DEPLOY.md                 # GitHub Pages 启用说明（workflow 暂缓）
```

## 信息架构

采用三级结构：

```text
Part → Chapter → Section（页内 TOC）
```

- Part：左侧一级导航
- Chapter：二级页面
- Section：页面内右侧目录；仅长章节再拆页

## 已启用能力

| 能力 | 实现 |
| --- | --- |
| Markdown 内容管理 | `docs/**/*.md` |
| 多级目录 | `mkdocs.yml` nav |
| 全文搜索 | Material Search |
| Mermaid 流程图 | `pymdownx.superfences` |
| 数学公式 | KaTeX + `pymdownx.arithmatex` |
| Python / SQL 高亮 | Pygments |
| GitHub Pages | 暂缓，见 [DEPLOY.md](DEPLOY.md) |

## 扩展内容

1. 在对应 `docs/part-*/` 编辑或新增 Markdown
2. 如新增页面，在 `mkdocs.yml` 的 `nav` 登记
3. `mkdocs serve` 本地确认
4. 启用 Pages workflow 后，合并到 `main` 可自动发布（见 DEPLOY.md）

如需从大纲重新生成骨架（会覆盖现有 docs）：

```bash
python scripts/generate_site.py
```

## GitHub Pages 部署

当前首次推送**不含** Actions workflow（避免 PAT 无 `workflow` 权限）。启用步骤见 [DEPLOY.md](DEPLOY.md)。

## 设计原则

Minimal · Professional · Academic · Technical · Modern

参考 Python / Kubernetes 文档风格：优先信息架构与阅读体验，避免花哨营销视觉。
