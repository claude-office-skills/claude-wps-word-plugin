/**
 * WPS Writer 加载项入口文件
 *
 * 1. Ribbon 按钮：打开 Claude 侧边栏
 * 2. 上下文同步：定时将文档数据推送到 proxy-server
 * 3. 代码执行桥：轮询 proxy 的待执行代码队列并在 WPS Writer 上下文中执行
 */

var TASKPANE_URL = "http://127.0.0.1:5175/";
var PROXY_URL = "http://127.0.0.1:3003";
var CTX_INTERVAL = 2000;
var CODE_POLL_INTERVAL = 800;
var TASKPANE_KEY = "claude_word_taskpane_id";

var _ctxTimer = null;
var _codePollTimer = null;
var _syncToken = "sync_" + Date.now();

// #region agent log
function _dbg(loc, msg, data) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", PROXY_URL + "/wps-debug-log", false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(
      JSON.stringify({
        sessionId: "5f320f",
        location: loc,
        message: msg,
        data: data || {},
        timestamp: Date.now(),
      }),
    );
  } catch (e) {}
}
_dbg("main.js:load", "WPS Word addon loaded", {
  taskpaneUrl: TASKPANE_URL,
  proxyUrl: PROXY_URL,
  hasFetch: typeof fetch !== "undefined",
});
// #endregion

// ── Ribbon 按钮回调 ──────────────────────────────────────────

function OnOpenClaudePanel() {
  // #region agent log
  _dbg("main.js:OnOpenClaudePanel", "Button clicked", {
    wpsType: typeof wps,
    hasCreateTaskPane: typeof wps !== "undefined" && typeof wps.CreateTaskPane,
    hasCreateLower: typeof wps !== "undefined" && typeof wps.createTaskPane,
    hypothesisId: "H1,H3,H4",
  });
  // #endregion
  try {
    var tsId = null;
    try {
      tsId = wps.PluginStorage.getItem(TASKPANE_KEY);
    } catch (e) {}

    // #region agent log
    _dbg("main.js:OnOpenClaudePanel", "Existing taskpane check", {
      tsId: tsId,
      hypothesisId: "H3",
    });
    // #endregion

    if (tsId) {
      try {
        var existing = wps.GetTaskPane(tsId);
        if (existing) {
          existing.Visible = !existing.Visible;
          startBackgroundSync();
          // #region agent log
          _dbg("main.js:OnOpenClaudePanel", "Toggled existing pane", {
            tsId: tsId,
            visible: existing.Visible,
          });
          // #endregion
          return;
        }
      } catch (e) {}
    }

    var createFn =
      typeof wps.CreateTaskPane === "function"
        ? wps.CreateTaskPane
        : typeof wps.createTaskPane === "function"
          ? wps.createTaskPane
          : null;

    // #region agent log
    _dbg("main.js:OnOpenClaudePanel", "CreateTaskPane resolved", {
      hasFn: !!createFn,
      hypothesisId: "H3",
    });
    // #endregion

    if (!createFn) {
      alert("当前 WPS 版本不支持 TaskPane API，请更新 WPS Office 到最新版本。");
      return;
    }

    var taskPane = createFn.call(wps, TASKPANE_URL);
    taskPane.DockPosition =
      wps.Enum && wps.Enum.JSKsoEnum_msoCTPDockPositionRight
        ? wps.Enum.JSKsoEnum_msoCTPDockPositionRight
        : 2;
    taskPane.Visible = true;

    // #region agent log
    _dbg("main.js:OnOpenClaudePanel", "TaskPane created", {
      id: taskPane.ID,
      visible: taskPane.Visible,
      url: TASKPANE_URL,
      hypothesisId: "H3,H4",
    });
    // #endregion

    try {
      wps.PluginStorage.setItem(TASKPANE_KEY, taskPane.ID);
    } catch (e) {}
    startBackgroundSync();
  } catch (e) {
    // #region agent log
    _dbg("main.js:OnOpenClaudePanel", "EXCEPTION", {
      error: e.message,
      stack: String(e.stack || ""),
      hypothesisId: "H3,H4",
    });
    // #endregion
    alert(
      "打开 Claude 面板失败：" +
        e.message +
        "\n\n请确保开发服务器已启动：\ncd ~/需求讨论/claude-wps-word-plugin && npm run dev",
    );
  }
}

function OnOpenJSDebugger() {
  try {
    if (
      typeof wps !== "undefined" &&
      wps.PluginStorage &&
      typeof wps.PluginStorage.openDebugger === "function"
    ) {
      wps.PluginStorage.openDebugger();
    } else if (
      typeof wps !== "undefined" &&
      typeof wps.openDevTools === "function"
    ) {
      wps.openDevTools();
    } else {
      alert("JS 调试器在当前 WPS 版本下不可用。");
    }
  } catch (e) {
    alert("打开调试器失败：" + e.message);
  }
}

function GetClaudeIcon() {
  return "claude-icon.png";
}
function GetDebugIcon() {
  return "debug-icon.png";
}

// ── 右键 "Add to Chat" ─────────────────────────────────────

function OnAddToChat() {
  try {
    var sel = Application.Selection;
    if (!sel || !sel.Text || sel.Text.trim().length === 0) {
      alert("请先选中文档中的文本");
      return;
    }

    var doc = Application.ActiveDocument;
    var text = sel.Text;
    var startPos = sel.Start;
    var endPos = sel.End;

    var paraCount = 0;
    try {
      paraCount = sel.Paragraphs.Count;
    } catch (e) {}

    var styleName = "";
    try {
      if (sel.Style && sel.Style.NameLocal) {
        styleName = sel.Style.NameLocal;
      }
    } catch (e) {}

    var payload = {
      type: "add-to-chat",
      text: text.substring(0, 5000),
      startPos: startPos,
      endPos: endPos,
      charCount: text.length,
      paragraphCount: paraCount,
      styleName: styleName,
      documentName: doc ? doc.Name : "",
      timestamp: Date.now(),
    };

    httpPost(PROXY_URL + "/add-to-chat", JSON.stringify(payload));

    var tsId = null;
    try {
      tsId = wps.PluginStorage.getItem(TASKPANE_KEY);
    } catch (e) {}
    if (tsId) {
      try {
        var tp = wps.GetTaskPane(tsId);
        if (tp && !tp.Visible) tp.Visible = true;
      } catch (e) {}
    }
  } catch (e) {
    alert("Add to Chat 失败：" + e.message);
  }
}

function OnAddinLoad(ribbonUI) {
  startBackgroundSync();
}

window.ribbon_bindUI = function (bindUI) {
  // #region agent log
  _dbg("main.js:ribbon_bindUI", "ribbon_bindUI called, about to bindUI", {
    hasBindUI: typeof bindUI === "function",
    hypothesisId: "H1",
  });
  // #endregion
  try {
    bindUI({
      OnOpenClaudePanel: OnOpenClaudePanel,
      OnOpenJSDebugger: OnOpenJSDebugger,
      GetClaudeIcon: GetClaudeIcon,
      GetDebugIcon: GetDebugIcon,
    });
    // #region agent log
    _dbg("main.js:ribbon_bindUI", "bindUI succeeded", { hypothesisId: "H1" });
    // #endregion
  } catch (e) {
    // #region agent log
    _dbg("main.js:ribbon_bindUI", "bindUI EXCEPTION", {
      error: e.message,
      hypothesisId: "H1",
    });
    // #endregion
  }
};

// ── 后台同步启动 ─────────────────────────────────────────────

function startBackgroundSync() {
  if (_ctxTimer) {
    try {
      clearInterval(_ctxTimer);
    } catch (e) {}
  }
  if (_codePollTimer) {
    try {
      clearInterval(_codePollTimer);
    } catch (e) {}
  }
  _syncToken = "sync_" + Date.now();
  pushWpsContext();
  _ctxTimer = setInterval(pushWpsContext, CTX_INTERVAL);
  _codePollTimer = setInterval(pollAndExecuteCode, CODE_POLL_INTERVAL);
}

// ── Writer 上下文推送 ────────────────────────────────────────

function pushWpsContext() {
  try {
    var ctx = collectWriterContext();
    if (!ctx.documentName) return;
    httpPost(PROXY_URL + "/wps-context", JSON.stringify(ctx));
  } catch (e) {}
}

function collectWriterContext() {
  var result = {
    documentName: "",
    pageCount: 0,
    wordCount: 0,
    paragraphCount: 0,
    selection: null,
    outline: [],
    documentSummary: null,
  };

  try {
    var doc = Application.ActiveDocument;
    if (!doc) return result;

    result.documentName = doc.Name || "";

    try {
      result.paragraphCount = doc.Paragraphs.Count;
    } catch (e) {}
    try {
      result.wordCount = doc.Words.Count;
    } catch (e) {}
    try {
      result.pageCount = doc.BuiltInDocumentProperties("Number of Pages").Value;
    } catch (e) {}

    // 选区信息
    try {
      var sel = Application.Selection;
      if (sel) {
        var selText = "";
        try {
          selText = sel.Text || "";
        } catch (e) {}

        var paraCount = 0;
        try {
          paraCount = sel.Paragraphs.Count;
        } catch (e) {}

        var styleName = "";
        try {
          if (sel.Style && sel.Style.NameLocal) {
            styleName = sel.Style.NameLocal;
          }
        } catch (e) {}

        var fontName = "";
        var fontSize = 0;
        var isBold = false;
        var isItalic = false;
        try {
          if (sel.Font) {
            fontName = sel.Font.Name || "";
            fontSize = sel.Font.Size || 0;
            isBold = !!sel.Font.Bold;
            isItalic = !!sel.Font.Italic;
          }
        } catch (e) {}

        var surrounding = getSurroundingParagraphs(sel, 2);

        result.selection = {
          text: selText.substring(0, 3000),
          charCount: selText.length,
          start: sel.Start,
          end: sel.End,
          paragraphCount: paraCount,
          styleName: styleName,
          font: {
            name: fontName,
            size: fontSize,
            bold: isBold,
            italic: isItalic,
          },
          surroundingText: surrounding,
          hasSelection: selText.length > 1,
        };
      }
    } catch (e) {}

    // 文档大纲（标题结构）
    try {
      result.outline = getHeadingsOutline(doc);
    } catch (e) {}

    // 文档摘要（表格数等基本信息）
    try {
      var tableCount = 0;
      try {
        tableCount = doc.Tables.Count;
      } catch (e) {}
      var sectionCount = 0;
      try {
        sectionCount = doc.Sections.Count;
      } catch (e) {}

      result.documentSummary = {
        tableCount: tableCount,
        sectionCount: sectionCount,
      };
    } catch (e) {}
  } catch (e) {}

  return result;
}

/**
 * 获取文档标题大纲结构
 * 遍历段落，收集标题样式的段落文本和层级
 */
function getHeadingsOutline(doc) {
  var headings = [];
  try {
    var paraCount = doc.Paragraphs.Count;
    var limit = Math.min(paraCount, 500);
    for (var i = 1; i <= limit; i++) {
      try {
        var para = doc.Paragraphs.Item(i);
        var styleName = "";
        try {
          styleName = para.Style.NameLocal || para.Style.Name || "";
        } catch (e) {
          continue;
        }

        var level = -1;
        if (/^(标题|Heading)\s*1/i.test(styleName)) level = 1;
        else if (/^(标题|Heading)\s*2/i.test(styleName)) level = 2;
        else if (/^(标题|Heading)\s*3/i.test(styleName)) level = 3;
        else if (/^(标题|Heading)\s*4/i.test(styleName)) level = 4;

        if (level > 0) {
          var text = "";
          try {
            text = para.Range.Text || "";
          } catch (e) {}
          text = text.replace(/[\r\n]+/g, "").trim();
          if (text.length > 0) {
            headings.push({ level: level, text: text.substring(0, 120) });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return headings;
}

/**
 * 获取选区前后各 n 个段落文本，提供上下文
 */
function getSurroundingParagraphs(sel, n) {
  var before = [];
  var after = [];
  try {
    var doc = Application.ActiveDocument;
    var totalParas = doc.Paragraphs.Count;

    var selStart = sel.Start;
    var selEnd = sel.End;

    var selParaIdx = -1;
    try {
      var selPara = sel.Paragraphs.Item(1);
      for (var i = 1; i <= Math.min(totalParas, 200); i++) {
        if (doc.Paragraphs.Item(i).Range.Start === selPara.Range.Start) {
          selParaIdx = i;
          break;
        }
      }
    } catch (e) {}

    if (selParaIdx > 0) {
      for (var b = Math.max(1, selParaIdx - n); b < selParaIdx; b++) {
        try {
          var pText = doc.Paragraphs.Item(b).Range.Text || "";
          pText = pText.replace(/[\r\n]+$/, "").trim();
          if (pText.length > 0) before.push(pText.substring(0, 500));
        } catch (e) {}
      }

      var lastSelPara = selParaIdx;
      try {
        lastSelPara = selParaIdx + sel.Paragraphs.Count - 1;
      } catch (e) {}

      for (
        var a = lastSelPara + 1;
        a <= Math.min(totalParas, lastSelPara + n);
        a++
      ) {
        try {
          var aText = doc.Paragraphs.Item(a).Range.Text || "";
          aText = aText.replace(/[\r\n]+$/, "").trim();
          if (aText.length > 0) after.push(aText.substring(0, 500));
        } catch (e) {}
      }
    }
  } catch (e) {}
  return { before: before, after: after };
}

// ── 代码执行桥 ───────────────────────────────────────────────

/**
 * 对选区或文档内容取快照，用于代码执行前后 diff 计算
 */
function snapshotDocument() {
  try {
    var doc = Application.ActiveDocument;
    if (!doc) return null;

    var sel = Application.Selection;
    var selText = "";
    var selStart = 0;
    var selEnd = 0;
    try {
      selText = sel.Text || "";
      selStart = sel.Start;
      selEnd = sel.End;
    } catch (e) {}

    var totalParas = 0;
    try {
      totalParas = doc.Paragraphs.Count;
    } catch (e) {}

    var paragraphTexts = [];
    var limit = Math.min(totalParas, 100);
    for (var i = 1; i <= limit; i++) {
      try {
        var pText = doc.Paragraphs.Item(i).Range.Text || "";
        paragraphTexts.push(pText.replace(/[\r\n]+$/, ""));
      } catch (e) {
        paragraphTexts.push("");
      }
    }

    return {
      documentName: doc.Name || "",
      paragraphCount: totalParas,
      selectionText: selText.substring(0, 2000),
      selectionStart: selStart,
      selectionEnd: selEnd,
      paragraphTexts: paragraphTexts,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 对比执行前后的段落变化
 */
function computeDiff(before, after) {
  if (!before || !after) return null;

  var changes = [];
  var maxParas = Math.max(
    before.paragraphTexts.length,
    after.paragraphTexts.length,
  );

  for (var i = 0; i < maxParas; i++) {
    var bText =
      i < before.paragraphTexts.length ? before.paragraphTexts[i] : "";
    var aText = i < after.paragraphTexts.length ? after.paragraphTexts[i] : "";
    if (bText !== aText) {
      changes.push({
        paragraph: i + 1,
        before: bText.substring(0, 300),
        after: aText.substring(0, 300),
      });
    }
  }

  var addedParas = after.paragraphTexts.length - before.paragraphTexts.length;

  return {
    documentName: after.documentName,
    changeCount: changes.length,
    addedParagraphs: addedParas,
    changes: changes.slice(0, 50),
    hasMore: changes.length > 50,
  };
}

function pollAndExecuteCode() {
  try {
    var resp = httpGet(PROXY_URL + "/pending-code");
    if (!resp) return;

    var data = JSON.parse(resp);
    if (!data.pending) return;

    var id = data.id;
    var code = data.code;
    var beforeSnap = snapshotDocument();

    try {
      var execResult = executeInWps(code);
      var afterSnap = snapshotDocument();
      var diff = computeDiff(beforeSnap, afterSnap);

      httpPost(
        PROXY_URL + "/code-result",
        JSON.stringify({ id: id, result: execResult, diff: diff }),
      );
    } catch (execErr) {
      httpPost(
        PROXY_URL + "/code-result",
        JSON.stringify({ id: id, error: execErr.message || String(execErr) }),
      );
    }
  } catch (e) {}
}

function executeInWps(code) {
  var fn = new Function(code);
  var result = fn();
  return result === undefined ? "执行成功" : String(result);
}

// ── HTTP 工具（同步 XHR）─────────────────────────────────────

function httpPost(url, body) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(body);
    return xhr.responseText;
  } catch (e) {
    return null;
  }
}

function httpGet(url) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send();
    return xhr.responseText;
  } catch (e) {
    return null;
  }
}
