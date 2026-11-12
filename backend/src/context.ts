import type { FastifyRequest } from 'fastify';
import type { ZodType, ZodTypeDef } from 'zod';
import type { Mailer } from './auth/mailer';
import { sha256 } from './auth/tokens';
import type { Env } from './config/env';
import type { Database } from './db/database';
import { invalidInput, unauthorized } from './errors';
import type { LlmAdapter } from './services/llm/types';
import { findSessionUser, type StoredUser } from './store';

/** 每个路由都会用到的东西：数据库、设定、寄信、模型。由 server.ts 准备好后传进来 */
export interface AppDeps {
  db: Database;
  env: Env;
  mailer: Mailer;
  llm: LlmAdapter;
}

/** 用 Zod 检查前端送来的内容；不合格就回 API_ERROR（INVALID_INPUT），并指出是哪个栏位 */
export function parseBody<T>(schema: ZodType<T, ZodTypeDef, unknown>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw invalidInput(issue?.message ?? '请求格式不对', issue?.path.join('.'));
  }
  return result.data;
}

/** 从请求的 Authorization: Bearer <token> 取出 token；没带就是 null */
export function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

/** 需要登录的接口第一行先调用这个：回传目前登录的用户；没登录或已过期就回 UNAUTHORIZED */
export function requireUser(request: FastifyRequest, deps: AppDeps): StoredUser {
  const token = bearerToken(request);
  const user = token && findSessionUser(deps.db, sha256(token), new Date().toISOString());
  if (!user) {
    throw unauthorized();
  }
  return user;
}
