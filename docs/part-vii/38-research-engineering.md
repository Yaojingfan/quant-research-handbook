# 38 研究代码的工程化

> 所属模块：Part VII 研究工程化

> **Notebook 是探索的起点，脚本与模块才是可评审、可上线的交付物。**

## 本节导读

实习生提交一份 IC 很高的因子研究 — 但 Notebook 单元格乱序、硬编码路径、无法一键重跑。评审无法通过。本章定义从探索到交付的代码工程化标准。

## 学习目标

1. 区分 Notebook 探索与脚本/模块生产的边界
2. 设计可维护的项目目录与配置管理
3. 建立日志、测试与 CLI 的基本习惯

---

## 38.1 Notebook 与脚本

| 工具 | 适用 |
| --- | --- |
| Jupyter Notebook | 探索、可视化、单次实验 |
| `.py` 脚本 | 可重复流水线、定时任务 |
| Python 包 | 因子库、回测库、团队共享 |

**迁移信号**：当同一段代码复制到第三份 Notebook 时，应抽取为模块。

---

## 38.2 项目目录结构

```text
quant-research/
├── configs/           # YAML 实验配置
│   └── exp_roe_v1.yaml
├── data/              # 本地缓存（gitignore）
├── src/
│   ├── data/          # 数据加载
│   ├── factors/       # 因子定义
│   ├── backtest/      # 回测引擎
│   └── utils/
├── tests/
├── notebooks/         # 仅探索，非生产依赖
├── scripts/
│   └── run_factor_test.py
├── logs/
└── pyproject.toml
```

**原则**：`src/` 可被 import；`notebooks/` 只调用 `src`，不被反向依赖。

---

## 38.3 配置管理

```yaml
# configs/exp_roe_v1.yaml
universe: csi500
start_date: "2015-01-01"
end_date: "2024-12-31"
factor:
  name: roe_ttm
  winsorize: [0.01, 0.99]
  neutralize: [industry, log_mcap]
```

```python
import yaml
cfg = yaml.safe_load(open("configs/exp_roe_v1.yaml"))
```

**禁止**：在代码里写 `start_date = "2015-01-01"` 且无注释说明。

---

## 38.4 日志

```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("logs/run.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("factor.roe")
log.info("coverage=%d", len(df))
```

生产任务必须落盘日志，便于盘后排查。

---

## 38.5 单元测试

```python
# tests/test_winsorize.py
def test_winsorize_bounds():
    s = pd.Series([1, 2, 3, 100])
    out = winsorize(s, 0.25, 0.75)
    assert out.max() < 100
```

**优先测**：数据对齐、复权、中性化、权重和为 1 等**不变量**。

---

## 38.6 异常处理

```python
def load_bar(date: str) -> pd.DataFrame:
    path = f"data/bar/{date}.parquet"
    if not os.path.exists(path):
        raise FileNotFoundError(f"missing bar for {date}")
    df = pd.read_parquet(path)
    if df.empty:
        raise ValueError(f"empty bar for {date}")
    return df
```

**区分**：可重试（网络）vs 不可重试（逻辑错误）vs 需告警（数据缺失）。

---

## 38.7 命令行接口

```python
# scripts/run_factor_test.py
import argparse
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--config", required=True)
    p.add_argument("--output", default="output/")
    args = p.parse_args()
    ...

if __name__ == "__main__":
    main()
```

```bash
python scripts/run_factor_test.py --config configs/exp_roe_v1.yaml
```

---

## 常见错误

- Notebook 直接连生产数据库写操作
- 配置散落在 Notebook 各单元格
- 无测试，改一行全线崩溃
- `sys.path.append` 硬凑 import 路径
- 日志只有 print，无法追溯历史任务

## 要点回顾

- 工程化不是重器，是让结论**可复现、可评审**
- 下一章 [39 可复现研究](39-reproducible-research.md)聚焦 Git、环境与实验归档
