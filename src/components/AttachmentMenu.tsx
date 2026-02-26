import { useState, useRef, useEffect, memo } from "react";
import type { AttachmentFile } from "../types";
import styles from "./AttachmentMenu.module.css";

interface Props {
  onFileAttach: (file: AttachmentFile) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  disabled?: boolean;
}

const AttachmentMenu = memo(function AttachmentMenu({
  onFileAttach,
  webSearchEnabled,
  onToggleWebSearch,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];

  const toBase64 = (buf: ArrayBuffer): string =>
    btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), ""));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();

    try {
      if (IMAGE_EXTS.some((ext) => lower.endsWith(ext))) {
        const arrayBuf = await file.arrayBuffer();
        const base64 = toBase64(arrayBuf);
        const resp = await fetch("http://127.0.0.1:3003/upload-temp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, fileName: file.name }),
        });
        const result = await resp.json();
        if (result.ok) {
          const previewUrl = URL.createObjectURL(file);
          onFileAttach({
            name: file.name,
            content: `[图片: ${file.name}]`,
            size: file.size,
            type: "image",
            tempPath: result.filePath,
            previewUrl,
          });
        } else {
          onFileAttach({
            name: file.name,
            content: `[图片上传失败: ${result.error}]`,
            size: file.size,
          });
        }
      } else if (lower.endsWith(".pdf")) {
        const arrayBuf = await file.arrayBuffer();
        const base64 = toBase64(arrayBuf);
        const resp = await fetch("http://127.0.0.1:3003/extract-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64 }),
        });
        const result = await resp.json();
        if (result.ok) {
          const header = `[PDF: ${file.name}, ${result.pages} 页, ${result.totalChars} 字符${result.truncated ? "（已截断至 100k）" : ""}]\n\n`;
          onFileAttach({
            name: file.name,
            content: header + result.text,
            size: file.size,
          });
        } else {
          onFileAttach({
            name: file.name,
            content: `[PDF 解析失败: ${result.error}]`,
            size: file.size,
          });
        }
      } else {
        const content = await file.text();
        onFileAttach({ name: file.name, content, size: file.size });
      }
    } catch (err) {
      onFileAttach({
        name: file.name,
        content: `[无法读取文件: ${file.name} - ${err instanceof Error ? err.message : String(err)}]`,
        size: file.size,
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.plusBtn}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="附件菜单"
      >
        <PlusIcon />
      </button>

      {open && (
        <div className={styles.menu}>
          <button className={styles.menuItem} onClick={handleFileClick}>
            <span className={styles.menuIcon}>📎</span>
            <span className={styles.menuLabel}>上传文件 / 图片 / PDF</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => {
              onToggleWebSearch();
            }}
          >
            <span className={styles.menuIcon}>🌐</span>
            <span className={styles.menuLabel}>联网搜索</span>
            <span
              className={`${styles.menuToggle} ${webSearchEnabled ? styles.menuToggleOn : ""}`}
            >
              {webSearchEnabled ? "✓" : ""}
            </span>
          </button>

          <button
            className={`${styles.menuItem} ${styles.menuItemDisabled}`}
            disabled
          >
            <span className={styles.menuIcon}>⚡</span>
            <span className={styles.menuLabel}>连接器</span>
            <span className={styles.menuSoon}>Coming soon</span>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.json,.xlsx,.xls,.tsv,.md,.pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
});

export default AttachmentMenu;

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
