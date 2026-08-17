-- Migration 0005: 聊天持久化（P1 质量基建）
-- 每个用户一条滚动会话（skeleton 阶段不做多会话列表），
-- 历史可见范围由套餐 entitlements.historyDays 控制。

CREATE TABLE chat_conversations (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id);

CREATE TABLE chat_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,   -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_chat_messages_conv ON chat_messages(conversation_id, created_at);
