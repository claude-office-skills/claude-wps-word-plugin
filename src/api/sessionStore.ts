import type { ChatMessage } from "../types";

const PROXY_URL = "http://127.0.0.1:3003";

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview: string;
}

export interface SessionFull {
  id: string;
  title: string;
  messages: ChatMessage[];
  model?: string;
  createdAt: number;
  updatedAt: number;
}

export async function listSessions(): Promise<SessionMeta[]> {
  const res = await fetch(`${PROXY_URL}/sessions`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function loadSession(id: string): Promise<SessionFull | null> {
  const res = await fetch(`${PROXY_URL}/sessions/${id}`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function saveSession(
  id: string,
  messages: ChatMessage[],
  opts?: { title?: string; model?: string },
): Promise<void> {
  await fetch(`${PROXY_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, messages, ...opts }),
  }).catch(() => {});
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${PROXY_URL}/sessions/${id}`, { method: "DELETE" }).catch(
    () => {},
  );
}

export function generateTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "新会话";
  const text = firstUser.content.replace(/\n/g, " ").trim();
  return text.length > 30 ? text.slice(0, 30) + "…" : text;
}

export async function updateMemory(key: string, value: string): Promise<void> {
  const res = await fetch(`${PROXY_URL}/memory`).catch(() => null);
  if (!res || !res.ok) return;
  const mem = await res.json();
  const prefs = mem.preferences || {};
  prefs[key] = value;
  await fetch(`${PROXY_URL}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: prefs }),
  }).catch(() => {});
}

export async function getMemory(): Promise<Record<string, unknown>> {
  const res = await fetch(`${PROXY_URL}/memory`, {
    signal: AbortSignal.timeout(2000),
  }).catch(() => null);
  if (!res || !res.ok) return {};
  return res.json();
}
