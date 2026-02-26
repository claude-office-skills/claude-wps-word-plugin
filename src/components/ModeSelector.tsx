import { memo } from "react";
import type { InteractionMode } from "../types";
import styles from "./ModeSelector.module.css";

const MODE_CONFIG: Record<
  InteractionMode,
  { label: string; dotClass: string; activeClass: string }
> = {
  agent: {
    label: "Agent",
    dotClass: styles.agentDot,
    activeClass: styles.agentActive,
  },
  plan: {
    label: "Plan",
    dotClass: styles.planDot,
    activeClass: styles.planActive,
  },
  ask: {
    label: "Ask",
    dotClass: styles.askDot,
    activeClass: styles.askActive,
  },
};

const MODES: InteractionMode[] = ["agent", "plan", "ask"];

interface Props {
  mode: InteractionMode;
  onChange: (mode: InteractionMode) => void;
  disabled?: boolean;
}

const ModeSelector = memo(function ModeSelector({
  mode,
  onChange,
  disabled,
}: Props) {
  return (
    <div className={styles.wrapper}>
      {MODES.map((m) => {
        const cfg = MODE_CONFIG[m];
        const isActive = m === mode;
        return (
          <button
            key={m}
            className={`${styles.modeBtn} ${isActive ? `${styles.active} ${cfg.activeClass}` : ""}`}
            onClick={() => !disabled && onChange(m)}
            disabled={disabled}
            title={
              m === "agent"
                ? "自动执行模式"
                : m === "plan"
                  ? "步骤规划模式"
                  : "只读分析模式"
            }
          >
            <span
              className={`${styles.dot} ${isActive ? cfg.dotClass : styles.inactiveDot}`}
            />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
});

export default ModeSelector;
