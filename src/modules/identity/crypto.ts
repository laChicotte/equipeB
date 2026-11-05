import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';

const N = 131072, r = 8, p = 1;
let active = 0;
const waiting: Array<() => void> = [];
async function derive(password: string, salt: string): Promise<Buffer> {
  if (active >= 2) {
    if (waiting.length >= 8) throw new Error('Password processing capacity exceeded');
    await new Promise<void>(resolve => waiting.push(resolve));
  } else { active++; }
  try {
    return await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64,
      { N, r, p, maxmem: 160 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
  } finally {
    const next = waiting.shift();
    if (next) next(); else active--;
  }
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${N}$${r}$${p}$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, encoded?: string): Promise<boolean> {
  const parts = encoded?.split('$');
  const valid = parts?.length === 6 && parts[0] === 'scrypt' && parts[1] === String(N)
    && parts[2] === String(r) && parts[3] === String(p) && /^[a-f0-9]{32}$/.test(parts[4]) && /^[a-f0-9]{128}$/.test(parts[5]);
  const key = await derive(password, valid ? parts![4] : '00000000000000000000000000000000');
  return !!valid && timingSafeEqual(key, Buffer.from(parts![5], 'hex'));
}
export const createToken = () => randomBytes(32).toString('hex');
export const digestToken = (token: string) => createHash('sha256').update(token).digest('hex');
