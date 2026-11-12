import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const KEY_LENGTH = 64;
const OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1 };

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/** 密码只存加盐的 scrypt 杂凑，格式：scrypt$盐$杂凑（都是 base64） */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText] = stored.split('$');
  if (scheme !== 'scrypt' || !saltText || !keyText) {
    return false;
  }
  const expected = Buffer.from(keyText, 'base64');
  const actual = await derive(password, Buffer.from(saltText, 'base64'));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
