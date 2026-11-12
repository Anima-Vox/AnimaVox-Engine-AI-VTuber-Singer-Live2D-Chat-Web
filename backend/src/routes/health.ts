import type { FastifyPluginAsync } from 'fastify';

/** GET /api/health：确认后端有在运行（端到端测试启动时用它等后端就绪） */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async () => ({ status: 'ok' }));
};
