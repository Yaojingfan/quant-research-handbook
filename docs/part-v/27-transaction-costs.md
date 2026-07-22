# 27 交易成本与成交建模

> 所属模块：Part V 回测体系

> **毛 Alpha 是研究员的自尊，净 Alpha 是 PM 的 KPI。** A 股里，印花税 alone 就能让日频换手策略在回测里活着、在实盘里死亡。

## 本节导读

本章量化 **佣金、印花税、滑点、冲击、成交约束** 与换手的关系，给出 A 股默认值与压力测试方法。成本不是回测最后加的一行代码，而是 **与策略设计 co-design** 的部分。

## 学习目标

1. 掌握 A 股交易成本结构与合理默认值
2. 建模固定/比例/成交量相关滑点与市场冲击
3. 实现涨跌停、停牌、成交量上限等成交约束
4. 理解换手与成本的量化关系，设定策略换手预算

## 核心概念

交易成本 = **显性费用 + 隐性成本（滑点 + 冲击）**。回测低估任一组件，等于系统性高估 Sharpe。

---

## 27.1 手续费与税费

### 佣金

- **双边**收取；常见 **万 1.5—万 3**（机构更低）
- **最低 5 元/笔**：小单 effective rate 极高 → 小资金 / 高分散组合需注意
- 回测默认：**万 2 双边** 是保守 baseline；机构可用实际费率

### 印花税

- **卖出单边 0.05%**（2023 年 8 月起减半；写文档时以当时政策为准）
- 仅卖出 → **不对称成本** → 高换手下卖压成本更重

### 交易所费用

- 经手费、证管费等，通常 **bp 级**，可并入佣金

### A 股成本速查（示意）

| 项目 | 方向 | 费率（示意） |
|------|------|--------------|
| 佣金 | 买 + 卖 | ~0.02% each |
| 印花税 | 卖 | ~0.05% |
| 滑点 | 买 + 卖 | 5—20 bp each |
| **单次 round-trip** | — | **~0.15%—0.35%** |

月换手 100% → 年化成本 **~2%—4%** 量级，足以抹杀多数因子毛收益。

---

## 27.2 滑点

### 固定滑点

- 每笔 ±X bp；实现简单，与规模无关
- **缺点**：大单低估、小单高估

### 比例滑点

- 成交价 = 理论价 × $(1 \pm s)$，$s$ = 5—10 bp
- A 股中频默认：**10 bp 单边** 是合理保守值

### 基于成交量的滑点

- 参与率 $p = \frac{\text{order volume}}{\text{ADV}}$ 越大，滑点越高
- 简易模型：$s = s_0 + s_1 \cdot p$

### 成交价假设

| 假设 | 乐观程度 | 适用 |
|------|----------|------|
| 收盘价 | 高 | 不推荐 |
| 开盘价 | 中 | 日频调仓常用 |
| VWAP | 中 | 机构默认 |
| 收盘价 + 滑点 | 中偏高 | 需额外 lag |

**诚实建议**：研究用 **VWAP 或开盘价 + 10 bp**；敏感性测试 ±5 bp。

---

## 27.3 市场冲击

### 订单规模

- 订单占 ADV 比例是冲击主驱动
- **平方根 law**（概念）：
  $$
  \mathrm{impact} \propto \sigma \sqrt{\frac{Q}{\mathrm{ADV}}}
  $$

### 流动性

- 小盘股 $\sigma$ 高、ADV 低 → 冲击非线性上升
- 与第 24.5 容量约束 **同一套 ADV 数据**

### 冲击函数（回测用）

```python
def impact_cost_fraction(participation: float, sigma: float, coeff: float = 0.1) -> float:
    """平方根冲击（收益分数，非 bp）。
    participation = order_value / ADV；sigma = 日波动率（小数）。
    返回约等于冲击导致的相对价格不利变动；×1e4 才是 bps。
    """
    return coeff * sigma * (participation ** 0.5)
```

### 容量分析

- 对目标 AUM，逐 stock 算最大可交易金额 → **min 为瓶颈**
- 冲击模型参数 **样本外校准**：用实盘 execution log 回归

---

## 27.4 成交约束

### 停牌

- 调仓日停牌 → **不能交易**；权重 drift 至下次可交易日
- 长期停牌：是否强制剔除与 PM 规则一致

### 涨跌停

- **一字涨停**：买入失败；权重留在现金或次优股
- **一字跌停**：卖出失败；被动超配
- **最低建模**：涨停不买、跌停不卖；更精细：按封单量估算成交概率

### 成交量限制

- 单日成交不超过 ADV 的 **5%—10%**
- 超出部分 **延迟** 至后续交易日，产生 **跟踪误差**

### 延迟成交

- 信号发出后 **T+1 未成交** → T+2 重试，最多 N 日
- 延迟期间价格变动 → **implementation shortfall**

### 成交约束影响

| 约束 | 典型受害者 |
|------|------------|
| 涨停买不到 | 小盘 momentum 多头 |
| 跌停卖不出 | 风险模型降权、止损 |
| ADV 上限 | 大 AUM 指增 |

---

## 27.5 Turnover

### 定义

$$
\mathrm{TO}_t = \frac{1}{2} \sum_i |w_{i,t} - w_{i,t-1}^{+}|
$$

（系数 0.5 与否需全项目统一；报告注明口径。）

### 计算口径

- **单边 vs 双边**：A 股习惯报告 **单边换手**
- **年化**：$\overline{\mathrm{TO}} \times N_{\mathrm{rebalance}}$

### 成本关系

$$
\mathrm{Cost}_t \approx c \cdot \mathrm{TO}_t
$$

$c$ ≈ 0.15%—0.35% per 100% 换手（视费率与滑点）。

### 研究中的解释

- **高 IC + 高换手** → 可能净 IR < 0
- 优化 **净 IR** 而非 gross IR
- 报告：**毛收益、成本、净收益** 三列并列

---

## 数学定义

总交易成本（比例形式）：

$$
\mathrm{TC}_t =
c^{\mathrm{comm}}\sum_i |\Delta w_i|
+ c^{\mathrm{stamp}}\sum_{\Delta w_i < 0}|\Delta w_i|
+ \sum_i s_i |\Delta w_i|
$$

其中印花税仅作用于卖出（$\Delta w_i < 0$）；$s_i$ 为滑点/冲击（可随 ADV 变化）。

---

## Python 示例

```python
import numpy as np
import pandas as pd

def estimate_transaction_cost(
    delta_w: pd.Series,
    nav: float,
    commission: float = 0.0002,
    stamp_duty: float = 0.0005,
    slippage: float = 0.001,
) -> float:
    trade_value = delta_w.abs() * nav
    buy = delta_w[delta_w > 0].abs().sum() * nav
    sell = delta_w[delta_w < 0].abs().sum() * nav
    comm = (buy + sell) * commission
    stamp = sell * stamp_duty
    slip = (buy + sell) * slippage
    return comm + stamp + slip
```

---

## 常见错误

1. **零成本回测** → 仅供排序检验，不能叫「策略回测」
2. **只算佣金不算印花税** → A 股卖出成本被严重低估
3. **收盘价无滑点成交** → 乐观 10—30 bp / 次
4. **涨跌停仍成交** → 小盘策略重灾区
5. **换手与成本脱钩** → 无法解释实盘 decay

## 要点回顾

- A 股卖出印花税 + 佣金 + 滑点 → round-trip ~15—31 bp
- 冲击与 ADV 绑定；容量与成本同一硬币两面
- 涨跌停、停牌、ADV 上限必须进回测
- 换手是成本乘数；净 IR 才是决策指标

下一章：[28 绩效评价指标](28-performance-metrics.md)
