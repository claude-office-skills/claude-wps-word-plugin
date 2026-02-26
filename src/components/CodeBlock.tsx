import { useState, useLayoutEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { executeCode } from "../api/wpsAdapter";
import type { CodeBlock as CodeBlockType } from "../types";
import DiffPanel from "./DiffPanel";
import styles from "./CodeBlock.module.css";

const COLLAPSE_THRESHOLD = 12;

import type { DiffResult } from "../types";

interface Props {
  block: CodeBlockType;
  onExecuted: (blockId: string, result: string, error?: string, diff?: DiffResult | null) => void;
  onRetryFix?: (code: string, error: string, language: string) => void;
  isStreaming?: boolean;
}

export default function CodeBlock({
  block,
  onExecuted,
  onRetryFix,
  isStreaming,
}: Props) {
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const lineCount = block.code.split("\n").length;
  const shouldCollapse = lineCount > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(isStreaming || !shouldCollapse);
  const wasStreaming = useRef(isStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCodeLen = useRef(0);

  useLayoutEffect(() => {
    if (wasStreaming.current && !isStreaming && shouldCollapse) {
      setExpanded(false);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, shouldCollapse]);

  useLayoutEffect(() => {
    if (!isStreaming || !expanded || !scrollRef.current) return;
    if (block.code.length <= prevCodeLen.current) return;
    prevCodeLen.current = block.code.length;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [block.code, isStreaming, expanded]);

  const handleRun = async () => {
    setRunning(true);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/63acb95d-6f91-4165-a07a-5bab2abb61eb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fc5e63'},body:JSON.stringify({sessionId:'fc5e63',location:'CodeBlock.tsx:handleRun',message:'Manual execute clicked',data:{blockId:block.id,lang:block.language,codeLen:block.code.length,first120:block.code.slice(0,120),hasImport:/\bimport\b/.test(block.code),hasExport:/\bexport\b/.test(block.code),hasArrow:/=>/.test(block.code),hasConst:/\bconst\b/.test(block.code),hasLet:/\blet\b/.test(block.code)},timestamp:Date.now(),hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    try {
      const { result, diff } = await executeCode(block.code);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/63acb95d-6f91-4165-a07a-5bab2abb61eb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fc5e63'},body:JSON.stringify({sessionId:'fc5e63',location:'CodeBlock.tsx:handleRun:success',message:'Execution succeeded',data:{blockId:block.id,resultLen:result?.length,diffChanges:diff?.changeCount},timestamp:Date.now(),hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      onExecuted(block.id, result, undefined, diff);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/63acb95d-6f91-4165-a07a-5bab2abb61eb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fc5e63'},body:JSON.stringify({sessionId:'fc5e63',location:'CodeBlock.tsx:handleRun:error',message:'Execution failed',data:{blockId:block.id,error:errMsg,codeFirst200:block.code.slice(0,200)},timestamp:Date.now(),hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      onExecuted(
        block.id,
        "",
        errMsg,
      );
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = block.code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const statusLabel = block.executed
    ? block.error
      ? "执行失败"
      : "已执行"
    : null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {lineCount > COLLAPSE_THRESHOLD && (
            <button
              className={styles.toggleBtn}
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "折叠代码" : "展开代码"}
            >
              <span
                className={`${styles.toggleArrow} ${expanded ? styles.toggleArrowOpen : ""}`}
              >
                ▶
              </span>
            </button>
          )}
          <span className={styles.lang}>{block.language}</span>
          <span className={styles.lineCount}>{lineCount} 行</span>
          {isStreaming && (
            <span className={styles.streamingBadge}>streaming</span>
          )}
        </div>
        <div className={styles.headerActions}>
          {statusLabel && (
            <span
              className={
                block.error ? styles.statusError : styles.statusSuccess
              }
            >
              {statusLabel}
            </span>
          )}
          <button
            className={styles.copyBtn}
            onClick={handleCopy}
            title="复制代码"
          >
            {copied ? "✓" : <CopyIcon />}
          </button>
          {!block.executed && (
            <button
              className={styles.runBtn}
              onClick={handleRun}
              disabled={running}
              title="在 WPS 中执行此代码"
            >
              {running ? <SpinnerIcon /> : "▶ 执行"}
            </button>
          )}
        </div>
      </div>

      {expanded ? (
        <div ref={scrollRef} className={styles.codeScroll}>
          <SyntaxHighlighter
            language={block.language}
            style={vscDarkPlus}
            showLineNumbers
            lineNumberStyle={{
              minWidth: "2.5em",
              paddingRight: "1em",
              color: "#555",
              fontSize: 10,
              userSelect: "none",
            }}
            customStyle={{
              margin: 0,
              padding: "10px 0",
              fontSize: 11.5,
              lineHeight: "1.6",
              background: "transparent",
            }}
            wrapLines
          >
            {block.code}
          </SyntaxHighlighter>
        </div>
      ) : (
        <button
          className={styles.expandPrompt}
          onClick={() => setExpanded(true)}
        >
          <span className={styles.expandDots}>···</span>
          <span>展开 {lineCount} 行代码</span>
        </button>
      )}

      {block.result && (
        <div className={styles.result}>
          <span className={styles.resultLabel}>输出</span>
          <pre className={styles.resultText}>{block.result}</pre>
        </div>
      )}
      {block.diff && block.diff.changeCount > 0 && (
        <DiffPanel diff={block.diff} />
      )}
      {block.error && (
        <div className={`${styles.result} ${styles.resultError}`}>
          <span className={styles.errorLabel}>错误</span>
          <pre className={styles.resultText}>{block.error}</pre>
          {onRetryFix && (
            <button
              className={styles.fixBtn}
              onClick={() =>
                onRetryFix(block.code, block.error!, block.language)
              }
              title="将错误发送给 Claude 修复"
            >
              <FixIcon /> 修复错误
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
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

function SpinnerIcon() {
  return (
    <svg
      width="13"
      height="13"
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

function FixIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
