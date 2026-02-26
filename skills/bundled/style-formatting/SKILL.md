---
name: style-formatting
description: 文档格式化、样式设置、排版优化
tags: [format, style, layout]
context:
  keywords: [格式, 样式, 排版, 字体, 字号, 加粗, 斜体, 标题, 居中, 行距, 缩进, 对齐, 下划线, 颜色]
modes: [agent, plan]
---

## 格式化操作规范

### 常用格式化代码
```javascript
var sel = Application.Selection;

// 字体
sel.Font.Name = "微软雅黑";
sel.Font.Size = 12;
sel.Font.Bold = true;
sel.Font.Italic = false;

// 段落
sel.ParagraphFormat.Alignment = 1; // 居中
sel.ParagraphFormat.LineSpacingRule = 0; // wdLineSpaceSingle
sel.ParagraphFormat.FirstLineIndent = 24; // 首行缩进2字符
```

### 样式名称（中英文）
| 中文样式名 | 英文样式名 | 用途 |
|-----------|-----------|------|
| 标题 1 | Heading 1 | 一级标题 |
| 标题 2 | Heading 2 | 二级标题 |
| 标题 3 | Heading 3 | 三级标题 |
| 正文 | Normal | 正文段落 |
| 引用 | Quote | 引用文字 |

### 批量格式化
```javascript
var doc = Application.ActiveDocument;
var paraCount = doc.Paragraphs.Count;
for (var i = 1; i <= paraCount; i++) {
  var para = doc.Paragraphs.Item(i);
  para.Range.Font.Name = "微软雅黑";
  para.Range.Font.Size = 12;
  para.Range.ParagraphFormat.LineSpacing = 28;
}
return "已格式化全部 " + paraCount + " 个段落";
```

### 对齐方式常量
- 0 = wdAlignParagraphLeft (左对齐)
- 1 = wdAlignParagraphCenter (居中)
- 2 = wdAlignParagraphRight (右对齐)
- 3 = wdAlignParagraphJustify (两端对齐)
