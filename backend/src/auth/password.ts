import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// scrypt is built into Node — no bcrypt/argon2 native dependency needed (same rationale as
// avoiding better-sqlite3: fewer things that can fail to compile on a given machine).
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, KEY_LENGTH);
  // Lengths must match before timingSafeEqual — it throws on mismatched buffer sizes.
  if (hashBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(hashBuffer, suppliedBuffer);
}
