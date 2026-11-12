import { createHash, randomBytes, randomInt } from 'node:crypto';

/** 登录 token：只交给前端一次，数据库只存它的 SHA-256，外泄的数据库无法直接拿来登录 */
export function createToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** 6 位数字验证码 */
export function createEmailCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}
