import type { FastifyRequest } from 'fastify';
import type { ZodType } from 'zod';
import { sha256 } from './auth/tokens';
import type { Mailer } from './auth/mailer';
import type { Env } from './config/env';
import type { Database } from './db/database';
import { invalidInput, unauthorized } from './errors';
import type { LlmAdapter } from './services/llm/types';
import { findSessionUser, type StoredUser } from './store';

/** 路由用到的所有依赖；测试时可以换成内存数据库、假的寄信与模型 */
export interface AppDeps {
  db: Database;
  env: Env;
  mailer: Mailer;
  llm: LlmAdapter;
  /** 目前时间；测试时可以固定 */
  now?: () => Date;
}

export function nowOf(deps: AppDeps): Date {
  return deps.now ? deps.now() : new Date();
}

/** 用量按 UTC+8 的日期计算（台湾与大陆同一天） */
export function dayKey(date: Date): string {
  return new Date(date.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

/** 用 Zod 校验请求；不符合时回 API_ERROR（INVALID_INPUT），并指出是哪个栏位 */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw invalidInput(issue?.message ?? '请求格式不对', issue?.path.join('.') || undefined);
  }
  return result.data;
}

export function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim() || null;
}

/** 需要登录的接口先调用这个；没登录或已过期就丢出 UNAUTHORIZED */
export function requireUser(request: FastifyRequest, deps: AppDeps): StoredUser {
  const token = bearerToken(request);
  if (!token) {
    throw unauthorized();
  }
  const user = findSessionUser(deps.db, sha256(token), nowOf(deps).toISOString());
  if (!user) {
    throw unauthorized();
  }
  return user;
}
