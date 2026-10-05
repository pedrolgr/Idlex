import crypto from "node:crypto";
import argon2 from "argon2";

/**
 * OWASP recommended parameters for Argon2id
 * memoryCost: 19456 KiB (19 MiB)
 * timeCost: 2 iterations
 * parallelism: 1 thread
 */
export const ARGON2_OPTIONS = {
  type: 2 as const, // argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  const hasher = (argon2 as any).hash || argon2;
  return hasher(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    const verifier = (argon2 as any).verify || argon2;
    return await verifier(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Constant time dummy hash check to prevent timing attacks when user does not exist
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzdHJpbmc$3T6Z+H9a8a7H9yK3A3jFpY/hE4sV0qZ3b8J1zV4pX0U";

export async function dummyVerifyPassword(plain: string): Promise<boolean> {
  try {
    const verifier = (argon2 as any).verify || argon2;
    await verifier(DUMMY_HASH, plain);
  } catch {}
  return false;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
