import type { FastifyBaseLogger } from 'fastify';

/** 寄验证码的服务；之后接正式寄信服务时实作这个接口即可 */
export interface Mailer {
  /** true = 只是印在后端日志里（开发用），接口会把验证码一起回传方便测试 */
  readonly isDevelopment: boolean;
  sendRegisterCode(email: string, code: string): Promise<void>;
}

/** 开发用：不真的寄信，把验证码印在后端日志里 */
export function createConsoleMailer(logger: Pick<FastifyBaseLogger, 'info'>): Mailer {
  return {
    isDevelopment: true,
    async sendRegisterCode(email, code) {
      logger.info(`【开发模式】注册验证码 ${email}：${code}`);
    },
  };
}
