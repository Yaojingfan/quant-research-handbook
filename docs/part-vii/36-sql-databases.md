# 36 SQL 与研究数据库

> 所属模块：Part VII 研究工程化

> **因子存在 CSV 里可以，存在数据库里才能被全团队查询、审计与增量更新。**

## 本节导读

研究员问："2020 年所有中证 500 成分股的 ROE 因子与次月收益" — 若每次从 Parquet 全量扫描，协作成本极高。SQL 是量化数据层的通用查询语言，本章覆盖研究场景下的核心语法与模式。

## 学习目标

1. 掌握 SELECT / JOIN / GROUP BY / 窗口函数
2. 能编写增量更新与 Point-in-time 查询
3. 理解索引对研究查询性能的影响

---

## 36.1 基础查询
```sql
-- 错误示范：当前成分表不可用于历史回测（幸存者偏差）
-- SELECT ... FROM index_member WHERE index_code = '000905'

-- 推荐：历史成分 + 在池区间
SELECT b.symbol, b.trade_date, b.close, b.volume
FROM daily_bar b
INNER JOIN index_member_hist m
  ON b.symbol = m.symbol
 AND m.index_code = '000905'
 AND b.trade_date >= m.in_date
 AND (m.out_date IS NULL OR b.trade_date < m.out_date)
WHERE b.trade_date BETWEEN '2020-01-01' AND '2020-12-31'
ORDER BY b.trade_date, b.symbol;
```

**习惯**：显式列名，避免 `SELECT *` 在大表上拖垮 IO；成分过滤必须 Point-in-Time。

---

## 36.2 JOIN
| 类型 | 用途 |
| --- | --- |
| INNER | 两表都有记录 |
| LEFT | 保留左表（如行情），右表可缺失（如因子） |
| ASOF | 时间对齐（DuckDB / 部分引擎支持） |

Point-in-time 成分股：

```sql
SELECT b.symbol, b.trade_date, b.close
FROM daily_bar b
INNER JOIN index_member_hist m
  ON b.symbol = m.symbol
 AND b.trade_date >= m.in_date
 AND (m.out_date IS NULL OR b.trade_date < m.out_date)
 AND m.index_code = '000300';
```

---

## 36.3 GROUP BY
截面因子统计：

```sql
SELECT trade_date,
       AVG(pe_ttm) AS avg_pe,
       COUNT(*)    AS coverage
FROM factor_value
WHERE pe_ttm IS NOT NULL
GROUP BY trade_date;
```

**注意**：`WHERE` 过滤行；`HAVING` 过滤组（如 `HAVING COUNT(*) > 100`）。

---

## 36.4 窗口函数
```sql
SELECT symbol, trade_date, close,
       AVG(close) OVER (
         PARTITION BY symbol
         ORDER BY trade_date
         ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
       ) AS ma20
FROM daily_bar;
```

| 函数 | 用途 |
| --- | --- |
| `ROW_NUMBER()` | 去重、取最新一条 |
| `LAG/LEAD` | 滞后/超前收益 |
| `RANK()` | 截面排序（需 PARTITION BY trade_date） |

---

## 36.5 增量更新
```sql
-- 幂等：先删后插 或 MERGE
DELETE FROM factor_value WHERE trade_date = :dt;
INSERT INTO factor_value SELECT ... FROM staging WHERE trade_date = :dt;
```

**原则**：主键 `(trade_date, symbol, factor_name)`；staging 表校验后再入主表。

---

## 36.6 数据库索引
```sql
CREATE INDEX idx_bar_date_sym ON daily_bar (trade_date, symbol);
CREATE INDEX idx_factor_date ON factor_value (trade_date);
```

| 查询模式 | 索引建议 |
| --- | --- |
| 按日期范围扫全市场 | `(trade_date, symbol)` |
| 按单票历史 | `(symbol, trade_date)` |
| 因子宽表 | `(trade_date, factor_id)` |

---

## 36.7 研究数据查询案例
**任务**：计算每月末 ROE 因子 Rank IC 所需底层数据。

> **注意**：下例用自然月 `DATE_TRUNC` 仅作 SQL 语法示意；生产应用**交易日历**取每月最后一个交易日，勿用自然月末。

```sql
WITH monthly AS (
  SELECT symbol,
         DATE_TRUNC('month', trade_date) AS month,
         LAST_VALUE(close) OVER (
           PARTITION BY symbol, DATE_TRUNC('month', trade_date)
           ORDER BY trade_date
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
         ) AS month_end_close
  FROM daily_bar
),
fwd_ret AS (
  SELECT symbol, month,
         LEAD(month_end_close) OVER (PARTITION BY symbol ORDER BY month)
           / month_end_close - 1 AS fwd_ret
  FROM monthly
)
SELECT f.month, f.symbol, f.roe, r.fwd_ret
FROM factor_roe f
JOIN fwd_ret r ON f.symbol = r.symbol AND f.month = r.month;
```

复杂 IC 聚合可在 SQL 取数后交 Python 完成。

---

## 常见错误

- JOIN 条件遗漏日期，产生笛卡尔积
- 用当前成分股表 join 历史收益 — 幸存者偏差
- 无索引在大表上反复全表扫描
- 在 SQL 里硬编码未来日期
- 浮点字段不做 NULL 处理

## 要点回顾

- SQL 是团队共享的数据接口
- 窗口函数 + 历史成分表 = PIT 查询基础
- 下一章 [37 研究工程化](37-research-engineering.md)讲研究代码如何工程化
