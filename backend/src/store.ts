import type { Conversation, Message, User } from '@shared';
import { nanoid } from 'nanoid';
import { transaction, type Database } from './db/database';
import type { ModelReply } from './services/llm/types';

/**
 * 所有读写数据库的 SQL 都在这个文件里；路由（routes/）只调用这里的函数。
 * 表结构见 backend/migrations/001_init.sql。时间一律存 ISO 字串（例：2026-11-13T10:00:00.000Z）。
 */

/* ============================================================
 * 数据库里的一行 → 接口约定的格式
 * ============================================================ */

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
  created_at: string;
}

interface EmailCodeRow {
  code_hash: string;
  sent_at: string;
  expires_at: string;
  attempts: number;
}

/** 后端内部用的用户资料：比回给前端的 User 多一个密码杂凑 */
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): Message {
  const message: Message = {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
  // 角色的回复另外存了模型回的完整 JSON，从里面取出情绪、动作、表情
  if (row.response_json) {
    const reply = JSON.parse(row.response_json) as ModelReply;
    message.emotion = reply.emotion;
    message.action = reply.action;
    message.expression = reply.expression;
  }
  return message;
}

/* ============================================================
 * 用户
 * ============================================================ */

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

/**
 * 撤回训练同意：记下撤回时间，并把这个用户已经写入的消息全部改成「不可用于训练」。
 * 只对「目前同意」的用户有作用；没有反过来「重新同意」的函数，所以撤回后不能再开启。
 */
export function withdrawConsent(db: Database, id: string, now: string): void {
  transaction(db, () => {
    db.prepare(
      `UPDATE users SET training_consent = 0, consent_withdrawn_at = ?
       WHERE id = ? AND training_consent = 1`,
    ).run(now, id);
    db.prepare('UPDATE messages SET training_allowed = 0 WHERE user_id = ?').run(id);
  });
}

/** 删除帐号：登录状态、对话、消息、用量会跟着一起删除（外键 ON DELETE CASCADE） */
export function deleteUser(db: Database, id: string): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

/* ============================================================
 * 登录状态（sessions）：一个 token 一行，只存 token 的 SHA-256
 * ============================================================ */

export function createSession(
  db: Database,
  input: { tokenHash: string; userId: string; now: string; expiresAt: string },
): void {
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(input.tokenHash, input.userId, input.now, input.expiresAt);
}

/** 用 token 找出登录的用户；token 不存在或已过期就是 null */
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

/* ============================================================
 * 邮箱验证码（email_codes）：一个邮箱一行，重寄就覆盖
 * ============================================================ */

export function findEmailCode(db: Database, email: string): EmailCodeRow | null {
  const row = db.prepare('SELECT * FROM email_codes WHERE email = ?').get(email) as
    EmailCodeRow | undefined;
  return row ?? null;
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

/** 验证码输错一次就记一次 */
export function countEmailCodeAttempt(db: Database, email: string): void {
  db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
}

export function deleteEmailCode(db: Database, email: string): void {
  db.prepare('DELETE FROM email_codes WHERE email = ?').run(email);
}

/* ============================================================
 * 对话（conversations）：每个查询都带 user_id，只碰得到自己的对话
 * ============================================================ */

/** 某个角色的全部对话，最近更新的排最前 */
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

/** 删除对话（底下的消息跟着删除）；回传有没有删到 */
export function deleteConversation(db: Database, userId: string, id: string): boolean {
  const result = db
    .prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return result.changes > 0;
}

/** 对话有新消息时更新时间（列表靠它排序）；title 有传才改标题 */
export function touchConversation(
  db: Database,
  input: { userId: string; id: string; now: string; title?: string },
): void {
  db.prepare(
    'UPDATE conversations SET updated_at = ?, title = COALESCE(?, title) WHERE id = ? AND user_id = ?',
  ).run(input.now, input.title ?? null, input.id, input.userId);
}

/* ============================================================
 * 消息（messages）
 * 用户消息的 id 就是前端送来的 clientMessageId；回复用 reply_to 记下它回的是哪一句
 * ============================================================ */

/** 一个对话的全部消息，旧的在前 */
export function listMessages(db: Database, userId: string, conversationId: string): Message[] {
  const rows = db
    .prepare(
      `SELECT * FROM messages WHERE user_id = ? AND conversation_id = ?
       ORDER BY created_at ASC, rowid ASC`,
    )
    .all(userId, conversationId) as unknown as MessageRow[];
  return rows.map(toMessage);
}

/** 最近 limit 条（旧的在前），给模型当上下文 */
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

/** 找出某一句用户消息的回复；还没有回复就是 null */
export function findReplyTo(db: Database, userId: string, userMessageId: string): Message | null {
  const row = db
    .prepare('SELECT * FROM messages WHERE user_id = ? AND reply_to = ?')
    .get(userId, userMessageId) as MessageRow | undefined;
  return row ? toMessage(row) : null;
}

/** 这个对话里用户说过几句话（用来判断是不是第一句） */
export function countUserMessages(db: Database, userId: string, conversationId: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND conversation_id = ? AND role = 'user'",
    )
    .get(userId, conversationId) as { n: number };
  return row.n;
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

/**
 * 写入角色的回复。同一句话只能有一条回复（数据库的唯一索引 idx_messages_reply_to）：
 * 同一句话同时送了两次时，第二条回复不会写入（OR IGNORE），这时回传 false。
 */
export function insertReply(
  db: Database,
  input: {
    userId: string;
    conversationId: string;
    replyTo: string;
    reply: ModelReply;
    trainingAllowed: boolean;
    now: string;
  },
): boolean {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO messages
         (id, user_id, conversation_id, role, content, response_json, reply_to, training_allowed, created_at)
       VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?, ?)`,
    )
    .run(
      nanoid(),
      input.userId,
      input.conversationId,
      input.reply.text,
      JSON.stringify(input.reply),
      input.replyTo,
      input.trainingAllowed ? 1 : 0,
      input.now,
    );
  return result.changes > 0;
}

/* ============================================================
 * 每日用量（usage_daily）：每个用户每天一行，记这一天收到了几条回复
 * ============================================================ */

export function usageToday(db: Database, userId: string, day: string): number {
  const row = db
    .prepare('SELECT message_count FROM usage_daily WHERE user_id = ? AND day = ?')
    .get(userId, day) as { message_count: number } | undefined;
  return row?.message_count ?? 0;
}

export function addUsage(db: Database, userId: string, day: string): void {
  db.prepare(
    `INSERT INTO usage_daily (user_id, day, message_count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, day) DO UPDATE SET message_count = message_count + 1`,
  ).run(userId, day);
}
