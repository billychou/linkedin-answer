/**
 * D1 数据访问层（聊天持久化，migration 0005）。
 *
 * skeleton 阶段每个用户一条滚动会话；历史可见天数由
 * entitlements.historyDays 决定（在 API 层过滤）。
 */

import type { D1Database } from "./db";

export interface DbChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: number;
}

/** 获取（或创建）用户当前会话。 */
export async function getOrCreateConversation(
  db: D1Database,
  userId: string
): Promise<{ id: string }> {
  const existing = await db
    .prepare(
      `SELECT id FROM chat_conversations
       WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`
    )
    .bind(userId)
    .first<{ id: string }>();
  if (existing) return existing;

  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO chat_conversations (id, user_id, title, created_at, updated_at)
       VALUES (?, ?, '', ?, ?)`
    )
    .bind(id, userId, now, now)
    .run();
  return { id };
}

/** 会话消息（按时间升序）；sinceMs 用于按套餐裁剪历史窗口。 */
export async function listMessages(
  db: D1Database,
  conversationId: string,
  sinceMs = 0
): Promise<DbChatMessage[]> {
  const { results } = await db
    .prepare(
      `SELECT id, conversation_id, role, content, created_at
       FROM chat_messages
       WHERE conversation_id = ? AND created_at >= ?
       ORDER BY created_at ASC, rowid ASC
       LIMIT 500`
    )
    .bind(conversationId, sinceMs)
    .all<DbChatMessage>();
  return results;
}

export async function appendMessage(
  db: D1Database,
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<DbChatMessage> {
  const now = Date.now();
  const message: DbChatMessage = {
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    created_at: now,
  };
  await db.batch([
    db
      .prepare(
        `INSERT INTO chat_messages (id, conversation_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(message.id, conversationId, role, content, now),
    db
      .prepare(`UPDATE chat_conversations SET updated_at = ? WHERE id = ?`)
      .bind(now, conversationId),
  ]);
  return message;
}

/** 清空会话消息（保留会话行）。 */
export async function clearMessages(
  db: D1Database,
  conversationId: string
): Promise<void> {
  await db.batch([
    db
      .prepare(`DELETE FROM chat_messages WHERE conversation_id = ?`)
      .bind(conversationId),
    db
      .prepare(`UPDATE chat_conversations SET updated_at = ? WHERE id = ?`)
      .bind(Date.now(), conversationId),
  ]);
}
