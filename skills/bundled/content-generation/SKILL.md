---
name: content-generation
description: 根据用户指令生成文档内容（报告、邮件、大纲、文章段落）
tags: [generation, content, writing]
context:
  keywords: [生成, 写一段, 写一篇, 帮我写, 起草, 草拟, 创建, 大纲, 报告, 邮件, 通知, 公告, 总结, 摘要, 续写]
modes: [agent, plan]
---

## 内容生成规范

### 插入位置策略
1. **有选区时** → 在选区末尾插入（不替换原文），除非用户明确说「替换」
2. **无选区（光标处）** → 在光标当前位置插入
3. **生成新段落时** → 先插入换行符 `\r\n`

### 代码模式
```javascript
var doc = Application.ActiveDocument;
var sel = Application.Selection;

// 收缩选区到末尾再插入
sel.Collapse(0); // wdCollapseEnd
sel.TypeText("\r\n");
sel.TypeText("生成的段落内容...");
return "已插入内容";
```

### 大纲/多段落生成
- 标题段落使用 `Range.Style = "标题 1"` / `"标题 2"` 等
- 正文段落使用 `Range.Style = "正文"` 或默认
- 列表使用 `Range.ListFormat.ApplyBulletDefault()` 或 `ApplyNumberDefault()`

### 内容风格
- 默认使用正式、专业的中文书面语
- 如用户要求特定语气（轻松、幽默、学术），按要求调整
- 长内容分段落，每段 2-4 句为宜
- 报告类内容需要标题层级结构
