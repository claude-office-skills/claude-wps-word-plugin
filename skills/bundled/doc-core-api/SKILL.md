---
name: doc-core-api
description: WPS Writer 核心 API 参考与代码规范
tags: [api, writer, core]
context:
  always: true
modes: [agent, plan]
---

## WPS Writer JS API 核心参考

### 代码执行环境
- 代码通过 `new Function(code)()` 在 WPS Plugin Host 中同步执行
- 全局可用对象: `Application`, `wps`
- 必须使用 `var` 声明变量（不支持 let/const/箭头函数）
- 最后一行必须返回结果字符串

### 常用对象
```
Application.ActiveDocument    // 当前文档 (Document)
Application.Selection         // 当前选区 (Selection)
Document.Content              // 全文 Range
Document.Paragraphs           // 段落集合 Paragraphs
Document.Tables               // 表格集合 Tables
Document.Sections             // 节集合 Sections
Document.Bookmarks            // 书签集合
```

### Selection 操作
```
Selection.Text                // 读取/设置选区文本
Selection.TypeText(text)      // 在光标处输入（替换选区）
Selection.InsertAfter(text)   // 在选区后插入
Selection.InsertBefore(text)  // 在选区前插入
Selection.MoveDown(unit, count)  // 下移光标
Selection.MoveRight(unit, count) // 右移光标
Selection.Collapse(direction)    // 收缩选区 (0=wdCollapseEnd, 1=wdCollapseStart)
Selection.WholeStory()        // 选中全文
Selection.HomeKey(unit)       // 移动到文档/行首
Selection.EndKey(unit)        // 移动到文档/行尾
```

### Range 操作
```
Range.Text                    // 读取/设置文本
Range.InsertAfter(text)       // 在范围后插入
Range.InsertBefore(text)      // 在范围前插入
Range.Start / Range.End       // 起止字符位置
Range.Select()                // 将此范围设为选区
Range.Delete()                // 删除范围内容
```

### 格式化
```
Range.Font.Name = "微软雅黑"
Range.Font.Size = 14
Range.Font.Bold = true / false
Range.Font.Italic = true / false
Range.Font.Color = 0xFF0000        // BGR 颜色
Range.Font.Underline = 1           // wdUnderlineSingle

Range.ParagraphFormat.Alignment = 1  // 0=左, 1=居中, 2=右, 3=两端
Range.ParagraphFormat.LineSpacing = 24  // 行距 (磅)
Range.ParagraphFormat.SpaceBefore = 6
Range.ParagraphFormat.SpaceAfter = 6
Range.ParagraphFormat.FirstLineIndent = 24  // 首行缩进

Range.Style = "标题 1"              // 设置样式
```

### 表格操作
```
Document.Tables.Add(range, rows, cols)
Table.Cell(row, col).Range.Text = "文本"
Table.Rows.Add()
Table.Columns.Add()
Table.Cell(row, col).Merge(Table.Cell(row, col2))
```

### 安全规范
- 操作前务必检查对象是否存在: `if (!doc) return "无活动文档";`
- 大范围操作用 try/catch 包裹
- 不要假设文档中有特定内容，先检查再操作
- 替换选区前确认 Selection.Text 不为空
