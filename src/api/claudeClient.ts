/**
 * Claude API 调用层
 *
 * 通过本地代理服务器（proxy-server.js）调用 claude CLI，
 * 绕过 OAuth token 无法直接调用 Anthropic 公开 API 的限制。
 */
import type { WpsContext, ChatMessage, AttachmentFile } from "../types";

const PROXY_BASE = "http://127.0.0.1:3003";

function buildContextString(wpsCtx: WpsContext): string {
  const { selection, documentName, pageCount, wordCount, paragraphCount, outline, documentSummary } = wpsCtx;

  let ctx = `文档: ${documentName}\n`;
  ctx += `页数: ${pageCount} | 字数: ${wordCount} | 段落数: ${paragraphCount}\n`;

  if (documentSummary) {
    ctx += `表格数: ${documentSummary.tableCount} | 节数: ${documentSummary.sectionCount}\n`;
  }

  if (outline.length > 0) {
    ctx += `\n[文档大纲]\n`;
    for (const h of outline) {
      ctx += `${"  ".repeat(h.level - 1)}${h.text}\n`;
    }
  }

  if (selection && selection.hasSelection) {
    ctx += `\n[当前选区] 字符位置 ${selection.start}-${selection.end}，共 ${selection.charCount} 字符，${selection.paragraphCount} 个段落\n`;
    ctx += `样式: ${selection.styleName || "未知"} | 字体: ${selection.font.name} ${selection.font.size}pt`;
    if (selection.font.bold) ctx += " 加粗";
    if (selection.font.italic) ctx += " 斜体";
    ctx += "\n";

    if (selection.surroundingText.before.length > 0) {
      ctx += `\n[选区前文]\n`;
      for (const p of selection.surroundingText.before) {
        ctx += `  ${p}\n`;
      }
    }

    ctx += `\n[选区文本]\n  ${selection.text.substring(0, 1500)}\n`;
    if (selection.charCount > 1500) {
      ctx += `  ... (共 ${selection.charCount} 字符，仅展示前 1500)\n`;
    }

    if (selection.surroundingText.after.length > 0) {
      ctx += `\n[选区后文]\n`;
      for (const p of selection.surroundingText.after) {
        ctx += `  ${p}\n`;
      }
    }
  } else {
    ctx += "\n当前无选区（光标处于文档中）\n";
  }

  return ctx;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onThinking?: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (err: Error) => void;
  onModeInfo?: (mode: string, enforcement: Record<string, unknown>) => void;
}

export async function checkProxy(): Promise<boolean> {
  try {
    const resp = await fetch(`${PROXY_BASE}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export interface SendMessageOptions {
  model?: string;
  attachments?: AttachmentFile[];
  signal?: AbortSignal;
  webSearch?: boolean;
  mode?: string;
}

export async function sendMessage(
  userMessage: string,
  history: ChatMessage[],
  wpsCtx: WpsContext,
  callbacks: StreamCallbacks,
  options?: SendMessageOptions,
): Promise<void> {
  const messages = [
    ...history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    { role: "user" as const, content: userMessage },
  ];

  const context = buildContextString(wpsCtx);
  let fullText = "";

  const payload: Record<string, unknown> = { messages, context };
  if (options?.model) payload.model = options.model;
  if (options?.mode) payload.mode = options.mode;
  if (options?.webSearch) payload.webSearch = true;
  if (options?.attachments?.length) {
    payload.attachments = options.attachments.map((f) => ({
      name: f.name,
      content: f.content,
      type: f.type ?? "text",
      tempPath: f.tempPath,
    }));
  }

  try {
    const resp = await fetch(`${PROXY_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`代理服务器错误 ${resp.status}: ${errBody}`);
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        try {
          const event = JSON.parse(data);
          if (event.type === "mode") {
            callbacks.onModeInfo?.(event.mode, event.enforcement);
          } else if (event.type === "token") {
            fullText += event.text;
            callbacks.onToken(event.text);
          } else if (event.type === "thinking") {
            callbacks.onThinking?.(event.text);
          } else if (event.type === "done") {
            if (event.fullText && !fullText) fullText = event.fullText;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        } catch (parseErr) {
          if (
            parseErr instanceof Error &&
            parseErr.message !== "Unexpected token"
          ) {
            throw parseErr;
          }
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      callbacks.onComplete(fullText || "（已中止生成）");
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export function extractCodeBlocks(
  text: string,
): Array<{ language: string; code: string }> {
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ language: match[1] || "javascript", code: match[2].trim() });
  }
  return blocks;
}
