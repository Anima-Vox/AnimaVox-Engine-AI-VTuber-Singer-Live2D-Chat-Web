import type { Conversation, LLMResponse, Message, User } from '@shared';
import { nanoid } from 'nanoid';
import { transaction, type Database } from './db/database';

/* ---------- 资料表的一行 ---------- */

interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  training_consent: number;
  notice_version: number;
  consent_withdrawn_at: string | null;
  created_at: string;
}

interface ConversationRow {
  id: string;
  user_id: string;
  character_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  response_json: string | null;
  reply_to: string | null;
  created_at: string;
}

interface EmailCodeRow {
  email: string;
  code_hash: string;
  sent_at: string;
  expires_at: string;
  attempts: number;
}

/* ---------- 转成接口格式 ---------- */

export interface StoredUser extends User {
  passwordHash: string;
}

function toUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    trainingConsent: row.training_consent === 1,
    noticeVersion: row.notice_version,
    consentWithdrawnAt: row.consent_withdrawn_at,
    createdAt: row.created_at,
    passwordHash: row.password_hash,
  };
}

/** 去掉密码杂凑，只留可以回给前端的栏位 */
export function publicUser(user: StoredUser): User {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    trainingConsent: user.trainingConsent,
    noticeVersion: user.noticeVersion,
    consentWithdrawnAt: user.consentWithdrawnAt,
    createdAt: user.createdAt,
  };
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    characterId: row.character_id,
    activeModelId: 'official',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): Message {
  if (row.role === 'assistant' && row.response_json) {
    const response = JSON.parse(row.response_json) as LLMResponse;
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: 'assistant',
      content: row.content,
      emotion: response.emotion,
      action: response.action,
      expression: response.expression,
      toolCalls: response.tool_calls ?? [],
      createdAt: row.created_at,
    };
  }
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

/** 对话标题：第一句话的前 24 个字（与前端演示模式相同） */
export function titleFromFirstMessage(content: string): string {
  return content.trim().replace(/\s+/g, ' ').slice(0, 24);
}

/* ---------- 用户 ---------- */

export function findUserByEmail(db: Database, email: string): StoredUser | null {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function findUserById(db: Database, id: string): StoredUser | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function createUser(
  db: Database,
  input: {
    email: string;
    username: string;
    passwordHash: string;
    trainingConsent: boolean;
    noticeVersion: number;
    now: string;
  },
): StoredUser {
  const id = nanoid();
  db.prepare(
    `INSERT INTO users (id, email, username, password_hash, training_consent, notice_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.email,
    input.username,
    input.passwordHash,
    input.trainingConsent ? 1 : 0,
    input.noticeVersion,
    input.now,
  );
  return findUserById(db, id) as StoredUser;
}

export function renameUser(db: Database, id: string, username: string): void {
  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id);
}

/** 撤回训练同意：之后不能再开启；已写入的对话全部改为不可用于训练 */
export function withdrawConsent(db: Database, id: string, now: string): void {
  transaction(db, () => {
    db.prepare(
      'UPDATE users SET training_consent = 0, consent_withdrawn_at = COALESCE(consent_withdrawn_at, ?) WHERE id = ?',
    ).run(now, id);
    db.prepare('UPDATE messages SET training_allowed = 0 WHERE user_id = ?').run(id);
  });
}

/** 删除帐号：对话、消息、登录状态、用量一并删除（外键 ON DELETE CASCADE） */
export function deleteUser(db: Database, id: string): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

/* ---------- 登录状态 ---------- */

export function createSession(
  db: Database,
  input: { tokenHash: string; userId: string; now: string; expiresAt: string },
): void {
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(input.tokenHash, input.userId, input.now, input.expiresAt);
}

export function findSessionUser(db: Database, tokenHash: string, now: string): StoredUser | null {
  const row = db
    .prepare(
      `SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .get(tokenHash, now) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function deleteSession(db: Database, tokenHash: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

/* ---------- 邮箱验证码 ---------- */

export function findEmailCode(db: Database, email: string): EmailCodeRow | null {
  return (
    (db.prepare('SELECT * FROM email_codes WHERE email = ?').get(email) as
      EmailCodeRow | undefined) ?? null
  );
}

export function saveEmailCode(
  db: Database,
  input: { email: string; codeHash: string; now: string; expiresAt: string },
): void {
  db.prepare(
    `INSERT INTO email_codes (email, code_hash, sent_at, expires_at, attempts) VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, sent_at = excluded.sent_at,
       expires_at = excluded.expires_at, attempts = 0`,
  ).run(input.email, input.codeHash, input.now, input.expiresAt);
}

export function countEmailCodeAttempt(db: Database, email: string): void {
  db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
}

export function deleteEmailCode(db: Database, email: string): void {
  db.prepare('DELETE FROM email_codes WHERE email = ?').run(email);
}

/* ---------- 对话 ---------- */

export function listConversations(
  db: Database,
  userId: string,
  characterId: string,
): Conversation[] {
  const rows = db
    .prepare(
      `SELECT * FROM conversations WHERE user_id = ? AND character_id = ?
       ORDER BY updated_at DESC, created_at DESC`,
    )
    .all(userId, characterId) as unknown as ConversationRow[];
  return rows.map(toConversation);
}

export function findConversation(db: Database, userId: string, id: string): Conversation | null {
  const row = db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(id, userId) as ConversationRow | undefined;
  return row ? toConversation(row) : null;
}

export function createConversation(
  db: Database,
  input: { userId: string; characterId: string; title: string; now: string },
): Conversation {
  const id = nanoid();
  db.prepare(
    `INSERT INTO conversations (id, user_id, character_id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.userId, input.characterId, input.title, input.now, input.now);
  return findConversation(db, input.userId, id) as Conversation;
}

export function deleteConversation(db: Database, userId: string, id: string): boolean {
  const result = db
    .prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return Number(result.changes) > 0;
}

export function touchConversation(
  db: Database,
  input: { userId: string; id: string; now: string; title?: string },
): void {
  if (input.title) {
    db.prepare(
      'UPDATE conversations SET updated_at = ?, title = ? WHERE id = ? AND user_id = ?',
    ).run(input.now, input.title, input.id, input.userId);
  } else {
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ? AND user_id = ?').run(
      input.now,
      input.id,
      input.userId,
    );
  }
}

/* ---------- 消息 ---------- */

export function listMessages(db: Database, userId: string, conversationId: string): Message[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages WHERE user_id = ? AND conversation_id = ?
       ORDER BY created_at ASC, rowid ASC`,
    )
    .all(userId, conversationId) as unknown as MessageRow[];
  return rows.map(toMessage);
}

/** 最近 limit 条，给模型当上下文 */
export function recentMessages(
  db: Database,
  userId: string,
  conversationId: string,
  limit: number,
): Message[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages WHERE user_id = ? AND conversation_id = ?
       ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    )
    .all(userId, conversationId, limit) as unknown as MessageRow[];
  return rows.reverse().map(toMessage);
}

export function findMessage(db: Database, userId: string, id: string): Message | null {
  const row = db.prepare('SELECT * FROM messages WHERE user_id = ? AND id = ?').get(userId, id) as
    MessageRow | undefined;
  return row ? toMessage(row) : null;
}

export function findReplyTo(db: Database, userId: string, userMessageId: string): Message | null {
  const row = db
    .prepare('SELECT * FROM messages WHERE user_id = ? AND reply_to = ?')
    .get(userId, userMessageId) as MessageRow | undefined;
  return row ? toMessage(row) : null;
}

export function countUserMessages(db: Database, userId: string, conversationId: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND conversation_id = ? AND role = 'user'",
    )
    .get(userId, conversationId) as { n: number };
  return Number(row.n);
}

export function insertUserMessage(
  db: Database,
  input: {
    id: string;
    userId: string;
    conversationId: string;
    content: string;
    trainingAllowed: boolean;
    now: string;
  },
): void {
  db.prepare(
    `INSERT INTO messages (id, user_id, conversation_id, role, content, training_allowed, created_at)
     VALUES (?, ?, ?, 'user', ?, ?, ?)`,
  ).run(
    input.id,
    input.userId,
    input.conversationId,
    input.content,
    input.trainingAllowed ? 1 : 0,
    input.now,
  );
}

/** 写入回复；同一句话已经有回复时（同时送了两次）回传 false */
export function insertReply(
  db: Database,
  input: {
    userId: string;
    conversationId: string;
    replyTo: string;
    response: LLMResponse;
    trainingAllowed: boolean;
    now: string;
  },
): string | null {
  const id = nanoid();
  try {
    db.prepare(
      `INSERT INTO messages (id, user_id, conversation_id, role, content, response_json, reply_to, training_allowed, created_at)
       VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.userId,
      input.conversationId,
      input.response.text,
      JSON.stringify(input.response),
      input.replyTo,
      input.trainingAllowed ? 1 : 0,
      input.now,
    );
    return id;
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
      return null;
    }
    throw error;
  }
}

/* ---------- 用量 ---------- */

export function usageToday(db: Database, userId: string, day: string): number {
  const row = db
    .prepare('SELECT message_count FROM usage_daily WHERE user_id = ? AND day = ?')
    .get(userId, day) as { message_count: number } | undefined;
  return row ? Number(row.message_count) : 0;
}

export function addUsage(db: Database, userId: string, day: string): void {
  db.prepare(
    `INSERT INTO usage_daily (user_id, day, message_count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, day) DO UPDATE SET message_count = message_count + 1`,
  ).run(userId, day);
}
