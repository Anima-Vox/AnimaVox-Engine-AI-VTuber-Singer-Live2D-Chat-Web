-- 接口约定 v1 的第一版资料表。改结构时请新增 002_xxx.sql，不要改已经发布的文件。

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  -- 注册时选定：是否同意对话资料用于训练本地模型（1 = 同意）
  training_consent INTEGER NOT NULL,
  notice_version INTEGER NOT NULL,
  consent_withdrawn_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE email_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_conversations_list ON conversations(user_id, character_id, updated_at);

CREATE TABLE messages (
  -- 用户消息的 id 就是前端送来的 clientMessageId；回复的 id 由后端产生
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  -- assistant：模型回的完整 JSON（emotion / action / expression / text）
  response_json TEXT,
  -- assistant：这条回复对应的用户消息 id；同一句话只会有一条回复
  reply_to TEXT,
  -- 写入时用户是否同意用于训练；撤回同意后全部改为 0
  training_allowed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE UNIQUE INDEX idx_messages_reply_to ON messages(user_id, reply_to) WHERE reply_to IS NOT NULL;

CREATE TABLE usage_daily (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
