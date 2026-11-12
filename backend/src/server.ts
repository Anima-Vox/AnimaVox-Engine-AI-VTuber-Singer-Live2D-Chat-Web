import { buildApp } from './app';
import { createConsoleMailer } from './auth/mailer';
import { env } from './config/env';
import { openDatabase } from './db/database';
import { createMockAdapter } from './services/llm/mockAdapter';
import { logger } from './utils/logger';

/**
 * 后端的入口（npm run dev 执行的就是这个文件）：
 * 打开数据库 → 准备寄信与模型 → 建立应用 → 开始监听。
 */
const app = await buildApp(
  {
    db: openDatabase(env.DATABASE_PATH),
    env,
    // 还没接寄信服务：验证码印在日志里
    mailer: createConsoleMailer(logger),
    // 还没接真实模型：使用演示台词
    llm: createMockAdapter(),
  },
  { loggerInstance: logger },
);

await app.listen({ port: env.PORT, host: env.HOST });
