# Connectors

## 工具引用约定

Skill 文件使用 `~~category` 作为占位符，指向用户配置的具体工具。例如 `~~web-search` 可能是 Tavily、Bing 或其他搜索 MCP 服务器。

插件是**工具无关**的——用类别描述工作流，而非绑定特定产品。`.mcp.json` 预配置了具体的 MCP 服务器，但同类别的任何 MCP 服务器均可替换。

## 当前连接器

| 类别 | 占位符 | 预配置服务器 | 其他可选 |
|------|--------|-------------|---------|
| 网络搜索 | `~~web-search` | Tavily | Bing, Google, Brave Search |
| 企业知识库 | `~~knowledge-base` | company-kb* | Notion, Confluence, Guru |

\* 占位符 — 需企业管理员配置 MCP URL
