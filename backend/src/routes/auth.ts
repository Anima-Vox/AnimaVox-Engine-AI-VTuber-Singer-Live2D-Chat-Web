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
import { bearerToken, parseBody, type AppDeps } from '../context';
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

/** 同一个邮箱两次寄验证码之间至少隔几秒 */
const RESEND_AFTER_SECONDS = 60;
/** 验证码最多可以输错几次，超过就要重新寄 */
const MAX_CODE_ATTEMPTS = 5;

/** 注册、登录、登出（接口约定 v1 第三节） */
export function authRoutes(deps: AppDeps): FastifyPluginAsync {
  const { db, env, mailer } = deps;

  /** 注册或登录成功：产生 token 交给前端，数据库只存它的 SHA-256 */
  function issueSession(user: StoredUser): AuthResponse {
    const token = createToken();
    const now = new Date();
    createSession(db, {
      tokenHash: sha256(token),
      userId: user.id,
      now: now.toISOString(),
      expiresAt: new Date(now.getTime() + env.SESSION_DAYS * 86_400_000).toISOString(),
    });
    return { token, user: publicUser(user) };
  }

  const emailTaken = () =>
    new ApiError('API_ERROR', '这个邮箱已经注册过', { reason: 'EMAIL_TAKEN', field: 'email' });

  return async (app) => {
    /* ---------- 寄注册验证码 ---------- */
    app.post('/api/auth/email-code', async (request): Promise<EmailCodeResponse> => {
      const { email } = parseBody(EmailCodeRequestSchema, request.body);
      if (findUserByEmail(db, email)) {
        throw emailTaken();
      }

      // 60 秒内不能重寄
      const now = new Date();
      const last = findEmailCode(db, email);
      if (last && now.getTime() - Date.parse(last.sent_at) < RESEND_AFTER_SECONDS * 1000) {
        throw new ApiError('API_ERROR', '验证码寄得太频繁，请稍后再试', {
          status: 429,
          retryable: true,
          reason: 'CODE_TOO_FREQUENT',
          field: 'email',
        });
      }

      // 先寄出，寄成功才记下来（只存验证码的 SHA-256）
      const code = createEmailCode();
      await mailer.sendRegisterCode(email, code);
      saveEmailCode(db, {
        email,
        codeHash: sha256(`${email}:${code}`),
        now: now.toISOString(),
        expiresAt: new Date(now.getTime() + env.EMAIL_CODE_TTL_MINUTES * 60_000).toISOString(),
      });

      // 还没接寄信服务：非正式环境把验证码直接回传，注册页会显示出来
      return {
        resendAfterSeconds: RESEND_AFTER_SECONDS,
        ...(env.NODE_ENV === 'production' ? {} : { devCode: code }),
      };
    });

    /* ---------- 注册：验证码 + 密码 + 用户名 + 是否同意用于训练 ---------- */
    app.post('/api/auth/register', async (request): Promise<AuthResponse> => {
      const input = parseBody(RegisterRequestSchema, request.body);
      if (input.noticeVersion !== NOTICE_VERSION) {
        throw new ApiError('API_ERROR', '注册说明已更新，请重新阅读', {
          reason: 'INVALID_INPUT',
          field: 'noticeVersion',
        });
      }
      if (findUserByEmail(db, input.email)) {
        throw emailTaken();
      }

      // 验证码要：存在、没错太多次、没过期、内容相符
      const now = new Date();
      const stored = findEmailCode(db, input.email);
      const isValid =
        stored !== null &&
        stored.attempts < MAX_CODE_ATTEMPTS &&
        Date.parse(stored.expires_at) > now.getTime() &&
        stored.code_hash === sha256(`${input.email}:${input.code}`);
      if (!isValid) {
        countEmailCodeAttempt(db, input.email);
        throw new ApiError('API_ERROR', '验证码不正确或已过期', {
          reason: 'CODE_INVALID',
          field: 'code',
        });
      }

      // 验证码用过就作废，然后建立帐号并直接登录
      deleteEmailCode(db, input.email);
      const user = createUser(db, {
        email: input.email,
        username: input.username,
        passwordHash: await hashPassword(input.password),
        trainingConsent: input.trainingConsent,
        noticeVersion: input.noticeVersion,
        now: now.toISOString(),
      });
      return issueSession(user);
    });

    /* ---------- 登录 ---------- */
    app.post('/api/auth/login', async (request): Promise<AuthResponse> => {
      const { email, password } = parseBody(LoginRequestSchema, request.body);
      const user = findUserByEmail(db, email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new ApiError('API_ERROR', '邮箱或密码不正确', { reason: 'BAD_CREDENTIALS' });
      }
      return issueSession(user);
    });

    /* ---------- 登出：让这个 token 失效 ---------- */
    app.post('/api/auth/logout', async (request, reply) => {
      const token = bearerToken(request);
      if (token) {
        deleteSession(db, sha256(token));
      }
      return reply.code(204).send();
    });
  };
}
