export type MessageRole = "user" | "assistant" | "system";

export type InteractionMode = "agent" | "plan" | "ask";

export interface ModeEnforcement {
  codeBridge?: boolean | string;
  codeBlockRender?: boolean | string;
  maxTurns?: number;
  autoExecute?: boolean | string;
  stripCodeBlocks?: boolean | string;
  planUI?: boolean | string;
}

export interface ModeDefinition {
  id: string;
  name: string;
  description: string;
  default?: boolean;
  enforcement: ModeEnforcement;
  quickActions?: QuickAction[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  codeBlocks?: CodeBlock[];
  isStreaming?: boolean;
  isError?: boolean;
  thinkingMs?: number;
  thinkingContent?: string;
  suggestAgentSwitch?: boolean;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  executed?: boolean;
  result?: string;
  error?: string;
  diff?: DiffResult | null;
}

export interface SelectionContext {
  text: string;
  charCount: number;
  start: number;
  end: number;
  paragraphCount: number;
  styleName: string;
  font: {
    name: string;
    size: number;
    bold: boolean;
    italic: boolean;
  };
  surroundingText: {
    before: string[];
    after: string[];
  };
  hasSelection: boolean;
}

export interface DocumentOutlineItem {
  level: number;
  text: string;
}

export interface DocumentSummary {
  tableCount: number;
  sectionCount: number;
}

export interface WpsContext {
  documentName: string;
  pageCount: number;
  wordCount: number;
  paragraphCount: number;
  selection: SelectionContext | null;
  outline: DocumentOutlineItem[];
  documentSummary: DocumentSummary | null;
}

export interface ModelOption {
  id: string;
  label: string;
  description: string;
  cliModel: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "sonnet",
    label: "Sonnet 4.6",
    description: "最佳编程模型，速度与质量兼顾",
    cliModel: "claude-sonnet-4-6",
  },
  {
    id: "opus",
    label: "Opus 4.6",
    description: "最强推理能力，适合复杂分析",
    cliModel: "claude-opus-4-6",
  },
  {
    id: "haiku",
    label: "Haiku 4.5",
    description: "极速响应，轻量任务首选",
    cliModel: "claude-haiku-4-5",
  },
];

export interface AttachmentFile {
  name: string;
  content: string;
  size: number;
  type?: "text" | "image" | "table";
  tempPath?: string;
  previewUrl?: string;
}

export interface FixErrorRequest {
  code: string;
  error: string;
  language: string;
}

export interface QuickAction {
  icon: string;
  label: string;
  prompt: string;
}

export interface ParagraphChange {
  paragraph: number;
  before: string;
  after: string;
}

export interface DiffResult {
  documentName: string;
  changeCount: number;
  addedParagraphs: number;
  changes: ParagraphChange[];
  hasMore: boolean;
}

export interface AddToChatPayload {
  text: string;
  startPos: number;
  endPos: number;
  charCount: number;
  paragraphCount: number;
  styleName: string;
  documentName: string;
}
