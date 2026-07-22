# 28 绩效评价指标

> 所属模块：Part V 回测体系

> **Sharpe 2.0 不能当饭吃，但年化净 IR≈0.3 的指增也可能及格。** 指标是用来比较策略与暴露风险的，不是用来刷存在感的。

## 本节导读

本章系统定义 **收益、风险、风险调整与相对基准** 指标，并讨论指标之间的冲突。所有指标在 **扣成本后** 计算，指增产品 **相对官方基准** 评价。

## 学习目标

1. 正确计算年化收益、超额收益与月度胜率
2. 理解波动、回撤、下行风险与尾部指标
3. 掌握 Sharpe、Sortino、Calmar、IR 的适用边界
4. 解读 Tracking Error、Active Return、Up/Down Capture
5. 识别「高收益 vs 高回撤」等指标冲突

## 核心概念

绩效评价 = **绝对表现 + 相对表现 + 风险质量 + 实现质量（成本、换手）**。

---

## 28.1 收益指标

### 累计收益

$$
R_{\mathrm{cum}} = \prod_{t=1}^{T}(1 + r_t) - 1
$$

### 年化收益

$$
R_{\mathrm{ann}} = (1 + R_{\mathrm{cum}})^{252/T} - 1 \quad (\text{daily})
$$

月频常用 $(1+R_{\mathrm{cum}})^{12/T_m}-1$。

### 超额收益

- **绝对超额**：$r_p - r_f$（无风险，A 股常用国债或 0）
- **相对超额**：$r_p - r_b$（基准，指增核心）

### 月度胜率

$$
\mathrm{WinRate} = \frac{\#\{r_{p,m} > r_{b,m}\}}{\#\{m\}}
$$

- 指增：**相对基准** 月胜率 > 55% 已有意义
- 单独看绝对月胜率易被 Beta 误导

---

## 28.2 风险指标

### 波动率

$$
\sigma_{\mathrm{ann}} = \mathrm{std}(r_t) \cdot \sqrt{252}
$$

### 最大回撤（MDD）

$$
\mathrm{MDD} = \max_t \left( \frac{\mathrm{peak}_t - \mathrm{NAV}_t}{\mathrm{peak}_t} \right)
$$

- A 股 **2015、2018、2024** 等阶段 MDD 是策略试金石
- 指增看 **相对回撤**（主动收益回撤）同样重要

### 下行波动（Downside Deviation）

标准定义（相对最低可接受收益 MAR，常取 0 或 $r_f$）：

$$
\sigma_{\mathrm{down}}
= \sqrt{\mathbb{E}\big[\min(r_t-\mathrm{MAR},0)^2\big]}\cdot\sqrt{252}
$$

（勿用「仅负收益子样本的样本标准差」替代，二者不等价。）

### VaR / CVaR（简介）

- **VaR(95%)**：在 95% 置信水平下，损失不超过该阈值的概率为 95%（收益分布左尾分位数）；**不是**「最大可能损失」
- **CVaR**：超过 VaR 的尾部平均损失
- 研究常用；A 股 fat tail 下 CVaR 比 VaR 信息更丰富
- 本手册不展开监管 capital 口径

---

## 28.3 风险调整后收益

### Sharpe Ratio

$$
\mathrm{Sharpe} = \frac{\mathbb{E}[r_p - r_f]}{\sigma(r_p - r_f)} \cdot \sqrt{252}
$$

- **适用**：绝对收益策略
- **陷阱**：短样本、非正态、自相关 → t 统计 inflated
- **A 股**：牛熊切换使 Sharpe 不稳定

### Sortino Ratio

$$
\mathrm{Sortino} = \frac{\mathbb{E}[r_p - r_f]\cdot\sqrt{252}}{\sigma_{\mathrm{down}}}
$$

其中 $\sigma_{\mathrm{down}}$ **已按上一节年化**。分子用日均超额 ×√252，分母勿再乘 √252（避免双重年化）。

### Calmar Ratio

$$
\mathrm{Calmar} = \frac{R_{\mathrm{ann}}}{|\mathrm{MDD}|}
$$

- 对 **回撤敏感** 产品（私募止损线）有意义
- MDD 来自单一样本路径，OOS 可能恶化

### Information Ratio

$$
\mathrm{IR} = \frac{\mathbb{E}[r_p - r_b]}{\sigma(r_p - r_b)} \cdot \sqrt{252}
$$

- **指增与中性的核心指标**
- IR > 0.5 可持续已不错；> 1 需怀疑过拟合或短样本

---

## 28.4 相对基准指标

### Tracking Error

$$
\mathrm{TE} = \sigma(r_p - r_b) \cdot \sqrt{252}
$$

- **Ex-ante vs Ex-post**：预测 vs 实现
- 指增合同通常约束 TE 上限

### Active Return

$$
\overline{r_{\mathrm{active}}} = \mathbb{E}[r_p - r_b]
$$

- 年化主动收益 = IR × TE（近似关系，用于规划）

### Up / Down Capture

条件期望比（教学常用）：

$$
\mathrm{UpCapture} = \frac{\mathbb{E}[r_p \mid r_b > 0]}{\mathbb{E}[r_b \mid r_b > 0]}
$$

$$
\mathrm{DownCapture} = \frac{\mathbb{E}[r_p \mid r_b < 0]}{\mathbb{E}[r_b \mid r_b < 0]}
$$

实务亦常用上涨日（或下跌日）**累加收益比** $\sum r_p / \sum r_b$。两种口径数值不可直接横向比较，报告须写明定义。

- 理想指增：**Up Capture > 100%**，**Down Capture < 100%**
- 量化多头常 Up/Down 均 > 100%（高 Beta）

---

## 28.5 指标之间的冲突

| 冲突 | 说明 | 应对 |
|------|------|------|
| 高收益 vs 高回撤 | 集中行业 / 小盘 | 看 Calmar、MDD 期 |
| 高 Sharpe vs 低容量 | 小池高换手 | 报容量与 AUM 假设 |
| 高 IR vs 高换手 | 成本侵蚀 OOS | 净 IR、成本后 IR |
| 低 TE vs 低 Alpha | 约束过紧 | 放松约束做 frontier |
| 高胜率 vs 低盈亏比 | 多次小赢一次大亏 | 看 tail 与 CVaR |

**实务原则**：报告 **指标面板**，不单列 Sharpe；指增 **IR + TE + 净超额 + MDD** 四件套。

---

## 指标面板示例

| 指标 | 策略 A | 策略 B | 备注 |
|------|--------|--------|------|
| 年化净超额 | 6% | 4% | A 主动收益更高 |
| TE | 5% | 3% | B 跟踪误差更低 |
| IR | 1.2 | 1.3 | B 单位跟踪误差上的超额更优（$\approx$ 净超额 / TE） |
| MDD（主动） | -8% | -4% | B 主动回撤更浅 |
| 年化换手 | 300% | 120% | A 对交易成本与冲击更敏感 |
| 容量（估） | 3 亿 | 20 亿 | B 可承载规模更大 |

单看净超额会偏好 A；纳入 TE、IR、换手与容量后，B 往往更符合可上线约束。选择取决于产品的 TE 预算、成本假设与 AUM 目标，而非单一指标。

---

## Python 示例

```python
import numpy as np
import pandas as pd

def performance_summary(
    ret: pd.Series,
    bench: pd.Series | None = None,
    rf: float = 0.0,
) -> dict:
    excess = ret - rf
    ann = (1 + ret).prod() ** (252 / len(ret)) - 1
    vol = ret.std() * np.sqrt(252)
    sharpe = (
        excess.mean() / excess.std() * np.sqrt(252) if excess.std() > 0 else np.nan
    )
    cum = (1 + ret).cumprod()
    mdd = ((cum / cum.cummax()) - 1).min()
    out = {"ann_return": ann, "vol": vol, "sharpe": sharpe, "mdd": mdd}
    if bench is not None:
        active = ret - bench
        out["ir"] = active.mean() / active.std() * np.sqrt(252) if active.std() > 0 else np.nan
        out["te"] = active.std() * np.sqrt(252)
    return out
```

---

## 常见错误

1. **毛收益报 Sharpe** → 虚高
2. **短样本年化** → 3 年牛市的 Sharpe 不可外推
3. **指增用绝对 Sharpe 代替 IR** → 掩盖 TE 约束
4. **忽略自相关算 t 统计** → 显著性虚假
5. **MDD 不做子样本** → 2015 前后表现割裂未暴露

## 要点回顾

- 指增看 IR、TE、净超额；多头看 Sharpe、MDD、Calmar
- 所有指标 **扣成本**；换手高的策略必须报净 IR
- 指标互相冲突是常态；用面板而非单一数字
- 高指标 + 低容量 + 高换手 = 典型「回测策略」

下一章：[29 回测偏差与常见陷阱](29-backtest-pitfalls.md)
