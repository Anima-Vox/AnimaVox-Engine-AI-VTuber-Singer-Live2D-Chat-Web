import { z } from 'zod';

/**
 * 后端环境变量（Zod 校验，缺失即报错）
 * 通过 process.env 读取，不依赖 dotenv（Docker / npm script 注入）。
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),
  /** mock = 离线演示回复；live = 真实 LLM（尚未实现，仍走 mock） */
  LLM_MODE: z.enum(['mock', 'live']).default('mock'),
  /** 允许跨域的前端地址，多个用英文逗号分隔（正式环境前后端同网域时用不到） */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** SQLite 数据库文件位置（相对于 backend/ 目录）；测试用 :memory: */
  DATABASE_PATH: z.string().default('./data/animavox.db'),
  /** 每个用户每天最多能发几句话（超过回 QUOTA_EXCEEDED） */
  DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(100),
  /** 每次请求模型时带上最近多少条对话 */
  CONTEXT_WINDOW: z.coerce.number().int().positive().default(20),
  /** 登录有效天数 */
  SESSION_DAYS: z.coerce.number().int().positive().default(30),
  /** 邮箱验证码有效分钟数 */
  EMAIL_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  /** 等模型回复最久多少毫秒（超时回 SERVICE_UNSTABLE） */
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  /** 官方人设文件所在的文件夹（不放进公开仓库）；没设定时使用占位人设 */
  PERSONA_DIR: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}

export const env = readEnv();

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((item) => item.trim())
  .filter(Boolean);
