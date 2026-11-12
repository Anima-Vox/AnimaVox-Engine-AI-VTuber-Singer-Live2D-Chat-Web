import { createHash, randomBytes, randomInt } from 'node:crypto';

/** 登录 token：一长串随机字，只在登录成功时交给前端一次 */
export function createToken(): string {
  return randomBytes(32).toString('base64url');
}

/** 数据库里只存 token 与验证码的 SHA-256，即使数据库外泄也不能直接拿来登录 */
export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** 6 位数字验证码 */
export function createEmailCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}
