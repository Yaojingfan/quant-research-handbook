# B 常用数学与统计基础

> 量化研究不需要成为数学家，但必须对以下概念**知其定义、会用、会质疑**。

---

## 均值（Mean）

$$
\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i
$$

**用途**：因子截面中心化、收益期望估计。  
**注意**：受极端值影响 — 配合 Winsorize 或 median。

---

## 方差（Variance）与标准差（Std）

$$
\mathrm{Var}(X) = E[(X - E[X])^2], \quad \sigma = \sqrt{\mathrm{Var}(X)}
$$

**用途**：波动率、Tracking Error、风险预算。  
**样本估计**：用 $n-1$ 分母（无偏估计）。

---

## 协方差（Covariance）与相关系数

$$
\mathrm{Cov}(X,Y) = E[(X-E[X])(Y-E[Y])]
$$

$$
\rho_{XY} = \frac{\mathrm{Cov}(X,Y)}{\sigma_X \sigma_Y}
$$

**用途**：因子相关、组合方差、IC 本质即相关系数。  
**注意**：相关 ≠ 因果；非平稳序列上相关会漂移。

---

## 回归（Regression）

线性模型：

$$
y = \alpha + \beta_1 x_1 + \cdots + \beta_k x_k + \epsilon
$$

**量化应用**：

- Fama-MacBeth：截面回归取因子溢价
- 中性化：对行业/市值回归取残差
- 归因：解释组合收益来源

**OLS 假设**：线性、外生性、同方差、无完美共线 — A 股数据常需稳健标准误。

---

## 假设检验（Hypothesis Testing）

**原假设 $H_0$**：如"因子 IC 均值 = 0"。  
**检验统计量**：t-stat、z-stat。  
**拒绝域**：p-value < α（常用 0.05）。

**量化警示**：

- 多重检验：试 100 个因子，5 个"显著"可能是运气
- 时间序列相关：需 **Newey-West** 调整标准误
- 非正态：可用 Bootstrap、Mann-Whitney

---

## p-value

**定义**：在 $H_0$ 为真时，观察到当前或更极端结果的概率。

**误读**：p = 0.03 不代表"有 97% 概率因子有效"。

---

## t-stat

$$
t = \frac{\hat{\beta}}{SE(\hat{\beta})}
$$

**经验**：|t| > 2 常被视为"粗略显著" — 仍需经济逻辑与 OOS。

---

## Bootstrap

**思想**：有放回重抽样，构造统计量分布。

**用途**：IC 置信区间、Sharpe 显著性、非参数检验。

```python
def bootstrap_ic(ic_series, n=1000, seed=42):
    rng = np.random.default_rng(seed)
    arr = ic_series.dropna().values
    stats = [rng.choice(arr, size=len(arr), replace=True).mean() for _ in range(n)]
    return np.percentile(stats, [2.5, 97.5])
```

---

## 横截面 vs 时间序列

| 维度 | 横截面 | 时间序列 |
| --- | --- | --- |
| 单位 | 同一日多只股票 | 同一只股票或多日聚合 |
| 典型问题 | 因子能否排序？ | 策略净值是否稳定？ |
| 检验 | 每日 IC、t-test on IC | Sharpe、最大回撤、NW on returns |

**多因子主战场**：横截面；但 IC 时间序列用于评稳定性（ICIR）。

---

## 要点回顾

- 统计显著 ≠ 经济显著 ≠ 可交易
- 金融数据非 IID — 标准误常需调整
- 细节推导可查 Hamilton、Stock & Watson；本手册强调**研究中的正确用法**
