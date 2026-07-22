# 38 可复现研究

> 所属模块：Part VII 研究工程化

> **不能复现的实验，在团队知识库里等于不存在。**

## 本节导读

三个月前某因子报告 ICIR 2.1，今日用"相同逻辑"重跑只得 1.4 — 差异来自数据版本、代码 commit、随机种子还是配置漂移？可复现性是量化团队信任的基石。

## 学习目标

1. 用 Git 管理代码与配置的版本
2. 锁定 Python 环境与随机种子
3. 绑定数据版本、实验配置与结果归档

---

## 38.1 Git
**最低要求**：

```bash
git log --oneline          # 哪个 commit 产出报告
git diff v1.0..HEAD -- src/factors/roe.py
git tag exp-roe-20240315   # 标记重要实验节点
```

| 应纳入 Git | 不应纳入 Git |
| --- | --- |
| 代码、配置、文档 | 原始行情大文件 |
| 小样本测试数据 | 生产 credentials |
| 实验脚本 | 临时 Notebook 输出 |

**分支策略**：`main` 稳定；`research/*` 个人实验；合并需 review。

---

## 38.2 环境管理
```bash
# requirements.txt 或 pyproject.toml 锁定版本
pip freeze > requirements.lock
# 或
conda env export > environment.yml
```

Docker 镜像进一步锁定 OS 层依赖 — 生产与研究容器化推荐。

**记录**：每次实验 README 写明 Python 版本与关键包版本。

---

## 38.3 随机种子
```python
import numpy as np
import random

SEED = 31
random.seed(SEED)
np.random.seed(SEED)
# 若用 ML：torch.manual_seed(SEED) 等
```

Bootstrap、随机抽样、train/test split 必须固定种子并写入配置。

---

## 38.4 数据版本
```yaml
data_version: "bar_v20240301"
factor_store: "fs_v3.2"
index_member: "im_hist_20240228"
```

**原则**：数据修订后**不覆盖**旧快照；策略回测报告 footnote 数据版本号。

---

## 38.5 实验配置
一份实验 = 一个 YAML + 一个 Git commit + 一个数据版本：

```yaml
experiment_id: exp-roe-v1-20240315
git_commit: a1b2c3d
data_version: bar_v20240301
params:
  universe: csi500
  winsorize: [47.01, 0.99]
```

---

## 38.6 结果归档
```text
output/exp-roe-v1-20240315/
├── config.yaml          # 拷贝
├── metrics.json         # IC, ICIR, turnover
├── ic_series.parquet
├── report.pdf
└── README.md            # 结论摘要
```

**metrics.json 示例**：

```json
{
  "mean_ic": 0.045,
  "icir": 1.8,
  "long_short_ann_ret": 0.12,
  "git_commit": "a1b2c3d",
  "data_version": "bar_v20240301"
}
```

---

## 38.7 Research Log
团队 Wiki 或 Markdown 研究日志，每条记录：

| 字段 | 内容 |
| --- | --- |
| 日期 / 作者 | |
| 假设 | 经济逻辑一句话 |
| 实验 ID | 链接 output 目录 |
| 结论 | 支持 / 拒绝 / 待定 |
| 下一步 | |

避免"口头 Alpha" — 无 log 不上组合会议。

---

## 常见错误

- 只 commit 代码，不记录数据版本
- Notebook 输出未清除却当唯一结果
- 多人改同一分支无 review
- 依赖 `latest` 数据路径
- 随机 split 不固定种子，无法对比模型

## 要点回顾

- 可复现 = 代码 + 环境 + 数据 + 配置 + 结果 五元组
- 下一章 [39 研究平台能力分层](39-research-platform.md)连接研究环境与生产边界
