# C Python 与 SQL 快速参考

> 研究现场速查。详细说明见 Part VII 36–40 章。

---

## Pandas 常用操作

### 读取与写入

```python
df = pd.read_parquet("data/factor.parquet")
df.to_parquet("output/result.parquet", index=False)
```

### Merge / Join

```python
# 因子与收益对齐 — 必须指定键
merged = factor_df.merge(
    ret_df,
    on=["trade_date", "symbol"],
    how="inner",
    validate="many_to_one",
)
```

### GroupBy（截面统计）

```python
# 截面 z-score
df["z"] = df.groupby("trade_date")["raw"].transform(
    lambda s: (s - s.mean()) / s.std()
)

# 截面 rank 分位
df["pct"] = df.groupby("trade_date")["raw"].rank(pct=True)
```

### Rolling（时序窗口）

```python
# 每只股票 20 日动量 — 先排序再 groupby
df = df.sort_values(["symbol", "trade_date"])
df["mom20"] = df.groupby("symbol")["close"].pct_change(20)
```

### Rank

```python
# 每日因子排序
df["rank"] = df.groupby("trade_date")["factor"].rank(method="average")
```

### Shift（滞后，防未来函数）

```python
df["ret_fwd1"] = df.groupby("symbol")["close"].shift(-1) / df["close"] - 1
df["factor_lag1"] = df.groupby("symbol")["factor"].shift(1)
```

### 缺失与去极值

```python
# 分位数缩尾
lo, hi = s.quantile([0.01, 0.99])
s.clip(lo, hi)

# 按日缩尾
df["w"] = df.groupby("trade_date")["raw"].transform(
    lambda s: s.clip(*s.quantile([0.01, 0.99]))
)
```

---

## SQL 速查

### 聚合

```sql
SELECT trade_date, AVG(pe) AS avg_pe, COUNT(*) AS n
FROM factor
GROUP BY trade_date
HAVING COUNT(*) > 100;
```

### JOIN（PIT 成分）

```sql
SELECT b.*
FROM bar b
JOIN index_member_hist m
  ON b.symbol = m.symbol
 AND b.trade_date >= m.in_date
 AND b.trade_date <  m.out_date
WHERE m.index_code = '000905';
```

### 窗口函数

```sql
SELECT symbol, trade_date, close,
       LAG(close, 1) OVER (PARTITION BY symbol ORDER BY trade_date) AS prev_close,
       RANK() OVER (PARTITION BY trade_date ORDER BY factor DESC) AS cs_rank
FROM merged;
```

### 日期处理

```sql
-- PostgreSQL 示例
SELECT DATE_TRUNC('month', trade_date) AS month, ...
WHERE trade_date >= '2020-01-01';

-- 月末最后一个交易日：依引擎用 ROW_NUMBER 或 LAST_VALUE
```

### 增量更新模板

```sql
DELETE FROM factor_store WHERE trade_date = :dt;
INSERT INTO factor_store
SELECT * FROM staging_factor WHERE trade_date = :dt;
```

---

## 研究 Snippet：Rank IC

```python
def rank_ic_by_date(df, factor_col, ret_col):
    # include_groups=False 需 pandas≥2.2；旧版可改为先 groupby 再手动 drop 分组列
    return df.groupby("trade_date").apply(
        lambda x: x[factor_col].rank().corr(x[ret_col].rank()),
        include_groups=False,
    )
```

---

## 研究 Snippet：Fama-MacBeth（简化）

```python
import statsmodels.api as sm

def fama_macbeth(panel, y_col, x_cols):
    betas = []
    for dt, g in panel.groupby("trade_date"):
        X = sm.add_constant(g[x_cols])
        res = sm.OLS(g[y_col], X, missing="drop").fit()
        betas.append(res.params)
    return pd.DataFrame(betas).mean(), pd.DataFrame(betas)
```

---

## 常见坑速记

| 操作 | 坑 |
| --- | --- |
| `merge` | 未指定键 → 重复行 |
| `groupby` | 忘记 `sort_values` 就 `shift` |
| `rank` | 未按 trade_date 分组 → 全样本 rank |
| SQL JOIN | 用当前成分表做历史查询 |
| `read_csv` | 未指定 `dtype`，symbol 变 float |
