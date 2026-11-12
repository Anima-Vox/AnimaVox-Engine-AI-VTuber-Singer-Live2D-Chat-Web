import { buildApp } from './app';
import { createConsoleMailer } from './auth/mailer';
import { env } from './config/env';
import { openDatabase } from './db/database';
import { createMockAdapter } from './services/llm/mockAdapter';
import { logger } from './utils/logger';

const db = openDatabase(env.DATABASE_PATH);
const app = await buildApp(
  {
    db,
    env,
    // 还没接寄信服务：验证码印在日志里
    mailer: createConsoleMailer(logger),
    // LLM_MODE=live 尚未实现，一律使用 Mock 模型
    llm: createMockAdapter(),
  },
  { loggerInstance: logger },
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => {
      db.close();
      logger.info(`收到 ${signal}，后端已关闭`);
      process.exit(0);
    });
  });
}

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  logger.error(error, '后端启动失败');
  process.exit(1);
}
