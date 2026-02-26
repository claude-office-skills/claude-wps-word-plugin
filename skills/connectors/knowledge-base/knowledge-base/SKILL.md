---
name: knowledge-base
type: connector
description: 企业知识库检索 — 公司规范、流程、制度查询
version: 1.0.0
mcp: company-kb
modes: [agent, plan, ask]
context:
  keywords: [规范, 标准, 流程, 制度, 政策, 手册, 文档, 知识库]
  always: false
---

## 企业知识库连接器

当用户提问公司内部规范、流程、制度相关问题时，从企业知识库检索相关文档。

### 使用场景

- 查询公司财务报表模板规范
- 了解数据处理标准流程
- 检索行业合规要求

### 配置

企业管理员需在 .mcp.json 中配置 company-kb 服务器地址。
