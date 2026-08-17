/**
 * 聊天持久化客户端封装（对接 functions/api/chat/*）。
 * 全部 fire-and-forget 友好：失败返回 null，不阻断聊天本身。
 */

export interface PersistedChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: number;
}

export interface ChatHistory {
  conversation_id: string;
  plan: string;
  history_days: number;
  messages: PersistedChatMessage[];
}

export async function fetchChatHistory(): Promise<ChatHistory | null> {
  try {
    const res = await fetch("/api/chat/history");
    if (!res.ok) return null;
    return (await res.json()) as ChatHistory;
  } catch {
    return null;
  }
}

export async function appendChatMessage(
  role: "user" | "assistant",
  content: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearChatHistory(): Promise<boolean> {
  try {
    const res = await fetch("/api/chat/history", { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
