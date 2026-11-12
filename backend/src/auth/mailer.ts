/** 寄验证码的服务；之后接正式的寄信服务时，照这个接口再写一个即可 */
export interface Mailer {
  sendRegisterCode(email: string, code: string): Promise<void>;
}

/** 目前使用的版本：不真的寄信，只把验证码印在后端日志里 */
export function createConsoleMailer(logger: { info(message: string): void }): Mailer {
  return {
    async sendRegisterCode(email, code) {
      logger.info(`注册验证码 ${email}：${code}`);
    },
  };
}
