/**
 * WPS Writer 数据适配层
 *
 * 架构：Plugin Host main.js 定时将 Writer 数据 POST 到 proxy-server，
 * 本模块通过 GET /wps-context 获取最新数据。
 * 代码执行：POST /execute-code 提交 → 轮询 /code-result/:id 获取结果。
 */
import type { WpsContext, DiffResult, AddToChatPayload } from "../types";

const PROXY_URL = "http://127.0.0.1:3003";

let _wpsAvailable = false;

export function isWpsAvailable(): boolean {
  return _wpsAvailable;
}

export async function getWpsContext(): Promise<WpsContext> {
  try {
    const res = await fetch(`${PROXY_URL}/wps-context`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.error || (!data.documentName && !data.selection)) {
      _wpsAvailable = false;
      return getMockContext();
    }

    _wpsAvailable = true;
    return {
      documentName: data.documentName ?? "",
      pageCount: data.pageCount ?? 0,
      wordCount: data.wordCount ?? 0,
      paragraphCount: data.paragraphCount ?? 0,
      selection: data.selection ?? null,
      outline: data.outline ?? [],
      documentSummary: data.documentSummary ?? null,
    };
  } catch {
    _wpsAvailable = false;
    return getMockContext();
  }
}

const CODE_RESULT_POLL_MS = 300;
const CODE_RESULT_TIMEOUT_MS = 30000;

export interface ExecuteResult {
  result: string;
  diff: DiffResult | null;
}

export async function executeCode(code: string): Promise<ExecuteResult> {
  const submitRes = await fetch(`${PROXY_URL}/execute-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!submitRes.ok) {
    throw new Error(`提交代码失败: HTTP ${submitRes.status}`);
  }

  const { id } = await submitRes.json();
  const deadline = Date.now() + CODE_RESULT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(CODE_RESULT_POLL_MS);

    const pollRes = await fetch(`${PROXY_URL}/code-result/${id}`);
    if (!pollRes.ok) continue;

    const data = await pollRes.json();
    if (!data.ready) continue;

    if (data.error) {
      throw new Error(data.error);
    }
    return {
      result: data.result ?? "执行成功",
      diff: data.diff ?? null,
    };
  }

  throw new Error("代码执行超时（30秒）");
}

export async function pollAddToChat(): Promise<AddToChatPayload | null> {
  try {
    const res = await fetch(`${PROXY_URL}/add-to-chat/poll`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.pending) return null;
    return data as AddToChatPayload;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let _lastCtxJson = "";
let _lastSelectionCtx: WpsContext | null = null;
let _selNullCount = 0;
const SEL_NULL_GRACE = 2;

export function onSelectionChange(
  callback: (ctx: WpsContext) => void,
): () => void {
  let active = true;
  const POLL_INTERVAL = 2500;

  const poll = async () => {
    if (!active) return;
    try {
      const ctx = await getWpsContext();

      if (!ctx.selection && _lastSelectionCtx?.selection) {
        _selNullCount++;
        if (_selNullCount <= SEL_NULL_GRACE) {
          if (active) setTimeout(poll, POLL_INTERVAL);
          return;
        }
      } else {
        _selNullCount = 0;
      }

      if (ctx.selection) {
        _lastSelectionCtx = ctx;
      }

      const json = JSON.stringify({
        documentName: ctx.documentName,
        selStart: ctx.selection?.start,
        selEnd: ctx.selection?.end,
        selCharCount: ctx.selection?.charCount,
        selStyle: ctx.selection?.styleName,
      });

      if (json !== _lastCtxJson) {
        _lastCtxJson = json;
        callback(ctx);
      }
    } catch {
      // ignore
    }
    if (active) setTimeout(poll, POLL_INTERVAL);
  };

  setTimeout(poll, POLL_INTERVAL);
  return () => {
    active = false;
  };
}

function getMockContext(): WpsContext {
  return {
    documentName: "示例文档.docx",
    pageCount: 3,
    wordCount: 1250,
    paragraphCount: 28,
    selection: {
      text: "这是一段示例选中的文本，用于预览效果。",
      charCount: 18,
      start: 120,
      end: 138,
      paragraphCount: 1,
      styleName: "正文",
      font: { name: "微软雅黑", size: 12, bold: false, italic: false },
      surroundingText: {
        before: ["上一段的内容在这里。"],
        after: ["下一段的内容在这里。"],
      },
      hasSelection: true,
    },
    outline: [
      { level: 1, text: "第一章 引言" },
      { level: 2, text: "1.1 背景" },
      { level: 2, text: "1.2 目的" },
      { level: 1, text: "第二章 正文" },
    ],
    documentSummary: { tableCount: 2, sectionCount: 1 },
  };
}
