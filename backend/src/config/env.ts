import { z } from 'zod';

/**
 * 后端设定：全部来自环境变量，每一项都有默认值，不设定也能直接启动。
 * 例：DAILY_MESSAGE_LIMIT=200 npm run dev
 */
export const EnvSchema = z.object({
  /** production = 正式环境：不会把验证码随接口回传 */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** 监听的地址与端口 */
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),
  /** SQLite 数据库文件的位置（相对于 backend/ 文件夹） */
  DATABASE_PATH: z.string().default('./data/animavox.db'),
  /** 每个用户每天最多能发几句话（超过回 QUOTA_EXCEEDED） */
  DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(100),
  /** 每次请模型回复时，带上最近多少条对话当上下文 */
  CONTEXT_WINDOW: z.coerce.number().int().positive().default(20),
  /** 登录后几天内不用重新登录 */
  SESSION_DAYS: z.coerce.number().int().positive().default(30),
  /** 邮箱验证码几分钟内有效 */
  EMAIL_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  /** 等模型回复最久多少毫秒（超过回 SERVICE_UNSTABLE） */
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
});

export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);
