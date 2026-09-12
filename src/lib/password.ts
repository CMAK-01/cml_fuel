import { scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computedHash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  // Use timingSafeEqual to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
  } catch {
    return false;
  }
}
