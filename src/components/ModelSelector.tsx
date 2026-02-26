import { useState, useRef, useEffect, memo } from "react";
import type { ModelOption } from "../types";
import { MODEL_OPTIONS } from "../types";
import styles from "./ModelSelector.module.css";

interface Props {
  value: string;
  onChange: (cliModel: string) => void;
  disabled?: boolean;
}

const ModelSelector = memo(function ModelSelector({
  value,
  onChange,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current =
    MODEL_OPTIONS.find((m) => m.cliModel === value) ?? MODEL_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (opt: ModelOption) => {
    onChange(opt.cliModel);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title={`当前模型: ${current.label}`}
      >
        <span className={styles.modelName}>{current.label}</span>
        <span className={styles.arrow}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {MODEL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`${styles.option} ${opt.cliModel === value ? styles.optionActive : ""}`}
              onClick={() => handleSelect(opt)}
            >
              <div className={styles.optLabel}>{opt.label}</div>
              <div className={styles.optDesc}>{opt.description}</div>
              {opt.cliModel === value && (
                <span className={styles.optCheck}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default ModelSelector;
