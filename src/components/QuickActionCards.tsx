import { useState, useEffect, useRef, memo, useCallback } from "react";
import type { QuickAction, InteractionMode } from "../types";
import styles from "./QuickActionCards.module.css";

const PROXY_BASE = "http://127.0.0.1:3003";
const DEBOUNCE_MS = 1500;
const VISIBLE_COUNT = 4;

interface CommandDef {
  id: string;
  icon: string;
  label: string;
  description: string;
  scope: string;
  prompt: string;
}

interface ModeDef {
  id: string;
  quickActions?: Array<{
    icon: string;
    label: string;
    prompt: string;
    scope?: string;
  }>;
}

const FALLBACK_GENERAL: QuickAction[] = [
  { icon: "📝", label: "生成内容", prompt: "帮我根据当前文档主题生成一段内容" },
  { icon: "📋", label: "文档摘要", prompt: "总结当前文档的主要内容和结构" },
  { icon: "📐", label: "格式排版", prompt: "优化当前文档的格式和排版" },
  { icon: "🌐", label: "翻译全文", prompt: "将当前文档翻译成英文" },
];

const FALLBACK_SELECTION: QuickAction[] = [
  { icon: "✨", label: "润色", prompt: "润色选中的文本，使其更流畅专业" },
  { icon: "🔄", label: "改写", prompt: "用不同的表达方式改写选中文本" },
  { icon: "📏", label: "扩写", prompt: "将选中文本扩写为更详细的内容" },
  { icon: "✂️", label: "缩写", prompt: "将选中文本精简为更简洁的表达" },
  { icon: "🔍", label: "校对", prompt: "检查选中文本的语法和拼写错误" },
];

function toQuickAction(cmd: CommandDef): QuickAction {
  return { icon: cmd.icon, label: cmd.label, prompt: cmd.prompt };
}

interface Props {
  hasSelection: boolean;
  onAction: (prompt: string) => void;
  disabled?: boolean;
  mode?: InteractionMode;
}

const QuickActionCards = memo(function QuickActionCards({
  hasSelection,
  onAction,
  disabled,
  mode = "agent",
}: Props) {
  const [generalCmds, setGeneralCmds] =
    useState<QuickAction[]>(FALLBACK_GENERAL);
  const [selectionCmds, setSelectionCmds] =
    useState<QuickAction[]>(FALLBACK_SELECTION);
  const [modeActions, setModeActions] = useState<
    Record<string, { general: QuickAction[]; selection: QuickAction[] }>
  >({});
  const [stableHasSelection, setStableHasSelection] = useState(hasSelection);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasSelection === stableHasSelection) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setTimeout(() => {
      setStableHasSelection(hasSelection);
      timerRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasSelection, stableHasSelection]);

  useEffect(() => {
    fetch(`${PROXY_BASE}/commands`)
      .then((r) => r.json())
      .then((cmds: CommandDef[]) => {
        const gen = cmds
          .filter((c) => c.scope === "general")
          .map(toQuickAction);
        const sel = cmds
          .filter((c) => c.scope === "selection")
          .map(toQuickAction);
        if (gen.length > 0) setGeneralCmds(gen);
        if (sel.length > 0) setSelectionCmds(sel);
      })
      .catch(() => {});

    fetch(`${PROXY_BASE}/modes`)
      .then((r) => r.json())
      .then((modes: ModeDef[]) => {
        const result: Record<
          string,
          { general: QuickAction[]; selection: QuickAction[] }
        > = {};
        for (const m of modes) {
          if (m.quickActions && m.quickActions.length > 0) {
            result[m.id] = {
              general: m.quickActions
                .filter((a) => !a.scope || a.scope === "general")
                .map((a) => ({
                  icon: a.icon,
                  label: a.label,
                  prompt: a.prompt,
                })),
              selection: m.quickActions
                .filter((a) => a.scope === "selection")
                .map((a) => ({
                  icon: a.icon,
                  label: a.label,
                  prompt: a.prompt,
                })),
            };
          }
        }
        setModeActions(result);
      })
      .catch(() => {});
  }, []);

  const modeSpecific = modeActions[mode];

  const allActions: QuickAction[] = [];
  const seen = new Set<string>();
  const addUnique = (list: QuickAction[]) => {
    for (const a of list) {
      if (!seen.has(a.label)) {
        seen.add(a.label);
        allActions.push(a);
      }
    }
  };

  if (stableHasSelection) {
    if (modeSpecific?.selection.length) addUnique(modeSpecific.selection);
    addUnique(selectionCmds);
    if (modeSpecific?.general.length) addUnique(modeSpecific.general);
    addUnique(generalCmds);
  } else {
    if (modeSpecific?.general.length) addUnique(modeSpecific.general);
    addUnique(generalCmds);
    if (modeSpecific?.selection.length) addUnique(modeSpecific.selection);
    addUnique(selectionCmds);
  }

  const actions = allActions;
  const [expanded, setExpanded] = useState(false);
  const toggleExpand = useCallback(() => setExpanded((v) => !v), []);

  const hasMore = actions.length > VISIBLE_COUNT;
  const visibleActions = expanded ? actions : actions.slice(0, VISIBLE_COUNT);

  return (
    <div className={`${styles.grid} ${expanded ? styles.gridExpanded : ""}`}>
      {visibleActions.map((action) => (
        <button
          key={action.label}
          className={styles.card}
          onClick={() => onAction(action.prompt)}
          disabled={disabled}
        >
          <span className={styles.cardIcon}>{action.icon}</span>
          <span className={styles.cardLabel}>{action.label}</span>
        </button>
      ))}
      {hasMore && (
        <button
          className={`${styles.card} ${styles.moreBtn}`}
          onClick={toggleExpand}
        >
          <span className={styles.cardIcon}>{expanded ? "‹" : "›"}</span>
          <span className={styles.cardLabel}>
            {expanded ? "收起" : `更多+${actions.length - VISIBLE_COUNT}`}
          </span>
        </button>
      )}
    </div>
  );
});

export default QuickActionCards;
