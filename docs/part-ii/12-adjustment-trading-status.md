# 12 复权、停牌与交易状态

> 所属模块：Part II 数据是量化研究的起点

**不会处理涨跌停与停牌，回测里的成交都是幻觉。**

## 本节导读

情景：某动量因子 2015 年回测年化 40%，上线后第一年超额大幅衰减。排查发现：除权日未复权导致虚假「暴跌」被当成反转信号；涨停日按收盘价全仓买入；ST 过滤用的是「今日 ST 名单」而非历史状态——三重乐观偏差叠加，回测超额中大量不可交易成分。

价格跳变不一定是 Alpha，可能是分红送配；信号看得到，涨停买不进。本章澄清前复权/后复权用途，以及停牌、涨跌停、ST/退市状态如何进入股票池与回测成交规则——这是 A 股中低频多因子 **可交易性（Tradability）** 的基石。

## 学习目标

1. 解释除权除息与复权的研究含义，正确选择复权口径
2. 设计停牌与涨跌停的成交假设，避免乐观偏差
3. 用历史状态过滤宇宙，降低幸存者偏差
4. 将状态字段纳入数据质量监控

---

## 12.1 除权除息与价格跳变

### 为什么会跳变

A 股上市公司发生 **分红、送股、转增、配股、拆缩股** 等事件时，交易所会在除权除息日（Ex-date）调整基准价，未复权收盘价出现 **人为跳变**——与基本面无关，但会被动量、波动率、反转等因子误读为真实涨跌。

| 事件类型 | 对价格的影响 | 研究注意 |
| --- | --- | --- |
| 现金分红 | 除息日价格下调 | 影响 EP、股息率 |
| 送股 / 转增 | 除权日价格按比例下调 | 股本、EPS 同步变 |
| 配股 | 除权价复杂调整 | 稀释效应 |
| 拆缩股 | 罕见，按比例调整 | 与送股类似 |

### 除权除息参考价（简化）

除息后理论开盘价参考（实际还受集合竞价影响）：

$$P_{\text{ex}} = \frac{P_{\text{pre}} - D}{1 + S}$$

其中 $P_{\text{pre}}$ 为前收盘价，$D$ 为每股现金分红，$S$ 为送股比例（每 1 股送 $S$ 股则 $S$ 为小数形式）。供应商通常直接给出 **复权因子（Adjustment Factor）**，不必手算。

### 情景：未复权的动量灾难

某 20 日动量用未复权收盘价：除息日股价「跌」5%，实际股东财富未变——因子把除息当成暴跌，产生大量虚假反转/动量信号。**凡涉及跨日价格比较的收益类因子，一律用后复权价或复权因子调整。**

### 复权因子

供应商每日提供累积复权因子 $F_t$。后复权价：

$$P_t^{\text{adj}} = P_t^{\text{raw}} \times F_t$$

相邻两日后复权价的收益率才是 **经济意义上连续** 的持有收益（忽略分红再投资细节时）。

```python
import pandas as pd
import numpy as np

# 后复权收盘价与收益率
df = df.sort_values(["symbol", "trade_date"])
df["close_adj"] = df["close"] * df["adj_factor"]
df["ret_adj"] = df.groupby("symbol")["close_adj"].pct_change()
```

---

## 12.2 前复权与后复权

| 类型 | 定义 | 特点 | 典型用途 |
| --- | --- | --- | --- |
| 未复权 Raw | 真实成交附近价格 | 与涨跌停价一致 | 可交易性判断、下单 |
| 后复权 Backward Adj | 以历史某日为基准向前累乘因子 | 历史价低、当前价高 | **长区间收益、动量、波动** |
| 前复权 Forward Adj | 以最新价为基准回推历史 | 当前价=真实价 | 看盘、部分技术分析 |

### 研究中的黄金法则

!!! tip
    **用复权价算收益，用未复权价 + 状态字段判断可交易性**——这是 A 股多因子研究的常见稳健组合。

| 任务 | 推荐口径 |
| --- | --- |
| 20/60/120 日动量 | 后复权 close |
| 日收益率、波动率 | 后复权 close |
| 市值（price × shares） | 未复权 close × 当日股本 |
| 是否涨停 | 未复权 close vs limit_up |
| 分组回测成交价 | 未复权 close（+ 滑点） |

### 前复权 vs 后复权数值差异

同一股票两种复权方式，在**同一冻结快照**下日收益率通常一致（排序亦同）；差异主要在价格水平。注意：**前复权历史价会随新除权事件重算**，回测应锁定复权因子版本，勿混用不同时点下载的前复权序列。切勿混用不同复权方式的绝对价格做截面比较——应比较收益率或标准化后的因子。

供应商复权因子定义可能是「乘」或「除」到原价（Wind / 聚宽等不一致），以团队 Data Dictionary 为准。

### 代码：统一复权接口

```python
def compute_returns(price_df: pd.DataFrame, price_col="close_adj") -> pd.DataFrame:
    """price_col 应为后复权收盘价"""
    out = price_df.sort_values(["symbol", "trade_date"]).copy()
    out["ret_1d"] = out.groupby("symbol")[price_col].pct_change()
    return out

def check_adj_continuity(df: pd.DataFrame, symbol: str, window=5) -> pd.DataFrame:
    """除权日前后复权收益率应连续；未复权会出现 spike"""
    sub = df[df["symbol"] == symbol].tail(window * 2)
    sub = sub.assign(
        ret_raw=sub["close"].pct_change(),
        ret_adj=sub["close_adj"].pct_change(),
    )
    return sub[["trade_date", "ret_raw", "ret_adj"]]
```

---

## 12.3 停牌处理

### A 股停牌类型（研究视角）

| 类型 | 特征 | 因子计算 | 组合调仓 |
| --- | --- | --- | --- |
| 临时停牌 | 重大事项，数小时～数日 | 价格无效，收益 NaN | 无法买卖 |
| 长期停牌 | 重组等，数月 | 剔除或单独标记 | 持仓冻结 |
| 熔断（历史） | 指数级，2016 曾实施 | 全市场规则 | 特殊处理 |

### 清洗与因子层规则

1. **停牌日 `ret = NaN`**，禁止填 0
2. 估值类因子若需价格，可用 **停牌前最后有效价** 并标记 `price_stale_flag`——不可用于动量
3. 截面标准化 / 中性化时，停牌股 **是否纳入截面** 须在 Spec 写明；建议与可交易宇宙一致而剔除

### 回测成交规则

| 假设 | 描述 | 适用 |
| --- | --- | --- |
| 严格 | 停牌日任何订单失败 | 默认推荐 |
| 延迟执行 | 复牌首日按开盘价/VWAP 成交 | 需与产品约定 |
| 乐观（禁止） | 停牌日按最后价成交 | 严重高估流动性 |

```python
def apply_suspension_constraint(orders: pd.DataFrame, status: pd.DataFrame) -> pd.DataFrame:
    """
    orders: trade_date, symbol, side, weight
    status: trade_date, symbol, is_suspended
    """
    merged = orders.merge(status, on=["trade_date", "symbol"], how="left")
    merged["filled"] = ~merged["is_suspended"].fillna(True)
    merged.loc[~merged["filled"], "weight"] = 0.0
    return merged
```

### 情景：长期停牌股的幸存者偏差

若回测直接删除长期停牌股，会遗漏「停牌后退市」的亏损样本。正确做法：**在研究宇宙内保留**，直至退市或剔除规则触发，收益按 0 或退市价结算（见 12.5）。

---

## 12.4 涨跌停处理

### A 股涨跌幅制度（2024 口径摘要）

| 板块 / 状态 | 涨跌幅限制 | 备注 |
| --- | --- | --- |
| 主板 | ±10% | ST 为 ±5% |
| 创业板 / 科创板 | ±20% | 注册制后 |
| 北交所 | ±30% | |
| 新股上市 | 首日特殊 | 无涨跌幅或放宽 |
| ST / *ST | ±5% | 需历史 ST 标志 |

涨跌停价由交易所按 **未复权前收盘价** 计算；供应商提供 `limit_up` / `limit_down` 字段时，以字段为准。

### 可成交性判断

| 情况 | 回测应如何 | 实务 |
| --- | --- | --- |
| 涨停 + 买入信号 | 订单失败或部分成交 | 一字板几乎 0 量 |
| 跌停 + 卖出信号 | 无法减仓 | 被动持有可能放大回撤 |
| 触板未封死 | 部分成交 | 需成交量约束 |
| 集合竞价涨停 | 开盘无法买入 | 信号日 T，成交 T+1 开盘 |

```python
def tradability_mask(df: pd.DataFrame, side: str) -> pd.Series:
    """
    side: 'buy' | 'sell'
    假设 close 为未复权收盘价，已 merge limit_up/limit_down
    """
    at_limit_up = df["close"] >= df["limit_up"] - 1e-4
    at_limit_down = df["close"] <= df["limit_down"] + 1e-4
    if side == "buy":
        return ~at_limit_up
    return ~at_limit_down
```

### 情景：动量策略的涨停陷阱

动量因子选出昨日强势股，今日普遍涨停——回测若按收盘价买入，等于假设能以涨停价无限量成交。真实产品中这部分 alpha 大量不可实现。**分组回测应报告「可成交子样本」与「全样本」两套结果。**

### 流动性与一字板

一字涨停日成交量极低，即使「未封死」也可能冲击成本极高。进阶做法：加入 **成交额 / 换手率阈值**，或按 `min(volume, target_volume)` 做容量约束（Part V 展开）。

---

## 12.5 ST、退市与上市状态

### 必须用历史状态

股票池过滤必须用 **当日及历史时点** 的状态字段，不能用今天的 ST 列表回看五年。

| 错误 | 后果 |
| --- | --- |
| 用 2024 年 ST 名单过滤 2018 | 2018 年已是 ST 的股票被误删或误留 |
| 剔除所有历史 ST | 遗漏 ST 摘帽前后的 alpha，且引入选择偏差 |
| 忽略退市股 | **幸存者偏差**，回测超额系统性高估 |

### 状态字段清单

| 字段 | 含义 | 用途 |
| --- | --- | --- |
| list_date | 上市日期 | 新股过滤（如上市 < 60 日） |
| delist_date | 退市日期 | 退市结算 |
| is_st / st_flag | ST 状态 | 风控、涨跌幅 5% |
| is_star_st | 科创板 ST | 20% 限制下的 ST |
| trade_status | 正常/停牌/退市整理 | 可交易性 |

### 退市与退市整理期

A 股强制退市股票进入 **退市整理期**（曾 30 交易日，规则随改革调整），之后转场外。回测中：

- 退市整理期：通常 **禁止新开仓**，允许平仓
- 退市后：按最后可交易价或 0 结算剩余持仓——须在 Spec 固定，否则不同团队结果不可比

```python
def historical_universe(panel: pd.DataFrame, as_of_rules: dict) -> pd.DataFrame:
    """
    as_of_rules 示例:
      min_list_days: 60
      exclude_st: True
      exclude_suspended: False  # 仅标记，不剔除
    """
    df = panel.copy()
    df["days_since_list"] = (df["trade_date"] - df["list_date"]).dt.days
    mask = df["days_since_list"] >= as_of_rules.get("min_list_days", 0)
    if as_of_rules.get("exclude_st", False):
        mask &= ~df["st_flag"].fillna(False)
    # 退市后：保留至 delist_date，供收益结算
    mask &= df["trade_date"] <= df["delist_date"].fillna(pd.Timestamp.max)
    return df[mask]
```

### 情景：新股与次新股

注册制下新股上市前 5 日无涨跌幅限制，波动极端。多数多因子产品 **剔除上市未满 60～120 日** 股票——规则写在 Universe Spec，而非事后根据 IC 调整。

---

## 常见错误

- 全程未复权算五年动量——除权除息制造虚假信号
- 涨停日按收盘价买入成功——乐观偏差最大的来源之一
- 用最新 ST 列表过滤历史——前视偏差
- 删除所有退市样本——幸存者偏差
- 复权价与涨跌停价混比——口径不一致
- 停牌日 forward-fill 价格后算动量——虚假平稳

## 要点回顾

- 除权除息造成未复权跳变；**后复权价** 用于跨日收益与动量
- **未复权价 + limit_up/down** 用于涨跌停与成交判断
- 停牌：收益 NaN，订单失败，长期停牌不可简单删除
- 涨跌停必须进入成交规则；一字板流动性 ≈ 0
- ST/退市/上市状态必须 **按历史时点** 过滤，保留退市样本

## 下一章

[13 时间对齐与未来函数](13-time-alignment.md)
