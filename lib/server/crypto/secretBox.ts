import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Symmetric encryption for secrets stored at rest (SMTP password, Graph secret).
// AES-256-GCM with a 32-byte key derived from CONFIG_ENCRYPTION_KEY. The master key
// lives only in the environment (Azure App Service settings), never in the database,
// so a database dump alone cannot reveal the plaintext secrets.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "v1:";

/** Derives a stable 32-byte key from the configured passphrase. Returns null if unset. */
function deriveKey(): Buffer | null {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) return null;
  return createHash("sha256").update(raw, "utf8").digest();
}

/** True when a master key is configured and secrets can be encrypted/decrypted. */
export function isSecretEncryptionAvailable(): boolean {
  return deriveKey() !== null;
}

/**
 * Encrypts a plaintext secret. Returns a `v1:`-prefixed base64 blob of iv + authTag +
 * ciphertext. Throws if no master key is configured (callers must guard with
 * isSecretEncryptionAvailable to surface a clear admin-facing error instead).
 */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  if (!key) throw new Error("CONFIG_ENCRYPTION_KEY is not set");

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypts a blob produced by encryptSecret. Returns null on any failure (missing key,
 * tampered data, wrong key) so a bad secret degrades to "email not configured" rather
 * than throwing inside the send path.
 */
export function decryptSecret(blob: string): string | null {
  const key = deriveKey();
  if (!key) return null;
  if (!blob.startsWith(PREFIX)) return null;

  try {
    const packed = Buffer.from(blob.slice(PREFIX.length), "base64");
    const iv = packed.subarray(0, IV_LENGTH);
    const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
