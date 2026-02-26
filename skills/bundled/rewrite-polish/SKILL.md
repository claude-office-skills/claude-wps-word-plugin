---
name: rewrite-polish
description: 对选中文本进行改写、润色、扩写、缩写、语气调整
tags: [rewrite, polish, edit]
context:
  keywords: [改写, 润色, 重写, 优化, 扩写, 缩写, 精简, 语气, 调整, 修改, 换一种说法, 更正式, 更口语, 更简洁, 更详细]
  hasSelection: true
modes: [agent, plan]
---

## 文本编辑操作规范

### 操作原则
1. **必须基于选区** — 改写/润色需要有选中的文本
2. **直接替换选区** — 用 `Selection.Text = "新文本"` 替换
3. **保持格式** — 替换文本时尽量保持原有的字体、大小、颜色

### 代码模板
```javascript
var sel = Application.Selection;
var originalText = sel.Text;
if (!originalText || originalText.trim().length === 0) {
  return "请先选中要修改的文本";
}

// 直接替换选区文本
sel.Text = "改写后的新文本";
return "已替换选区文本（原 " + originalText.length + " 字 → 新 " + sel.Text.length + " 字）";
```

### 操作类型与策略
| 操作 | 策略 |
|------|------|
| 润色 | 保持原意，优化措辞和句式 |
| 改写 | 保持核心语义，完全换表达方式 |
| 扩写 | 在原文基础上添加细节、例子、过渡句 |
| 缩写 | 删除冗余，提炼核心信息 |
| 语气调整 | 从口语→书面/书面→口语/中性→正式/正式→轻松 |

### 注意事项
- 改写后需保持原文的信息完整性
- 不要改变原文的段落结构（除非用户要求）
- 大段改写时分段处理，避免丢失格式信息
