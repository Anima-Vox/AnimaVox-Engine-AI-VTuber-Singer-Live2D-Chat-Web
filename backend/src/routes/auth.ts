import {
  EmailCodeRequestSchema,
  LoginRequestSchema,
  NOTICE_VERSION,
  RegisterRequestSchema,
  type AuthResponse,
  type EmailCodeResponse,
} from '@shared';
import type { FastifyPluginAsync } from 'fastify';
import { hashPassword, verifyPassword } from '../auth/password';
import { createEmailCode, createToken, sha256 } from '../auth/tokens';
import { bearerToken, nowOf, parseBody, type AppDeps } from '../context';
import { ApiError } from '../errors';
import {
  countEmailCodeAttempt,
  createSession,
  createUser,
  deleteEmailCode,
  deleteSession,
  findEmailCode,
  findUserByEmail,
  publicUser,
  saveEmailCode,
  type StoredUser,
} from '../store';

/** 同一个邮箱两次寄验证码之间至少隔多久 */
const RESEND_AFTER_SECONDS = 60;
/** 验证码最多可以输错几次，超过就要重新寄 */
const MAX_CODE_ATTEMPTS = 5;

function issueSession(deps: AppDeps, user: StoredUser): AuthResponse {
  const token = createToken();
  const now = nowOf(deps);
  const expiresAt = new Date(now.getTime() + deps.env.SESSION_DAYS * 86_400_000);
  createSession(deps.db, {
    tokenHash: sha256(token),
    userId: user.id,
    now: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  return { token, user: publicUser(user) };
}

export function authRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    /** 寄注册验证码（开发模式下验证码印在后端日志，并随响应回传） */
    app.post('/api/auth/email-code', async (request): Promise<EmailCodeResponse> => {
      const { email } = parseBody(EmailCodeRequestSchema, request.body);
      if (findUserByEmail(deps.db, email)) {
        throw new ApiError('API_ERROR', '这个邮箱已经注册过', {
          reason: 'EMAIL_TAKEN',
          field: 'email',
        });
      }

      const now = nowOf(deps);
      const existing = findEmailCode(deps.db, email);
      if (existing) {
        const waited = (now.getTime() - Date.parse(existing.sent_at)) / 1000;
        if (waited < RESEND_AFTER_SECONDS) {
          throw new ApiError('API_ERROR', '验证码寄得太频繁，请稍后再试', {
            status: 429,
            retryable: true,
            reason: 'CODE_TOO_FREQUENT',
            field: 'email',
          });
        }
      }

      const code = createEmailCode();
      saveEmailCode(deps.db, {
        email,
        codeHash: sha256(`${email}:${code}`),
        now: now.toISOString(),
        expiresAt: new Date(now.getTime() + deps.env.EMAIL_CODE_TTL_MINUTES * 60_000).toISOString(),
      });
      try {
        await deps.mailer.sendRegisterCode(email, code);
      } catch {
        deleteEmailCode(deps.db, email);
        throw new ApiError('SERVICE_UNSTABLE', '验证码寄送失败，请稍后再试');
      }

      return {
        resendAfterSeconds: RESEND_AFTER_SECONDS,
        ...(deps.mailer.isDevelopment && deps.env.NODE_ENV !== 'production'
          ? { devCode: code }
          : {}),
      };
    });

    /** 注册：邮箱验证码 + 密码 + 用户名 + 是否同意用于训练（看完说明后选定） */
    app.post('/api/auth/register', async (request): Promise<AuthResponse> => {
      const input = parseBody(RegisterRequestSchema, request.body);
      if (input.noticeVersion !== NOTICE_VERSION) {
        throw new ApiError('API_ERROR', '注册说明已更新，请重新阅读', {
          reason: 'INVALID_INPUT',
          field: 'noticeVersion',
        });
      }
      if (findUserByEmail(deps.db, input.email)) {
        throw new ApiError('API_ERROR', '这个邮箱已经注册过', {
          reason: 'EMAIL_TAKEN',
          field: 'email',
        });
      }

      const now = nowOf(deps);
      const stored = findEmailCode(deps.db, input.email);
      const valid =
        stored &&
        stored.attempts < MAX_CODE_ATTEMPTS &&
        Date.parse(stored.expires_at) > now.getTime() &&
        stored.code_hash === sha256(`${input.email}:${input.code}`);
      if (!valid) {
        if (stored) {
          countEmailCodeAttempt(deps.db, input.email);
        }
        throw new ApiError('API_ERROR', '验证码不正确或已过期', {
          reason: 'CODE_INVALID',
          field: 'code',
        });
      }

      deleteEmailCode(deps.db, input.email);
      const user = createUser(deps.db, {
        email: input.email,
        username: input.username,
        passwordHash: await hashPassword(input.password),
        trainingConsent: input.trainingConsent,
        noticeVersion: input.noticeVersion,
        now: now.toISOString(),
      });
      return issueSession(deps, user);
    });

    app.post('/api/auth/login', async (request): Promise<AuthResponse> => {
      const { email, password } = parseBody(LoginRequestSchema, request.body);
      const user = findUserByEmail(deps.db, email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new ApiError('API_ERROR', '邮箱或密码不正确', { reason: 'BAD_CREDENTIALS' });
      }
      return issueSession(deps, user);
    });

    app.post('/api/auth/logout', async (request, reply) => {
      const token = bearerToken(request);
      if (token) {
        deleteSession(deps.db, sha256(token));
      }
      return reply.code(204).send();
    });
  };
}
