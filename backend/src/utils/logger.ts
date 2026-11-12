import { pino } from 'pino';
import { env } from '../config/env';

/** 后端日志：开发时用彩色、好读的格式（pino-pretty），其他环境输出 JSON */
export const logger =
  env.NODE_ENV === 'development'
    ? pino({
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      })
    : pino();
