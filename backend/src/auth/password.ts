import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * 密码不存原文，只存加盐的 scrypt 杂凑。
 * 存进数据库的格式：scrypt$盐$杂凑（盐与杂凑都是 base64）。
 */

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** 注册时：把密码变成可以存进数据库的字串 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** 登录时：检查输入的密码和数据库里存的是否相符 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, salt = '', key = ''] = stored.split('$');
  const expected = Buffer.from(key, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
