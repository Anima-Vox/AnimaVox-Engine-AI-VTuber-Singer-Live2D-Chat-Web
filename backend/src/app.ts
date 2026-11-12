import cors from '@fastify/cors';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { AppDeps } from './context';
import { toApiError } from './errors';
import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chat';
import { conversationRoutes } from './routes/conversations';
import { healthRoutes } from './routes/health';
import { meRoutes } from './routes/me';

/**
 * 建立后端应用（不监听端口）。server.ts 负责启动；测试直接用 app.inject 发请求。
 * 所有接口都在 /api 底下（正式环境前后端同一个网域，/api 交给后端）。
 */
export async function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  const origins = deps.env.CORS_ORIGIN.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  await app.register(cors, {
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 错误处理器要在注册路由之前设定，路由才会继承
  // 找不到的路径也按约定格式回
  app.setNotFoundHandler((_request, reply) => {
    reply
      .code(404)
      .send({ code: 'API_ERROR', message: '没有这个接口', retryable: false, reason: 'NOT_FOUND' });
  });

  // 所有错误都转成 { code, message, retryable, reason?, field? }
  app.setErrorHandler((error, request, reply) => {
    const apiError = toApiError(error);
    if (apiError.status >= 500) {
      request.log.error(error);
    }
    reply.code(apiError.status).send(apiError.toBody());
  });

  await app.register(healthRoutes(deps));
  await app.register(authRoutes(deps));
  await app.register(meRoutes(deps));
  await app.register(conversationRoutes(deps));
  await app.register(chatRoutes(deps));

  return app;
}
