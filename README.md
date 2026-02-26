# Claude for WPS Word

WPS Office 文字处理 AI 助手——通过自然语言对话编写、润色和格式化文档，由 Claude API 驱动。

![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![Platform](https://img.shields.io/badge/platform-WPS%20Office-red)

## 功能特性

- **自然语言文档编辑**：描述需求即可自动生成、改写、润色文档内容
- **上下文感知**：自动读取当前文档标题、段落文本、选区内容
- **三种交互模式**：Agent（自动执行）/ Plan（步骤规划）/ Ask（只读分析）
- **流式响应**：SSE 流式输出 + Markdown 渲染 + 代码块语法高亮
- **代码执行桥**：生成的 Writer JS 代码在 WPS 中执行，支持结果回传
- **会话历史**：自动保存对话记录，支持多会话切换和恢复
- **模型选择**：Sonnet 4.6 / Opus 4.6 / Haiku 4.5

## 架构概览

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  WPS Word   │◄───►│  Proxy Server    │◄───►│  React TaskPane │
│  Plugin Host│     │  (Express :3003) │     │  (Vite :5175)   │
│  main.js    │     │  proxy-server.js │     │  src/App.tsx     │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                     │                        │
       │ WPS Writer API      │ Claude CLI (SSE)       │ 用户对话
       │ Document/Paragraph  │ Skill/Mode 匹配       │ Markdown 渲染
       │ 代码执行            │ Session 持久化         │ 代码高亮+执行
       │                     │ MCP Connectors         │ 模式切换
```

## 快速开始

### 前置条件

- **Node.js** >= 18
- **Claude CLI**：`npm install -g @anthropic-ai/claude-code && claude login`
- **WPS Office**（macOS 或 Windows）

### 1. 克隆并配置

```bash
git clone https://github.com/claude-office-skills/claude-wps-word-plugin.git
cd claude-wps-word-plugin
cp .env.example .env
```

### 2. 安装依赖 & 启动

```bash
npm install
npm run start
```

### 3. 注册 WPS 加载项

```bash
chmod +x install-to-wps.sh
./install-to-wps.sh
```

重启 WPS Office，打开文档 → 点击顶部 **Claude AI** 标签 → **打开 Claude**。

## 项目结构

```
├── AGENTS.md              # AI 行为准则（Word 特化）
├── CHANGELOG.md           # 版本日志
├── proxy-server.js        # Express 代理服务器 (:3003)
├── wps-addon/
│   ├── main.js            # WPS Host（文档上下文采集 + 代码执行桥）
│   └── ribbon.xml         # Ribbon 按钮定义
├── src/
│   ├── App.tsx            # 主界面（Word 适配版）
│   ├── api/
│   │   ├── claudeClient.ts   # Claude API + Word 上下文
│   │   ├── wpsAdapter.ts     # Word 上下文适配层
│   │   └── sessionStore.ts   # 会话持久化
│   └── components/        # UI 组件
├── skills/                # Word 内置技能
├── commands/              # 快捷指令
└── install-to-wps.sh     # WPS 加载项注册脚本
```

## 端口分配

| 插件 | Proxy 端口 | Vite Dev 端口 |
|------|-----------|-------------|
| Excel | 3001 | 5173 |
| PPT | 3002 | 5174 |
| **Word** | **3003** | **5175** |

## 相关项目

| 项目 | 说明 |
|------|------|
| [claude-wps-plugin](https://github.com/claude-office-skills/claude-wps-plugin) | Claude for WPS Excel |
| [claude-wps-ppt-plugin](https://github.com/claude-office-skills/claude-wps-ppt-plugin) | Claude for WPS PowerPoint |

## License

MIT
