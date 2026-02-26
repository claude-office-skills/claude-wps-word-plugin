---
name: web-search
type: connector
description: 实时网络搜索 — 获取最新信息和数据
version: 1.0.0
mcp: tavily-search
modes: [agent, plan, ask]
context:
  keywords: [搜索, 查询, 最新, 新闻, 今天, web, search, 实时, 当前]
---

## 网络搜索连接器

当用户询问实时或最新的信息时，通过网络搜索获取数据。

### 使用场景

- 用户询问"最新的..."、"今天的..."等实时信息
- 需要市场数据、股票价格、汇率等实时数据
- 查询公司信息、行业数据等外部知识

### 行为

将搜索结果整理后融入回答，注明数据来源。
