# 18 单因子检验

> 所属模块：Part III 股票多因子研究

**IC 是体检单，不是出院证明——分组回测、成本与稳健性都过了，才谈得上因子入库。**

## 本节导读

因子构造完成后，进入 **单因子检验（Single-Factor Test）**：在不与其他 Alpha 因子混合的前提下，回答「这个因子是否系统性地预测未来收益？强度与稳定性如何？多空能否赚钱？扣成本后还有没有？」

本章是 Part III **实操枢纽**，覆盖：覆盖率检查 → IC / Rank IC → ICIR → 分组回测 → 多空 → 换手衰减 → 显著性 → Fama-MacBeth。附带 **可运行的 Python 示意代码**（合成数据可独立执行，替换为真实面板即可接入生产）。

## 学习目标

1. 完成因子分布与覆盖率的前置质检
2. 正确计算 Pearson IC、Spearman Rank IC 及 ICIR
3. 实施分位分组回测并解读单调性与多空收益
4. 理解 A 股多头可实现性与空头约束
5. 掌握 IC 序列显著性检验与 Fama-MacBeth 基本流程

---

## 18.1 覆盖率与分布检查

在报任何 IC 之前，先做 **数据质检**——否则 IC 异常无法定位是因子无效还是数据坏了。

### 检查项

| 项目 | 定义 | 健康参考（经验） |
| --- | --- | --- |
| 覆盖率 | 有因子值的股票数 / 股票池总数 | 财务因子 > 60%（随日期波动） |
| 横截面分布 | 均值≈0、偏度、峰度 | z-score 后 \|偏度\| < 1 较理想 |
| 时间稳定性 | 覆盖率、均值随时间漂移 | 无突变台阶（常因口径变更） |
| 极端值 | 缩尾后仍存在的 spike | 逐日排查数据源 |
| 行业分布 | 各行业因子均值 | 中性化前应有结构；中性化后应平坦 |

### 情景

某月 BP 因子覆盖率从 70% 跌至 40%——追查发现 Wind 字段切换未对齐。**未做 18.1 就直接比较前后 IC，结论无效。**

```python
import pandas as pd

def coverage_report(factor_panel: pd.DataFrame, universe_panel: pd.DataFrame) -> pd.DataFrame:
    """
    factor_panel: trade_date, stock_id, factor
    universe_panel: trade_date, stock_id （股票池）
    """
    merged = universe_panel.merge(factor_panel, on=["trade_date", "stock_id"], how="left")
    daily = merged.groupby("trade_date").agg(
        n_universe=("stock_id", "count"),
        n_factor=("factor", lambda s: s.notna().sum()),
    )
    daily["coverage"] = daily["n_factor"] / daily["n_universe"]
    return daily
```

---

## 18.2 IC 与 Rank IC

**IC（Information Coefficient）** 衡量 **因子值与未来收益** 在横截面上的相关强度——因子检验最常用指标。

### Pearson IC

交易日 $t$，因子 $f_{i,t}$ 与 **前瞻收益** $r_{i,t+1}$（或 $t \to t+h$ 累计）的 Pearson 相关：

$$
\mathrm{IC}_t = \mathrm{corr}(f_{i,t}, r_{i,t+1})
$$

### Spearman Rank IC

对因子与收益 **分别取秩** 后算 Pearson 相关——对极值、非线性单调关系更稳健：

$$
\mathrm{RankIC}_t = \mathrm{corr}\big(\mathrm{rank}(f_{i,t}), \mathrm{rank}(r_{i,t+1})\big)
$$

| 对比 | Pearson IC | Rank IC |
| --- | --- | --- |
| 对极值 | 敏感 | 稳健 |
| 非线性单调 | 可能低估 | 更贴合排序选股 |
| A 股实务 | 报告两者 | **Rank IC 为主** 较常见 |

### 截面计算要点

1. **同一 trade_date** 内合并 factor 与 forward_return，dropna。
2. forward_return 口径与 **调仓频率** 一致（月频常用下月收益）。
3. 样本过少（如 < 30 只）的日期 IC 噪声大，可标记或剔除。
4. **禁止** 用 $t$ 日因子预测含 $t$ 日已实现部分的收益（未来函数）。

```python
import numpy as np
import pandas as pd

def daily_ic(
    df: pd.DataFrame,
    factor_col: str = "factor",
    ret_col: str = "forward_ret",
    method: str = "pearson",
) -> pd.Series:
    """按日计算 IC。method='pearson' 或 'spearman'。"""
    def _one_day(g: pd.DataFrame) -> float:
        sub = g[[factor_col, ret_col]].dropna()
        if len(sub) < 30:
            return np.nan
        if method == "spearman":
            return sub[factor_col].rank().corr(sub[ret_col].rank())
        return sub[factor_col].corr(sub[ret_col])

    return df.groupby("trade_date", group_keys=False).apply(_one_day)
```

---

## 18.3 ICIR

**ICIR** = IC 均值 / IC 标准差，衡量 **预测力稳定性**（类似 Sharpe 之于收益）。

$$
\overline{\mathrm{IC}} = \frac{1}{T}\sum_{t=1}^{T} \mathrm{IC}_t, \quad
\mathrm{ICIR} = \frac{\overline{\mathrm{IC}}}{\sigma(\mathrm{IC})}
$$

### 年化 ICIR

月频调仓时，常近似：

$$
\mathrm{ICIR}_{\mathrm{annual}} \approx \mathrm{ICIR}_{\mathrm{monthly}} \times \sqrt{12}
$$

**勿与 IR（Information Ratio，组合超额/跟踪误差）混淆**——ICIR 是 **因子层** 指标，IR 是 **组合层** 指标。

| 指标 | 经验区间（月频 A 股，中性化后，**未年化** ICIR） | 解读 |
| --- | --- | --- |
| Mean IC | 0.02～0.06 | < 0.02 需审视经济逻辑与成本 |
| ICIR | 0.3～0.8 | 年化约 ×√12；表内 > 1 先查过拟合 |
| IC 胜率 | IC > 0 的月份占比 | < 50% 长期难支撑策略 |

```python
def ic_summary(ic_series: pd.Series, freq_per_year: int = 12) -> dict:
    ic = ic_series.dropna()
    mean_ic = ic.mean()
    std_ic = ic.std(ddof=1)
    icir = mean_ic / std_ic if std_ic > 0 else np.nan
    return {
        "mean_ic": mean_ic,
        "std_ic": std_ic,
        "icir": icir,
        "icir_annual": icir * np.sqrt(freq_per_year),
        "ic_win_rate": (ic > 0).mean(),
        "n_periods": len(ic),
    }
```

---

## 18.4 分组回测 Quantile Backtest

分组回测把 **排序选股** 可视化：因子是否带来 **单调** 的分组收益？

### 流程

1. 每个调仓日 $t$，对股票池内因子 **升序/降序** 排序（方向与因子定义一致）。
2. 分为 $G$ 组（常用 5 或 10 组），**组内等权** 或 **市值加权**。
3. 持有至下一调仓日，计算各组收益。
4. 检验 **单调性**：Group 1 → Group G 收益应递增（或递减）。

| 权重方式 | 优点 | 缺点 |
| --- | --- | --- |
| 等权 | 突出小票 Alpha，简单 | 与指数增强基准不一致 |
| 市值加权 | 接近可投资容量 | 大票稀释因子效果 |

### 多空收益

$$
LS_t = R_{\mathrm{Top},t} - R_{\mathrm{Bottom},t}
$$

**A 股**：纯空头个股难 → 报告 **Top 组绝对收益、Top−Bottom 理论多空、相对基准超额** 三轨；指数增强看 **Top 组 vs 基准** 更贴近实盘。

```python
def quantile_backtest(
    df: pd.DataFrame,
    factor_col: str = "factor",
    ret_col: str = "forward_ret",
    n_groups: int = 5,
    ascending: bool = True,
) -> pd.DataFrame:
    """
    返回每组各期收益 pivot 及 long_short 列。
    ascending=True：因子越大越好 → 组 G 为 Top。
    """
    records = []
    for dt, g in df.groupby("trade_date"):
        sub = g[[factor_col, ret_col]].dropna()
        if len(sub) < n_groups * 5:
            continue
        sub = sub.copy()
        sub["group"] = pd.qcut(
            sub[factor_col].rank(method="first"),
            n_groups,
            labels=False,
        ) + 1
        for grp, gg in sub.groupby("group"):
            records.append({"trade_date": dt, "group": grp, "ret": gg[ret_col].mean()})
    res = pd.DataFrame(records)
    pivot = res.pivot(index="trade_date", columns="group", values="ret")
    if ascending:
        pivot["long_short"] = pivot[n_groups] - pivot[1]
    else:
        pivot["long_short"] = pivot[1] - pivot[n_groups]
    return pivot
```

**单调性**：计算各组 **全样本平均收益**，画柱状图；非单调 → 检查极值、行业暴露或非线性（尝试 rank 因子）。

---

## 18.5 Long-Short Portfolio

| 组合 | 定义 | A 股可实现性 |
| --- | --- | --- |
| Long Top | 最高分组等权 | 高（指数增强超配） |
| Short Bottom | 最低分组空头 | 低（融券、工具限制） |
| Long-Short | Top − Bottom | 中性产品可用股指对冲近似 |
| 中性组合 | 行业/市值中性后的 LS | 需双重回归或优化 |

**多头可实现性检查清单**：

- Top 组平均市值、成交额是否满足产品最小流动性？
- 调仓日 **涨停买不到、跌停卖不出** 的比例？
- 组合 **权重上限**（如单票 2%）截断后收益变化？

空头约束下，**仍以多头超额 + 归因** 为主结论，LS 作理论参考。

---

## 18.6 换手率与衰减

因子 **自相关** 低 → 每期排序变化大 → **换手高 → 成本吃 Alpha**。

| 概念 | 定义 | 用途 |
| --- | --- | --- |
| 因子自相关 | $\mathrm{corr}(f_{i,t}, f_{i,t-1})$ | 越高换手越低 |
| Signal Decay | 不同 $h$ 的 IC($h$) | 选 holding period |
| 调仓频率 | 日/周/月 | 与 decay 匹配 |

**实践**：画 `IC(h)` 曲线，$h = 1, 5, 10, 20, 60$ 日——若 1 日 IC 高但 20 日骤降，适合短频且 **成本模型要严**。

```python
def factor_autocorr(factor_panel: pd.DataFrame, lag: int = 1) -> float:
    """个股时序自相关后截面平均（换手代理）；勿对全面板一次 corr。"""
    fp = factor_panel.sort_values(["stock_id", "trade_date"]).copy()
    fp["factor_lag"] = fp.groupby("stock_id")["factor"].shift(lag)
    ac = (
        fp.dropna(subset=["factor", "factor_lag"])
        .groupby("stock_id")
        .apply(lambda g: g["factor"].corr(g["factor_lag"]), include_groups=False)
    )
    return float(ac.mean())
```

---

## 18.7 统计显著性

IC 序列是 **时间序列**，月份间 **非独立**——简单 t-test 可能高估显著性。

### 常用方法

| 方法 | 用途 |
| --- | --- |
| IC 均值 t-test | 粗检；$t = \overline{\mathrm{IC}} / (\sigma / \sqrt{T})$ |
| Newey-West | 自相关稳健标准误 |
| Mann-Whitney | 两组收益分布比较（非参数） |
| Bootstrap | 小样本、复杂统计量 |
| 多重检验 | 同时测 50 个因子 → FDR 控制 |

**Newey-West 示意**（对 IC 序列回归常数项）：

```python
import statsmodels.api as sm

def ic_tstat_nw(ic_series: pd.Series, lags: int = 3) -> float:
    ic = ic_series.dropna()
    Y = ic.values
    X = np.ones(len(Y))
    model = sm.OLS(Y, X).fit(cov_type="HAC", cov_kwds={"maxlags": lags})
    return float(model.tvalues[0])
```

**多重假设**：若在本样本试了 20 个因子变体，至少 1 个「显著」的概率远高于 5%——见 [19 章](19-factor-robustness.md)。

---

## 18.8 横截面回归与 Fama-MacBeth

**Fama-MacBeth（1973）** 两步骤：

1. **每期横截面回归**：$r_{i,t+1} = \lambda_{0,t} + \lambda_{1,t} f_{i,t} + \text{controls} + \epsilon_{i,t}$
2. 对 $\lambda_{1,t}$ 序列求均值与 t 统计（Newey-West）

$\lambda_{1,t}$ 解释为 **因子风险溢价（premium）** 的时间序列。

| 对比 | IC | Fama-MacBeth |
| --- | --- | --- |
| 输出 | 相关 | 回归系数（可含控制变量） |
| 控制变量 | 需先中性化 | 回归中直接加入 |
| 直观性 | 高 | 中 |

```python
def fama_macbeth(
    df: pd.DataFrame,
    ret_col: str = "forward_ret",
    factor_col: str = "factor",
    control_cols: list | None = None,
) -> pd.Series:
    """返回每期回归的因子系数 lambda_t。"""
    control_cols = control_cols or []
    lambdas, dates = [], []
    for dt, g in df.groupby("trade_date"):
        cols = [ret_col, factor_col] + control_cols
        sub = g[cols].dropna()
        if len(sub) < 30:
            continue
        Y = sub[ret_col]
        X = sm.add_constant(sub[[factor_col] + control_cols])
        beta = sm.OLS(Y, X).fit().params[factor_col]
        lambdas.append(beta)
        dates.append(dt)
    return pd.Series(lambdas, index=dates)
```

---

## 完整可运行示例

以下脚本 **独立可运行**：生成合成面板 → 构造因子 → IC / ICIR → 分组回测 → Fama-MacBeth。

```python
"""
单因子检验完整示意 —— 合成数据可独立运行
依赖: pip install numpy pandas statsmodels
"""
import numpy as np
import pandas as pd
import statsmodels.api as sm

np.random.seed(42)

# ---------- 1. 合成面板 ----------
def build_synthetic_panel(n_stocks=200, n_months=60) -> pd.DataFrame:
    dates = pd.date_range("2019-01-31", periods=n_months, freq="ME")
    stocks = [f"S{i:04d}" for i in range(n_stocks)]
    rows = []
    for dt in dates:
        for s in stocks:
            rows.append({"trade_date": dt, "stock_id": s})
    df = pd.DataFrame(rows)
    # 行序为 date 外层、stock 内层 → 个股固定效应用 tile，勿用 repeat
    stock_effect = np.tile(np.random.randn(n_stocks), n_months)
    df["bp_raw"] = np.random.randn(len(df)) * 0.5 + stock_effect * 0.3
    df["industry"] = np.random.choice(["银行", "电子", "消费", "医药"], len(df))
    df["ln_cap"] = np.random.randn(len(df)) * 0.8 + 10
    df["forward_ret"] = (
        0.003 * df["bp_raw"]
        + 0.001 * np.random.randn(len(df))
        + stock_effect * 0.002
    )
    return df

# ---------- 2. 因子构造（简化版，见第 17 章） ----------
def winsorize_mad(s: pd.Series, n: float = 5.0) -> pd.Series:
    med = s.median()
    mad = (s - med).abs().median()
    scale = 1.4826 * mad if mad > 0 else 1.0
    return s.clip(med - n * scale, med + n * scale)

def zscore(s: pd.Series) -> pd.Series:
    std = s.std(ddof=0)
    return (s - s.mean()) / std if std > 0 else s * 0

def neutralize(factor, industry, ln_cap):
    d = pd.DataFrame({"y": factor, "ln_cap": ln_cap, "ind": industry}).dropna()
    X = pd.concat([pd.get_dummies(d["ind"], drop_first=True), d[["ln_cap"]]], axis=1)
    X = sm.add_constant(X)
    resid = sm.OLS(d["y"], X).fit().resid
    out = pd.Series(np.nan, index=factor.index)
    out.loc[resid.index] = resid.values
    return out

def construct_panel(df: pd.DataFrame) -> pd.DataFrame:
    parts = []
    for dt, g in df.groupby("trade_date"):
        raw = winsorize_mad(g["bp_raw"])
        f = zscore(raw)
        f = neutralize(f, g["industry"], g["ln_cap"])
        f = zscore(f.dropna())
        parts.append(pd.DataFrame({
            "trade_date": dt,
            "stock_id": g.loc[f.index, "stock_id"].values,
            "factor": f.values,
            "forward_ret": g.loc[f.index, "forward_ret"].values,
        }))
    return pd.concat(parts, ignore_index=True)

# ---------- 3. IC / ICIR（函数定义见上文 18.2–18.3） ----------
# daily_ic, ic_summary, quantile_backtest, fama_macbeth

# ---------- 4. 主流程 ----------
if __name__ == "__main__":
    raw = build_synthetic_panel()
    panel = construct_panel(raw)

    ic_pearson = daily_ic(panel, method="pearson")
    ic_spearman = daily_ic(panel, method="spearman")

    print("=== IC Summary (Pearson) ===")
    print(ic_summary(ic_pearson))
    print("=== IC Summary (Rank IC) ===")
    print(ic_summary(ic_spearman))

    qb = quantile_backtest(panel, n_groups=5, ascending=True)
    print("\n=== 五分组平均月收益 ===")
    print(qb.drop(columns="long_short").mean())
    ls = qb["long_short"]
    print(f"\n=== 多空 === LS mean={ls.mean():.4f}, Sharpe(m)={ls.mean()/ls.std():.2f}")

    fm = fama_macbeth(panel)
    print(f"\n=== Fama-MacBeth mean lambda === {fm.mean():.4f}, NW t={ic_tstat_nw(fm):.2f}")
```

将上文各函数块合并为单文件即可运行；替换 `build_synthetic_panel()` 为真实 `trade_date × stock_id` 面板即接入研究平台。

### 单因子检验报告模板

| 模块 | 内容 |
| --- | --- |
| 因子定义 | Spec 链接、中性化方式 |
| 覆盖率 | 时间序列图 |
| IC | Mean IC、Rank IC、ICIR、IC 累计曲线 |
| 分组 | 5/10 组柱状图、LS 净值 |
| 换手 | 因子自相关、估算年化换手 |
| 显著性 | NW t、Bootstrap 可选 |
| Fama-MacBeth | $\bar\lambda$ 与 t |
| 风险 | 行业/市值暴露（未中性化 vs 中性化） |

---

## 常见错误

- **同期收益当 forward**：用 $r_t$ 与 $f_t$ 算 IC → 虚假高相关。
- **未中性化就报 IC**：价值因子 IC 实为行业 bet。
- **IC 高但分组不单调**：非线性或极值驱动，Rank IC 与分组结论要交叉验证。
- **只看 ICIR 不看成本**：高 ICIR + 高换手 → 实盘 IR 可能为负。
- **样本太少**：仅 3 年月频 → IC 标准误大，结论 fragile。
- **多重检验不校正**：试了 30 个变体只报最显著那个。

## 要点回顾

- 18.1 质检先行：覆盖率、分布、行业结构。
- IC / Rank IC 度量横截面预测力；ICIR 度量稳定性；注意年化与 IR 区别。
- 分组回测验证单调性与多空；A 股重视 **多头可实现** 超额。
- 换手与 decay 决定成本可行性；显著性用 Newey-West；多因子筛选防 p-hacking。
- Fama-MacBeth 提供带控制变量的 premium 估计；与 IC 互补。
- 附完整 Python 流水线，替换真实面板即可接入研究平台。
