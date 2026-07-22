# 17 因子构造

> 所属模块：Part III 股票多因子研究

**原始指标是矿石，因子是精炼后的合金——跳过精炼步骤，IC 里掺的是噪声与暴露。**

## 本节导读

从 Wind 导出 PE 列不等于有了「价值因子」。构造（Construction）是把 **Indicator** 变成 **Factor** 的标准流水线：定义口径 → 去极值 → 标准化 → 缺失处理 → 中性化 → 滞后对齐。每一步都会改变 IC 与分组收益——**必须文档化、可复现**。

本章聚焦 A 股横截面因子的工程化构造，重点展开 **Winsorize、标准化、中性化** 三类操作及其代价。

## 学习目标

1. 写出完整的 Factor Spec（定义、窗口、生效时间）
2. 掌握横截面 vs 时间序列因子的区别
3. 正确实施去极值、标准化、缺失值与中性化
4. 理解因子方向、滞后与 holding period 的匹配

---

## 17.1 明确因子定义

构造前用 **Factor Spec 模板** 冻结口径，避免研究过程中「边试边改」：

| 字段 | 必填内容 | 示例 |
| --- | --- | --- |
| 数学表达 | 公式 | $BP_{i,t} = \mathrm{BookEquity}_{i,t} / \mathrm{MarketCap}_{i,t}$ |
| 数据字段 | 来源表与字段 | `balance.total_equity`, `market.cap` |
| 计算窗口 | 滚动长度 | 动量：过去 120 交易日 |
| 更新频率 | 日/周/月 | 月频：每月最后一个交易日 |
| 生效时间 | 信号可用时点 | 财报 **公告日** 后第一个调仓日 |
| 股票池 |  universe | 中证 800 历史成分，剔除 ST |
| 方向 | 高值好 / 低值好 | BP：高值好（价值） |

**情景**：用报告期 merge 财务数据，IC 从 0.02 跳到 0.06——多半是 **未来函数**，不是因子改进。生效时间写进 Spec，代码 review 时逐项核对。

---

## 17.2 横截面与时间序列因子

| 类型 | 计算方式 | 典型用途 |
| --- | --- | --- |
| 横截面 Cross-sectional | 同一日 $t$ 在所有股票间比较 | BP、ROE、月频动量 |
| 时间序列 Time-series | 同一股票 $i$ 跨时间比较 | 突破 20 日高点、波动率突变 |

**多因子选股主线是横截面**：每个调仓日对 $N_t$ 只股票做 rank / z-score。

时间序列信号可用于 **择时或过滤**（如仅在个股 20 日新高时启用动量），但与 **全市场横截面排序** 是不同研究目标——勿混在同一 Factor Spec。

---

## 17.3 去极值 Winsorize

极端值来自 **数据错误** 或 **真实但不可交易** 的尾部（微盘股、重组股）。去极值降低回归与排序对尾部的敏感度。

### 常用方法

| 方法 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| 分位数缩尾 | 截断至 $[q_{1\%}, q_{99\%}]$ | 简单直观 | 分位随样本变 |
| MAD | 中位数 ± $n \times 1.4826 \times MAD$ | 对异常值稳健 | 需调 $n$ |
| 3σ | 均值 ± 3 标准差 | 经典 | 均值本身被极值拉偏 |
| 业务规则 | PE > 0 且 < 100 | 可解释 | 需领域知识 |

**MAD 示意**（横截面逐日）：

$$
\text{MAD}_t = \mathrm{median}_i\left(|x_{i,t} - \mathrm{median}_j(x_{j,t})|\right)
$$

$$
x_{i,t}^{\text{clip}} = \mathrm{clip}\left(x_{i,t},\; m_t - n \cdot 1.4826 \cdot \text{MAD}_t,\; m_t + n \cdot 1.4826 \cdot \text{MAD}_t\right)
$$

$n$ 常取 3～5。**同一因子全样本统一规则**，不要在样本内动态调 $n$（过拟合）。

### A 股注意

- 亏损股 PE 为负或极大 → 先用 **EP 或剔除亏损** 再 winsorize。
- 科创板、创业板波动大，可与 **分板块** 缩尾（若股票池跨板）。

---

## 17.4 标准化 Standardization

去极值后，把因子缩放到 **可比尺度**，便于合成与回归。

| 方法 | 公式 | 适用 |
| --- | --- | --- |
| Z-score | $z_{i,t} = (x_{i,t} - \mu_t) / \sigma_t$ | 近似正态、线性合成 |
| Rank | $\mathrm{rank}(x_{i,t}) / N_t$ | 非线性、抗极值 |
| 分位数 | 映射到 $[0,1]$ 均匀分位 | 分组前常用 |
| 行业内 | 行业内 z-score 或 rank | 消除行业水平差异 |

横截面 Z-score：

$$
z_{i,t} = \frac{x_{i,t} - \mu_t}{\sigma_t}, \quad \mu_t = \frac{1}{N_t}\sum_i x_{i,t}
$$

**行业内标准化**（申万一级示例）：先在每个行业 $g$ 内对 $x_{i,t}$ 做 z-score，再可选全截面二次标准化——价值、质量因子 **几乎必做**，否则 IC 里一半是行业 bet。

---

## 17.5 缺失值处理

| 策略 | 做法 | 何时用 |
| --- | --- | --- |
| 剔除 | 该日不参与排序 | 缺失比例低、随机 |
| 截面中位数填充 | 用 $\mathrm{median}_t$ 填 | 缺失与行业相关弱 |
| 行业填充 | 用同行业 median | 财务指标、覆盖不均 |
| 缺失指示 | 增加 `is_missing` 哑变量 | ML 特征；传统因子慎用 |

**原则**：

- 停牌、未披露 **不是随机缺失**——宁可剔除，勿用未来数据填。
- 填充会 **压缩横截面分散度**，IC 可能人为升高或降低，需在 Spec 中固定一种策略。

---

## 17.6 中性化 Neutralization

中性化剥离 **行业、市值等已知暴露**，得到「纯」因子残差——检验 **选股 Alpha** 而非行业/风格 bet。

### 回归残差法（最常用）

每个交易日 $t$ 横截面回归：

$$
x_{i,t} = \alpha_t + \sum_k \beta_{k,t} \cdot \mathrm{Ind}_{i,k,t} + \gamma_t \cdot \ln(\mathrm{Cap}_{i,t}) + \varepsilon_{i,t}
$$

- $\mathrm{Ind}_{i,k,t}$：行业哑变量（申万/中信一级）
- $\ln(\mathrm{Cap}_{i,t})$：对数总市值
- **中性化因子** $f_{i,t} = \varepsilon_{i,t}$ 或 $\varepsilon_{i,t}$ 再 z-score

### 行业中性 vs 市值中性

| 级别 | 做法 | 效果 |
| --- | --- | --- |
| 仅行业 | 行业哑变量回归 | 去掉行业均值差 |
| 行业 + 市值 | 加 $\ln(\text{Cap})$ | 去掉规模曲线 |
| 多风格 | 加 Beta、动量等 | 更接近 Barra 残差 |

### 中性化的代价

- **可解释性**：残差与原始经济含义距离变远，汇报时需同时展示 **原始 vs 中性** IC。
- **噪声**：回归消耗自由度，小样本日（如春节后）估计不稳。
- **过度中性**：把 **因子本身的经济内容**（如价值偏金融）洗没——需与 PM 对齐产品是否要行业中性。

**A 股指数增强**：相对基准 **行业偏离有限额** → 因子层行业中性 + 组合层行业约束，两层勿重复计数。

---

## 17.7 因子方向与滞后

| 概念 | 说明 |
| --- | --- |
| 正向 | 因子值越大，预期收益越高（如 BP、ROE） |
| 反向 | 因子值越大，预期收益越低（如 PE、波动率） |
| 因子生效 | 信号计算完成且 **可交易** 的时点 |
| Delay | 信号日 $t$ 收盘 → 成交 $t+1$ 开盘（常见） |
| Holding Period | 持有至 $t+h$ 的收益用于 IC |

**IC 检验对齐**（关键）：

```text
factor_{i,t}  （t 日收盘已知）
    ↓ 预测
forward_return_{i,t+1 → t+h}  （下一期收益，非重叠或重叠需 Newey-West）
```

- 月频：$t$ = 月末，收益 = 下月全月或下月首个调仓周期。
- **禁止**：用 $t$ 日收盘因子预测含 $t$ 日收盘至 $t+1$ 开盘之间已可知的收益（微观结构研究除外）。

---

## Python 示例：完整横截面流水线

以下代码演示 **单日横截面** 的去极值、标准化、中性化；生产环境应对 `groupby('trade_date')` 向量化。

```python
import numpy as np
import pandas as pd
import statsmodels.api as sm

def winsorize_mad(s: pd.Series, n: float = 5.0) -> pd.Series:
    """横截面 MAD 缩尾。"""
    med = s.median()
    mad = (s - med).abs().median()
    if mad == 0 or np.isnan(mad):
        return s
    scale = 1.4826 * mad
    return s.clip(med - n * scale, med + n * scale)

def zscore(s: pd.Series) -> pd.Series:
    std = s.std(ddof=0)
    if std == 0 or np.isnan(std):
        return pd.Series(0.0, index=s.index)
    return (s - s.mean()) / std

def neutralize(
    factor: pd.Series,
    industry: pd.Series,
    ln_cap: pd.Series,
) -> pd.Series:
    """行业 + 对数市值中性化，返回回归残差。"""
    df = pd.DataFrame({"y": factor, "ln_cap": ln_cap, "ind": industry}).dropna()
    ind_dummies = pd.get_dummies(df["ind"], drop_first=True)  # 避免 dummy trap（全行业+截距共线）
    X = pd.concat([ind_dummies, df[["ln_cap"]]], axis=1)
    X = sm.add_constant(X)
    model = sm.OLS(df["y"], X).fit()
    resid = pd.Series(model.resid, index=df.index)
    return resid.reindex(factor.index)

def construct_factor(
    raw: pd.Series,
    industry: pd.Series,
    ln_cap: pd.Series,
    winsor_n: float = 5.0,
) -> pd.Series:
    x = winsorize_mad(raw, winsor_n)
    x = zscore(x)
    x = neutralize(x, industry, ln_cap)
    return zscore(x)  # 残差再次标准化，便于跨期比较
```

**面板向量化示意**：

```python
def construct_panel(df: pd.DataFrame, raw_col: str) -> pd.DataFrame:
    """df: trade_date, stock_id, raw_col, industry, ln_cap"""
    out = []
    for dt, g in df.groupby("trade_date"):
        f = construct_factor(g[raw_col], g["industry"], g["ln_cap"])
        out.append(pd.DataFrame({"trade_date": dt, "stock_id": g["stock_id"], "factor": f}))
    return pd.concat(out, ignore_index=True)
```

---

## 常见错误

- **先标准化再去极值**：极值仍污染 $\mu, \sigma$；顺序应为 raw → winsorize → z-score。
- **全样本 winsorize**：用未来分位数截断过去 → 轻微未来函数；应 **逐日横截面**。
- **中性化变量泄漏**：市值用调仓后权重、行业用未来分类。
- **方向不一致**：PE 未取负就按「高值好」合成，与 BP 因子打架。
- **滞后少一天**：财报公告 evening 发布却当日收盘成交。

## 要点回顾

- Factor Spec 冻结公式、窗口、生效时间——构造的第一步是写文档。
- 流水线：去极值 → 标准化 →（缺失）→ 中性化 → 方向与滞后。
- Winsorize 用 MAD 或分位；标准化常用 z-score 或 rank；价值/质量常做 **行业内** 处理。
- 中性化剥离行业与市值暴露，但有可解释性代价，勿过度清洗。
- 因子 $t$ 预测 $t+1$ 起收益，对齐错误 = 未来函数。
