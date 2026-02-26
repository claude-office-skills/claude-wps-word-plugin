---
name: proofread-grammar
description: 语法检查、拼写纠错、标点规范
tags: [proofread, grammar, spell]
context:
  keywords: [校对, 检查, 拼写, 语法, 纠错, 标点, 错别字, 修改错误, 审校, 病句]
  hasSelection: true
modes: [agent, plan, ask]
---

## 校对规范

### Ask 模式（默认推荐）
仅分析文本问题，不执行修改：
- 列出发现的错误，标明位置和修改建议
- 分类：错别字 / 语法错误 / 标点问题 / 用词不当
- 给出修改前后的对比

### Agent 模式
直接在文档中修复错误：
```javascript
var sel = Application.Selection;
var text = sel.Text;
// 修复后替换
sel.Text = "修复后的文本";
return "已修复 N 处错误";
```

### 检查要点
1. **错别字** — 同音字、形近字
2. **语法** — 主谓搭配、时态一致、量词使用
3. **标点** — 中英文标点混用、逗号/句号使用
4. **格式** — 全角/半角、空格使用
5. **一致性** — 专业术语统一、人名/地名一致
