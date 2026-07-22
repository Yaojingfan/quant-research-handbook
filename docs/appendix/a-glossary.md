# A 量化术语表

> 本附录收录 A 股多因子研究高频术语。口径与正文 Part I–IX 保持一致。

---

## Alpha

**定义**：风险调整后的超额收益；或无法被已知风险因子（市场、行业、风格）解释的收益部分。

**注意**：绝对收益高 ≠ Alpha；须先剥离 Beta 与风格暴露（见 Part I 06、Part VI 34）。

---

## Beta

**定义**：组合对基准或市场因子的敏感度。$\beta = \mathrm{Cov}(R_p, R_m) / \mathrm{Var}(R_m)$。

**A 股**：量化多头 Beta 通常 0.8–1.0；市场中性目标 Beta ≈ 0。

---

## Benchmark（基准）

**定义**：评价策略表现的参照组合。

**常用**：沪深 300（大盘指增）、中证 500（中盘）、中证 1000（小盘）。基准选择须与产品合同一致。

---

## Factor（因子）

**定义**：解释股票横截面收益差异的特征变量或风险暴露。

**区分**：Indicator（原始指标）→ Feature（工程特征）→ Factor（经检验的特征）→ Signal/Score（用于组合）。

---

## IC（Information Coefficient）

**定义**：因子值与未来收益的相关系数。常用 Rank IC（Spearman）。

$$
\mathrm{IC}_t = \mathrm{corr}(\mathrm{rank}(f_{i,t}), \mathrm{rank}(r_{i,t+1}))
$$

**经验**：A 股单因子月均 Rank IC 0.02–0.05 已属可用；需结合 ICIR 与换手。

---

## ICIR

**定义**：IC 信息比率，衡量因子稳定性。

$$
\mathrm{ICIR} = \frac{\overline{\mathrm{IC}}}{\sigma(\mathrm{IC})}
$$

年化 ICIR 有时乘以 $\sqrt{12}$（月频）或 $\sqrt{252}$（日频）— 须注明频率。

---

## Sharpe Ratio（夏普比率）

**定义**：超额收益相对波动率的风险调整指标。

$$
Sharpe = \frac{E[R_p - R_f]}{\sigma(R_p - R_f)}
$$

**注意**：高 Sharpe 可能来自低波 + 隐藏风格暴露；须配合 IR、回撤、容量审视。

---

## Maximum Drawdown（最大回撤）

**定义**：净值从前期峰值到谷底的最大跌幅。

$$
MDD = \max_t \frac{PV_t - \max_{s \leq t} PV_s}{\max_{s \leq t} PV_s}
$$

---

## Tracking Error（跟踪误差）

**定义**：组合相对基准超额收益的标准差（通常年化）。

指数增强核心约束：TE 与主动收益共同决定 IR。

---

## Turnover（换手率）

**定义**：组合调仓涉及的买卖金额相对 NAV 的比例。

$$
Turnover \approx \frac{1}{2} \sum_i |w_{i,t} - w_{i,t-1}|
$$

高换手 → 高成本 → 侵蚀 Alpha。

---

## Slippage（滑点）

**定义**：决策价与实际成交价之间的偏差（隐性执行成本）。**不含**佣金、印花税等显性费用——后者应单独列示（见 Part V 27）。冲击（market impact）常与滑点一并讨论，但建模时应分项。

---

## Implementation Shortfall（IS，实施缺口）

**定义**：相对决策价的执行损益缺口，衡量「想成交的价」与「实际成交价」之差。与上方 Slippage 同属执行质量口径；本手册模拟盘字段记为 **IS（bp）** $= IS \times 10000$（见 Part IX 45）。

买卖符号约定（与 45 章一致）：

$$
IS_{\mathrm{buy}} = \frac{P_{exec} - P_{decision}}{P_{decision}},\qquad
IS_{\mathrm{sell}} = \frac{P_{decision} - P_{exec}}{P_{decision}}
$$

**注意**：正文中 **IS** 也常表示 **In-Sample（样本内）**。读到「IS」时按语境区分：执行质量章节指 Implementation Shortfall；回测/过拟合章节指样本内。

---

## Neutralization（中性化）

**定义**：剔除因子或组合对行业、市值等变量的暴露，常通过回归取残差实现。

**代价**：可能降低 raw IC，但提高可移植性与可解释性。

---

## Survivorship Bias（幸存者偏差）

**定义**：样本仅含"存活"股票，忽略退市股，导致回测收益高估。

**防范**：使用 Point-in-time 股票池与退市记录。

---

## Look-ahead Bias（未来函数 / 前视偏差）

**定义**：使用了决策时点不可得的信息（如修订财报、未来成分股）。

**防范**：As-of join、公告日生效、滞后一期（Part II 13）。

---

## Out-of-Sample（样本外）

**定义**：未参与参数选择、模型训练或因子挖掘的独立时间段。

**原则**：Test 集只评估一次；反复窥探 = 样本内。

---

## Capacity（容量）

**定义**：策略在不显著损伤超额的前提下可承载的最大资金规模。

**驱动**：流动性、冲击成本、换手、因子拥挤（Part IX 48）。

---

## 其他常用术语（简释）

| 术语 | 含义 |
| --- | --- |
| IR（Information Ratio） | 主动收益 / TE |
| IS（In-Sample） | 样本内；勿与 Implementation Shortfall 混淆 |
| IS（Implementation Shortfall） | 实施缺口；模拟盘常记 IS（bp）$= IS \times 10000$（见 45） |
| PIT（Point-in-Time） | 当时可得信息快照 |
| ADV | 平均日成交额 |
| OMS | 订单管理系统 |
| AUM | 管理规模 |
| Long-Short | 多空组合，买 top 卖 bottom |
| Winsorize | 分位数缩尾去极值 |
| Walk-forward | 滚动扩展训练、向前验证 |
