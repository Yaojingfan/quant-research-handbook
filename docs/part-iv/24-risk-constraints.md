# 24 风险约束与中性化

> 所属模块：Part IV 从因子到投资组合

> **不做约束的组合，不是在吃 Alpha，是在赌 Size、行业和 Beta。** A 股里，很多「因子策略」不过是小盘多头换了名字——约束是照妖镜。

## 本节导读

权重方法决定「怎么分」；风险约束决定「不许怎么分」。本节覆盖个股权重、行业、风格、换手、流动性与容量约束，并解释 **中性化** 在组合层的含义与代价。

## 学习目标

1. 设计个股权重、持仓数量与集中度约束
2. 实现行业中性或「相对基准偏离上限」两种行业约束模式
3. 控制 Size、Value、Momentum 等风格暴露
4. 在换手、流动性与 Alpha 之间做可量化的 trade-off

## 核心概念

约束将 **无约束最优解** 投影到 **可行域** $\mathcal{W}$：

$$
w^* = \arg\max_{w \in \mathcal{W}} \ U(w)
$$

可行域过小 → Alpha 被压没；可行域过大 → 假 Alpha 与不可交易风险。

---

## 24.1 个股权重约束

### 最大权重

- **合规**：公募单票通常 ≤ 10%；私募可更灵活
- **研究**：指增常见 **3%—5%** 主动权重上限（相对基准）
- **原因**：控制特异性风险、流动性、黑天鹅

### 最小持仓

- 避免 **碎片化**：权重 < 10bp 的持仓交易成本高
- 常见：**低于 30bp 清零**， redistribute 到其他标的

### 持仓数量

- **Top N**：N = 30—150，与因子 breadth 相关
- N 过小 → 集中；N 过大 → Alpha 稀释 + 成本上升
- 指增：有效持仓通常 100—300（含基准核心持仓）

### 约束示例（指增）

| 约束 | 典型值 |
|------|--------|
| $|w_i - w^b_i| \leq 2\%$ | 单票主动偏离 |
| $w_i \leq 5\%$ | 绝对上限 |
| $N_{\mathrm{eff}} \geq 80$ | 有效持仓数 |
| 权重 < 0.1% 清零 | 最小交易单位 |

---

## 24.2 行业约束

### 行业中性

- **定义**：组合行业权重 = 基准行业权重，或全市场行业等权
- **实现**：回归残差因子 + 优化器行业等式约束；或行业内选股
- **代价**：削弱行业动量 Alpha；对 **行业轮动因子** 不友好

### 相对基准偏离

- **更常用指增**：
  $$
  |w^{\mathrm{ind}}_k - w^{b,\mathrm{ind}}_k| \leq \delta_k
  $$
- $\delta_k$ = 2%—5% 绝对偏离，或基准行业权重的 20%—50% 相对偏离
- 允许 **有限行业 bet**，但防止「全仓半导体」式假 Alpha

### 行业集中度

- **Herfindahl** 或 Top 3 行业权重上限
- A 股行业分类：**中信 / 申万 / GICS 映射** —— 全项目统一一种

### 行业约束模式对照

| 模式 | Alpha 空间 | TE | 适用 |
|------|------------|-----|------|
| 严格中性 | 小 | 低 | 中性、部分指增 |
| 偏离上限 | 中 | 中 | 主流指增 |
| 无约束 | 大 | 高 | 量化多头（需说明） |

---

## 24.3 市值与风格约束

### Size

- A 股 **小盘暴露** 是假 Alpha 头号来源
- 约束：$| \sum w_i \beta^{\mathrm{size}}_i - \sum w^b_i \beta^{\mathrm{size}}_i | \leq 0.3$（单位与 $\beta^{\mathrm{size}}$ 一致，常用标准化后的暴露，约 $\pm 0.3$ 个截面标准差）
- 或在优化器中加入 **size 因子暴露上下限**

### Value / Momentum / Beta / Volatility

- 与 Barra 或自建风险模型因子对齐
- **指增**：主动暴露 $\pm 0.3\sigma$—$0.5\sigma$
- **中性**：主动暴露 near 0

### 风格约束 vs 因子中性化

| 步骤 | 位置 | 作用 |
|------|------|------|
| 因子中性化 | 因子构造 | 去除因子与 size/industry 相关 |
| 风格约束 | 组合优化 | 控制 **残余暴露** 与 **多因子叠加** |

两步都需要；只做因子中性化不保证组合中性。

---

## 24.4 换手率约束

### 调仓成本

- 单次换手 100% ≈ 双边 0.3%—0.6% 成本（佣金 + 印花税 + 滑点）
- 月换手 50% → 年化成本可能 **吃掉 3%+** 毛 Alpha

### 信号变化

- 因子自相关低 → 天然高换手
- **平滑信号**、**buffer zone**（排名变化 < K 位不调）降换手

### 最优权衡

- 优化器约束：$|w_t - w_{t-1}|_1 \leq \tau$
- 或惩罚项：$\max \ \alpha' w - \lambda \cdot \mathrm{TC}(w, w_{t-1})$
- **检验**：绘制 **换手 — 净 IR** 曲线，找拐点而非最小换手

### Buffer 规则示例

- Top 50 组合：新进入需 rank ≤ 45；退出需 rank > 55
- 降低 **边界股票抖动**

---

## 24.5 流动性与容量约束

### 成交额比例

- **Participation rate**：单日交易不超过 20 日日均成交额的 **5%—10%**
- 约束：$|\Delta w_i| \cdot \mathrm{AUM} \leq \eta \cdot \mathrm{ADV}_i$

### 市场冲击

- 大单推高价格；小盘冲击非线性
- 回测用 **平方根 law** 或分段线性冲击模型（Part V 第 27 章）

### 组合容量

- **容量**：使净 IR 下降约 20% 时的 AUM（经验阈值）
- 估算：单票可支撑 $\mathrm{AUM}_i=\eta\cdot\mathrm{ADV}_i/|w_i|$，**组合容量取木桶** $\min_i\mathrm{AUM}_i$（或分位数），**不要对单票容量求和**

### 小盘策略限制

- 1000 指增 + 5 亿 AUM：常需 **成交额 > 1 亿** 过滤
- **诚实结论**：很多回测 Sharpe 2+ 的策略，容量 < 2 亿

### 容量粗算

$$
\mathrm{AUM}_i = \frac{\eta \cdot \mathrm{ADV}_i}{|w_i|},\qquad
\mathrm{Capacity} \approx \min_{i \in \mathrm{portfolio}} \mathrm{AUM}_i
$$

（可选稳健版：取分位数木桶，如 10% 分位，避免极端单票主导。）

---

## 数学定义

行业中性（等式）：

$$
\sum_{i \in \mathrm{ind}_k} w_i = \sum_{i \in \mathrm{ind}_k} w^b_i \quad \forall k
$$

换手约束（L1）：

$$
\sum_i |w_{i,t} - w_{i,t-1}| \leq \tau
$$

流动性约束：

$$
|\Delta w_i| \cdot V \leq \eta \cdot \mathrm{ADV}_i
$$

其中 $V$ 为组合总规模。

---

## Python 示例

```python
import cvxpy as cp
import numpy as np

def optimize_with_constraints(
    mu: np.ndarray,
    sigma: np.ndarray,
    w_prev: np.ndarray,
    w_b: np.ndarray,
    max_active: float = 0.02,
    max_turnover: float = 0.3,
    lam: float = 1.0,
):
    """示意：主动效用 max α'a − (λ/2) a'Σa；须传入协方差，勿用 sum_squares(active) 冒充主动风险。"""
    n = len(mu)
    w = cp.Variable(n)
    active = w - w_b
    turnover = cp.norm(w - w_prev, 1)

    objective = cp.Maximize(mu @ active - 0.5 * lam * cp.quad_form(active, sigma))
    constraints = [
        cp.sum(w) == 1,
        w >= 0,
        active >= -max_active,
        active <= max_active,
        turnover <= max_turnover,
    ]
    prob = cp.Problem(objective, constraints)
    prob.solve(solver=cp.OSQP)
    return w.value
```

---

## 常见错误

1. **因子做了市值中性，组合不做** → 残余 Size 暴露
2. **行业分类不一致** → 约束形同虚设
3. **换手无约束 + 高 IC 因子** → 回测净收益为负
4. **忽略涨跌停导致的被动换手** → 权重漂移未建模
5. **容量按平均成交额算** → 应取瓶颈股票

## 要点回顾

- 约束不是可选项；无约束组合暴露 Size、行业与 Beta
- 指增用「相对基准偏离」比 strict 行业中性更常见
- 换手与流动性直接决定净 Alpha；必须进优化或规则
- 容量是策略的硬天花板；小盘回测必须报容量估算

下一章：[25 组合优化基础](25-portfolio-optimization.md)
