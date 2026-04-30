import { randomBytes, createHash } from "node:crypto";
import type { Environment } from "@ib/db";

const PROD_PREFIX = "prod_";
const DEV_PREFIX = "dev_";

/**
 * Generate a fresh API key plaintext. Returned ONCE — only the SHA-256 hash is
 * stored in the database.
 */
export function generateApiKey(env: Environment): string {
  const prefix = env === "PROD" ? PROD_PREFIX : DEV_PREFIX;
  // 32 random bytes → 64 hex chars; combined with the prefix that is well past
  // the 128-bit secret threshold.
  const body = randomBytes(32).toString("base64url");
  return `${prefix}${body}`;
}

export async function hashApiKey(plaintext: string): Promise<string> {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** First 12 chars of a key's plaintext, used as a UI hint after the secret is
 *  rotated out of memory. Includes the env prefix. */
export function prefixOf(plaintext: string): string {
  return plaintext.slice(0, 12);
}

export function environmentOfKey(plaintext: string): Environment | null {
  if (plaintext.startsWith(PROD_PREFIX)) return "PROD";
  if (plaintext.startsWith(DEV_PREFIX)) return "DEV";
  return null;
}
