import { HealthResponseSchema } from '@shared';
import type { FastifyPluginAsync } from 'fastify';
import type { AppDeps } from '../context';

export function healthRoutes(deps: AppDeps): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/health', async () =>
      HealthResponseSchema.parse({
        status: 'ok',
        service: 'animavox-backend',
        version: '0.2.0',
        llmMode: deps.llm.mode,
        uptime: Math.round(process.uptime()),
      }),
    );
  };
}
