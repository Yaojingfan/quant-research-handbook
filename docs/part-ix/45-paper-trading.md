# 45 模拟盘与实盘验证

> 所属模块：Part IX 从研究到实盘

> **回测是假设，模拟盘是预演，实盘是照妖镜 — 三层之间必须记录差距，而不是假装一致。**

## 本节导读

回测年化超额 15%、模拟盘 10%、小资金实盘 6% — 每一步缩水都有名字：成本、滑点、成交约束、信号延迟。本章定义 Paper Trading、Shadow Portfolio 与小资金验证的标准做法。

## 学习目标

1. 区分 Paper Trading、Shadow Portfolio 与 Live 小资金验证
2. 建立实盘偏差记录与执行质量分析框架
3. 知道何时可以从研究进入下一验证阶段

---

## 验证阶梯

```mermaid
flowchart LR
    A[样本外回测] --> B[Paper Trading]
    B --> C[Shadow Portfolio]
    C --> D[小资金实盘]
    D --> E[规模化]
```

| 阶段 | 资金 | 成交 | 目的 |
| --- | --- | --- | --- |
| Paper | 无 | 模拟撮合 | 流程跑通 |
| Shadow | 无/极小 | 真实行情、模拟下单 | 信号与生产对齐 |
| 小资金 | 真实 | 真实成交 | 验证成本与容量 |
| 规模化 | 递增 | 真实 | 监控衰减 |

---

## 45.1 Paper Trading

**定义**：用实时或延迟行情，按策略规则模拟持仓与成交，不涉及真实资金。

**要点**：

- 撮合规则与回测一致（涨跌停、成交量上限）
- 每日自动生成 `sim_position` vs `target_position`
- 记录 sim P&L 与回测 hypothetical P&L 的差异

```python
# 简化：不可买涨停
tradable = (close < limit_up) & (volume > 0)
fill_price = np.where(tradable, open_next, np.nan)
```

---

## 45.2 Shadow Portfolio

**定义**：生产 Pipeline 完整运行，订单**不真实发送**，或与主策略并行记录。

**价值**：

- 验证因子计算、优化、风险检查与回测是否一致
- 新因子/新模型上线前的**必经环节**

**要求**：Shadow 至少运行 1–3 个月（视调仓频率），覆盖不同市场状态。

---

## 45.3 小资金验证

- 资金量：足以产生真实滑点，又低于容量上限（如策略预估容量的 5%–10%）
- 账户独立，避免与主产品混淆
- 合规审批、风控限额单独设置

**通过标准**（示例，团队自定）：

- 3–6 个月净超额与 Shadow 偏差 < X bp
- 执行成本在预算内
- 无 L2+ 监控事件

---

## 45.4 实盘偏差记录

每日记录 **Implementation Shortfall（实施缺口）**。买卖符号约定：买入时 $(P_{exec}-P_{decision})/P_{decision}>0$ 表示买贵了（不利）；卖出时常用 $(P_{decision}-P_{exec})/P_{decision}$，或统一用「成交相对决策价的损益方向」。$P_{decision}$ 须事先约定（前收 / 开盘 / 到达价 / VWAP 基准）：

$$
IS_{\mathrm{buy}} = \frac{P_{exec} - P_{decision}}{P_{decision}},\qquad
IS_{\mathrm{sell}} = \frac{P_{decision} - P_{exec}}{P_{decision}}
$$

| 字段 | 说明 |
| --- | --- |
| decision_price | 通常前收盘或 VWAP 基准 |
| exec_price | 实际成交均价 |
| IS（bp） | Implementation Shortfall × 10000（单位：基点） |
| unfilled_qty | 未完成数量及原因 |

汇总：按股票、行业、订单规模分桶 — 反馈给研究与交易。

---

## 45.5 执行质量分析

- **到达率**：目标股数 / 应调股数
- **时间分布**：是否集中在开盘/收盘
- **市场冲击**：大单 vs 小单滑点差
- **延迟**：信号生成 → 订单发出 → 成交

与 27 章成本模型对比：若实盘持续劣于模型假设，**下调回测预期**而非乐观坚持。

---

## 常见错误

- Paper 用收盘价成交，实盘却要求 VWAP — 口径不一
- Shadow 未用生产代码，而用 Notebook 简化版
- 小资金验证期过短，未经历波动/流动性 stress
- 不记录偏差，失效时无法定位是信号还是执行
- 回测好就跳级上大资金

## 要点回顾

- 模拟盘验证的是**系统与口径**，小资金验证的是**成本与容量**
- 偏差必须量化归档
- 下一章 [46 策略生产流程](46-production-workflow.md)讲每日生产流程
