---
name: code-rules
description: 代码生成规范与安全约束
tags: [code, rules, safety]
context:
  always: true
modes: [agent, plan]
---

## 代码生成规范

### 必须遵守
1. 只使用 `var` 声明变量
2. 不使用箭头函数 `=>`
3. 不使用 `let`、`const`、`class`、模板字符串
4. 代码最后一行必须返回字符串结果
5. 代码总长度不超过 3000 字符

### 安全规范
1. 所有文档操作用 try/catch 包裹
2. 操作前检查对象存在性
3. 不要删除非选区内容（除非明确要求）
4. 大批量修改前先确认段落数量
5. 不要修改文档属性（作者、日期等），除非明确要求

### 返回值规范
```javascript
// 好的返回值
return "已替换选区文本（原 120 字 → 新 85 字）";
return "已插入 3 行 × 4 列表格";
return "已将全文 28 个段落的字体设为微软雅黑 12pt";

// 差的返回值
return "done";
return undefined; // 忘记返回
```

### 错误处理
```javascript
var doc = Application.ActiveDocument;
if (!doc) return "无活动文档，请先打开一个文档";

var sel = Application.Selection;
if (!sel.Text || sel.Text.trim().length === 0) {
  return "请先选中要操作的文本";
}

try {
  // ... 操作
  return "操作成功";
} catch (e) {
  return "操作失败: " + (e.message || String(e));
}
```
