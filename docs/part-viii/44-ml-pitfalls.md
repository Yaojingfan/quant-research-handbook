# 44 机器学习常见陷阱

> 所属模块：Part VIII 机器学习在多因子研究中的应用

> **ML 把过拟合包装得更漂亮：Loss 曲线收敛，IC 曲线才说真话。**

## 本节导读

验证集 IC 0.07、测试集 IC 0.01 — 经典过拟合。更隐蔽的是：测试集 IC 0.05 但组合收益为负，因为**高 IC 集中在不可交易的 micro-cap**。本章列出 ML 量化高频踩坑项。

## 学习目标

1. 识别 Data Leakage、过拟合、分布漂移等 ML 特有风险
2. 理解"高准确率 ≠ 高收益"的结构性原因
3. 正确解读特征重要性

---

## 44.1 Data Leakage

| 泄漏类型 | 示例 |
| --- | --- |
| 目标泄漏 | 特征含 $r_{t+1}$ 或其变换 |
| 时间泄漏 | 用 T 日收盘后信息预测 T 日 |
| 统计泄漏 | 全样本标准化、PCA 全样本 fit |
| 分组泄漏 | 随机 split 使同股未来进 train |
| 标签泄漏 | 用 revised 财报而非 PIT |

**检测**：shift 特征一期后 IC 应大致相当；若暴跌则疑泄漏。

---

## 44.2 Overfitting

**信号**：

- Train IC ≫ Test IC
- 参数微变结果剧变
- 特征数接近样本数

**对策**：

- 正则化、浅树、少特征
- Purged CV + 独立 Test
- 简单模型优先
- 报告 **deflated Sharpe**（按试验次数下调的 Sharpe，进阶）或多重检验校正；避免「试了 100 组只报最好的」

---

## 44.3 非独立同分布（Non-IID）

金融数据违反 IID：

- 波动聚类
- 制度切换（2015 杠杆牛、2017 价值年、2021 赛道）
- 因子结构突变

**对策**：滚动训练、 regime 分段检验、降低模型复杂度。

---

## 44.4 类别不平衡

涨跌分类中，极端行情月份标签分布偏移。

- 不用 accuracy 作为主要指标
- 用 AUC、IC、top-bottom spread
- `scale_pos_weight` 或分层采样

---

## 44.5 模型漂移

上线后 IC 缓慢下滑：

- 定期 OOS 监控（30 章）
- 固定 retrain 日历 vs 触发式 retrain
- 对比 **population stability index (PSI)** 监控特征分布

---

## 44.6 高预测准确率不等于高收益

```text
场景：模型准确预测 55% 个股方向，但：
  - 正确的是小票，错误的是大票 → 加权收益差
  - 预测对但涨跌幅小，预测错但跌深 → P&L 不对称
  - 换手过高，成本吃掉 edge
```

**结论**：优化 **ranking metric** 与 **portfolio P&L** 对齐，而非 classification accuracy.

---

## 44.7 特征重要性误读

| 误区 | 说明 |
| --- | --- |
| 单变量 importance 高 = 因果 | 可能是共线性代理 |
| SHAP 稳定 = 永远有效 | 非平稳下会变 |
| 剔除低 importance 特征一定安全 | 交互项可能依赖"低 importance"特征 |

**做法**：重要性 + 经济逻辑 + 滚动稳定性 三重验证。

---

## 陷阱检查清单

- [ ] 特征全部 PIT，标准化按日截面
- [ ] Train/Valid/Test 严格时间顺序
- [ ] Test 集只评估一次
- [ ] 有线性 baseline 对照
- [ ] 组合层含成本、涨跌停、容量
- [ ] 特征重要性跨子样本稳定
- [ ] Shadow / 模拟盘验证通过

---

## 常见错误

- 把 Kaggle 套路原封不动搬到 A 股截面
- 泄漏检测只做 eyeball，不做 shift 测试
- 深度模型无 regularization / dropout
- 向 PM 汇报 accuracy 而非 IC/IR
- 认为 retrain 能解决所有 drift（可能是逻辑失效）

## 要点回顾

- ML 陷阱 = 通用回测陷阱 + 泄漏 + IID 假设破裂
- 最终裁判是**样本外组合净收益**，不是 loss 或 accuracy
- Part VIII 完结；新人请回到 Part III–V 巩固主线
