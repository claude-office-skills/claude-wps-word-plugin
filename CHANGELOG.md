# Changelog

All notable changes to Claude for WPS Word will be documented in this file.

## [1.0.0] - 2026-02-26

### Added
- **初始版本**：基于 Excel/PPT 插件架构开发
- **四层架构**：WPS Writer Host → React TaskPane → Express Proxy (3003) → Claude CLI
- **WPS 加载项注册**：publish.xml (type=wps) + authaddin.json 独立注册
- **Ribbon 集成**：Claude AI 标签页，包含"打开 Claude"和"打开 JS 调试器"按钮
- **上下文同步**：定时采集文档标题、段落文本、选区内容推送到 Proxy
- **代码执行桥**：前端提交 → Proxy 队列 → Host 轮询执行 → 结果回传
- **流式响应**：SSE 流式输出 + Markdown 渲染
- **3 种交互模式**：Agent / Plan / Ask
- **端口隔离**：Proxy 3003, Vite 5175，不影响 Excel (3001) 和 PPT (3002)
