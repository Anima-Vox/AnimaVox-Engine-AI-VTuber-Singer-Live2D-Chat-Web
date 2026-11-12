import Fastify, { type FastifyServerOptions } from 'fastify';
import type { AppDeps } from './context';
import { toApiError } from './errors';
import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chat';
import { conversationRoutes } from './routes/conversations';
import { healthRoutes } from './routes/health';
import { meRoutes } from './routes/me';

/**
 * 建立后端应用（还不监听端口）：server.ts 负责启动，测试直接对它发请求。
 * 所有接口都在 /api 底下：前后端同一个网域，/api 开头的请求交给后端（接口约定第 7 条）。
 */
export async function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  /* ---------- 错误格式：所有失败都回 { code, message, retryable, reason?, field? } ---------- */
  // 要在注册路由之前设定，路由才会套用

  app.setNotFoundHandler((_request, reply) => {
    reply
      .code(404)
      .send({ code: 'API_ERROR', message: '没有这个接口', retryable: false, reason: 'NOT_FOUND' });
  });

  app.setErrorHandler((error, request, reply) => {
    const apiError = toApiError(error);
    if (apiError.status >= 500) {
      request.log.error(error);
    }
    reply.code(apiError.status).send(apiError.toBody());
  });

  /* ---------- 路由：每个文件一组接口 ---------- */

  await app.register(healthRoutes);
  await app.register(authRoutes(deps));
  await app.register(meRoutes(deps));
  await app.register(conversationRoutes(deps));
  await app.register(chatRoutes(deps));

  return app;
}
