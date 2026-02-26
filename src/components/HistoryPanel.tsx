import { useState, useEffect, useCallback, memo } from "react";
import type { SessionMeta } from "../api/sessionStore";
import { listSessions, deleteSession } from "../api/sessionStore";
import styles from "./HistoryPanel.module.css";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (id: string) => void;
  currentSessionId: string | null;
}

const HistoryPanel = memo(function HistoryPanel({
  visible,
  onClose,
  onSelectSession,
  currentSessionId,
}: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listSessions();
    setSessions(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  if (!visible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>历史记录</span>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.sessionList}>
          {loading && sessions.length === 0 && (
            <div className={styles.emptyState}>加载中…</div>
          )}
          {!loading && sessions.length === 0 && (
            <div className={styles.emptyState}>
              <EmptyIcon />
              <span>暂无历史记录</span>
              <span className={styles.emptyHint}>对话会自动保存在这里</span>
            </div>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`${styles.sessionItem} ${s.id === currentSessionId ? styles.sessionActive : ""}`}
              onClick={() => {
                onSelectSession(s.id);
                onClose();
              }}
            >
              <div className={styles.sessionTitle}>{s.title}</div>
              <div className={styles.sessionMeta}>
                <span>{formatTime(s.updatedAt)}</span>
                <span>{s.messageCount} 条消息</span>
              </div>
              {s.preview && (
                <div className={styles.sessionPreview}>{s.preview}</div>
              )}
              <button
                className={styles.deleteBtn}
                onClick={(e) => handleDelete(e, s.id)}
                title="删除会话"
              >
                <TrashIcon />
              </button>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default HistoryPanel;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;

  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;

  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function EmptyIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#555"
      strokeWidth="1.5"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function TrashIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
