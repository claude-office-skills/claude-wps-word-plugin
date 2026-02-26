---
name: translate-text
description: 多语言翻译（中英互译为主）
tags: [translate, language]
context:
  keywords: [翻译, 译成, 英译中, 中译英, translate, 日语, 韩语, 法语, 德语, 翻成]
  hasSelection: true
modes: [agent, plan, ask]
---

## 翻译规范

### 翻译策略
1. **有选区** → 翻译选区文本，替换选区
2. **无选区** → 翻译全文（需用户确认）
3. **保持格式** → 尽量保持原有的段落结构和格式

### Agent 模式代码模板
```javascript
var sel = Application.Selection;
var originalText = sel.Text;
if (!originalText || originalText.trim().length === 0) {
  return "请先选中要翻译的文本";
}
sel.Text = "翻译后的文本...";
return "已将选区文本翻译为目标语言";
```

### 翻译质量要求
- 准确传达原文意思，不遗漏信息
- 使用目标语言的自然表达方式
- 专业术语保持一致
- 数字、人名、品牌名根据惯例处理
- 中文翻译避免翻译腔
