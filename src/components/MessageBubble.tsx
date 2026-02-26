import {
  useState,
  useEffect,
  useRef,
  memo,
  useMemo,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../types";
import CodeBlock from "./CodeBlock";
import styles from "./MessageBubble.module.css";

interface Props {
  message: ChatMessage;
  onCodeExecuted: (
    msgId: string,
    blockId: string,
    result: string,
    error?: string,
    diff?: import("../types").DiffResult | null,
  ) => void;
  onApplyCode?: (msgId: string) => void;
  onRetryFix?: (code: string, error: string, language: string) => void;
  isApplying?: boolean;
  onSwitchToAgent?: () => void;
}

function ThinkingSection({
  isThinking,
  thinkingMs,
  thinkingContent,
  startTime,
}: {
  isThinking: boolean;
  thinkingMs?: number;
  thinkingContent?: string;
  startTime: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const thinkingBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isThinking) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, [isThinking, startTime]);

  useEffect(() => {
    if (thinkingBodyRef.current) {
      thinkingBodyRef.current.scrollTop = thinkingBodyRef.current.scrollHeight;
    }
  }, [thinkingContent]);

  if (isThinking) {
    return (
      <div className={styles.thinkingSection}>
        <div className={styles.thinkingHeader}>
          <span className={styles.breathCircle}>
            <span className={styles.breathDot} />
          </span>
          <span className={styles.thinkingLabel}>Thinking...</span>
          <span className={styles.thinkingTimer}>{elapsed}s</span>
        </div>
        {thinkingContent && (
          <div ref={thinkingBodyRef} className={styles.thinkingBody}>
            {thinkingContent}
          </div>
        )}
      </div>
    );
  }

  if (!thinkingMs || thinkingMs < 1000) return null;

  const durationSec = (thinkingMs / 1000).toFixed(1);
  const hasContent = !!thinkingContent;

  return (
    <div className={styles.thinkingSection}>
      {hasContent ? (
        <>
          <button
            className={styles.thinkingToggle}
            onClick={() => setExpanded((v) => !v)}
          >
            <span
              className={`${styles.thinkingArrow} ${expanded ? styles.thinkingArrowOpen : ""}`}
            >
              ▶
            </span>
            <span className={styles.thinkingDoneLabel}>
              Thought for {durationSec}s
            </span>
          </button>
          {expanded && (
            <div className={styles.thinkingBody}>{thinkingContent}</div>
          )}
        </>
      ) : (
        <div className={styles.thinkingDoneBadge}>
          <ThinkingDoneIcon />
          <span className={styles.thinkingDoneLabel}>
            Thought for {durationSec}s
          </span>
        </div>
      )}
    </div>
  );
}

function ThinkingDoneIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#666"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function buildMarkdownComponents(
  message: ChatMessage,
  onCodeExecuted: Props["onCodeExecuted"],
  onRetryFix?: Props["onRetryFix"],
  isStreaming?: boolean,
) {
  return {
    pre({ children }: { children?: ReactNode }) {
      return <>{children}</>;
    },
    code({
      className,
      children,
    }: {
      className?: string;
      children?: ReactNode;
    }) {
      const isInline = !className && !String(children).includes("\n");
      if (isInline) {
        return <code className={styles.inlineCode}>{children}</code>;
      }

      const lang = /language-(\w+)/.exec(className || "")?.[1] || "javascript";
      const codeStr = String(children).replace(/\n$/, "");

      const matchedBlock = message.codeBlocks?.find(
        (b) => b.code === codeStr && b.language === lang,
      );

      if (matchedBlock) {
        return (
          <CodeBlock
            block={matchedBlock}
            isStreaming={isStreaming}
            onExecuted={(blockId, result, error, diff) =>
              onCodeExecuted(message.id, blockId, result, error, diff)
            }
            onRetryFix={onRetryFix}
          />
        );
      }

      return (
        <CodeBlock
          block={{
            id: `inline-${codeStr.slice(0, 8)}`,
            language: lang,
            code: codeStr,
          }}
          isStreaming={isStreaming}
          onExecuted={(blockId, result, error, diff) =>
            onCodeExecuted(message.id, blockId, result, error, diff)
          }
          onRetryFix={onRetryFix}
        />
      );
    },
    p({ children }: { children?: ReactNode }) {
      return <p className={styles.paragraph}>{children}</p>;
    },
    table({ children }: { children?: ReactNode }) {
      return (
        <div className={styles.tableWrap}>
          <table>{children}</table>
        </div>
      );
    },
  };
}

const remarkPlugins = [remarkGfm];

function MessageBubble({
  message,
  onCodeExecuted,
  onApplyCode,
  onRetryFix,
  isApplying,
  onSwitchToAgent,
}: Props) {
  const isUser = message.role === "user";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const codeBlocks = message.codeBlocks ?? [];
  const hasUnexecutedCode =
    !isUser &&
    !message.isStreaming &&
    codeBlocks.length > 0 &&
    codeBlocks.some((b) => !b.executed);

  const streamingComponents = useMemo(
    () => buildMarkdownComponents(message, onCodeExecuted, onRetryFix, true),
    [message, onCodeExecuted, onRetryFix],
  );

  const doneComponents = useMemo(
    () => buildMarkdownComponents(message, onCodeExecuted, onRetryFix, false),
    [message, onCodeExecuted, onRetryFix],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message.content;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  if (isUser) {
    return (
      <div className={styles.rowUser}>
        <div className={styles.userBubble}>
          <p className={styles.userText}>{message.content}</p>
        </div>
      </div>
    );
  }

  const isThinking = !!message.isStreaming && !message.content;
  const isStreamingContent = !!message.isStreaming && !!message.content;
  const isDone = !message.isStreaming;

  return (
    <div className={styles.rowAssist}>
      <div className={styles.assistBubble}>
        {/* Thinking section — always shown during thinking, collapsible after */}
        <ThinkingSection
          isThinking={isThinking}
          thinkingMs={message.thinkingMs}
          thinkingContent={message.thinkingContent}
          startTime={message.timestamp}
        />

        {/* Streaming content — partial Markdown rendering */}
        {isStreamingContent && (
          <div className={styles.assistContent}>
            <ReactMarkdown
              remarkPlugins={remarkPlugins}
              components={streamingComponents}
            >
              {message.content}
            </ReactMarkdown>
            <span className={styles.cursor} />
          </div>
        )}

        {/* Final rendered content */}
        {isDone && message.content && (
          <div className={styles.assistContent}>
            <ReactMarkdown
              remarkPlugins={remarkPlugins}
              components={doneComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {codeBlocks.length > 0 && !message.isStreaming && (
          <div className={styles.applyBar}>
            {hasUnexecutedCode ? (
              <button
                className={styles.applyBtn}
                onClick={() => onApplyCode?.(message.id)}
                disabled={isApplying}
              >
                {isApplying ? (
                  <>
                    <SpinnerIcon /> 执行中...
                  </>
                ) : (
                  <>
                    <PlayIcon /> 应用到表格
                  </>
                )}
              </button>
            ) : (
              <span className={styles.applyDone}>
                <CheckIcon /> 已应用到表格
              </span>
            )}
          </div>
        )}

        {message.suggestAgentSwitch && onSwitchToAgent && (
          <div className={styles.modeSwitchBanner}>
            <span className={styles.modeSwitchIcon}>⚡</span>
            <span className={styles.modeSwitchText}>
              该操作需要在 Agent 模式下执行
            </span>
            <button className={styles.modeSwitchBtn} onClick={onSwitchToAgent}>
              切换至 Agent
            </button>
          </div>
        )}

        {!message.isStreaming && (
          <div className={styles.actionBar}>
            <button
              className={styles.actionBtn}
              onClick={handleCopy}
              title="复制"
            >
              <CopyIcon />
            </button>
            <button
              className={`${styles.actionBtn} ${feedback === "up" ? styles.actionActive : ""}`}
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
              title="有帮助"
            >
              <ThumbUpIcon />
            </button>
            <button
              className={`${styles.actionBtn} ${feedback === "down" ? styles.actionActive : ""}`}
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
              title="没帮助"
            >
              <ThumbDownIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="spin"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ThumbUpIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3m7-2V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 2H20a2 2 0 012 2v7a2 2 0 01-2 2h-3m-7 2v4a3 3 0 003 3l4-9V2H6.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10" />
    </svg>
  );
}

export default memo(MessageBubble, (prev, next) => {
  return (
    prev.message === next.message &&
    prev.isApplying === next.isApplying &&
    prev.onCodeExecuted === next.onCodeExecuted &&
    prev.onApplyCode === next.onApplyCode &&
    prev.onRetryFix === next.onRetryFix &&
    prev.onSwitchToAgent === next.onSwitchToAgent
  );
});
