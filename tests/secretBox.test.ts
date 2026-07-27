import { describe, it, expect, afterEach } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  isSecretEncryptionAvailable
} from "@/lib/server/crypto/secretBox";

const ORIGINAL_KEY = process.env.CONFIG_ENCRYPTION_KEY;

function setKey(value: string | undefined) {
  if (value === undefined) delete process.env.CONFIG_ENCRYPTION_KEY;
  else process.env.CONFIG_ENCRYPTION_KEY = value;
}

afterEach(() => setKey(ORIGINAL_KEY));

describe("secretBox with a configured key", () => {
  it("round-trips a secret", () => {
    setKey("test-master-key");
    const blob = encryptSecret("hunter2");
    expect(blob.startsWith("v1:")).toBe(true);
    expect(blob).not.toContain("hunter2");
    expect(decryptSecret(blob)).toBe("hunter2");
  });

  it("produces different ciphertext each time (random IV)", () => {
    setKey("test-master-key");
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("returns null for tampered ciphertext", () => {
    setKey("test-master-key");
    const blob = encryptSecret("secret");
    const tampered = blob.slice(0, -3) + "AAA";
    expect(decryptSecret(tampered)).toBeNull();
  });

  it("returns null when decrypting with a different key", () => {
    setKey("key-a");
    const blob = encryptSecret("secret");
    setKey("key-b");
    expect(decryptSecret(blob)).toBeNull();
  });

  it("returns null for an unrecognised blob format", () => {
    setKey("test-master-key");
    expect(decryptSecret("not-a-blob")).toBeNull();
  });

  it("reports encryption as available", () => {
    setKey("test-master-key");
    expect(isSecretEncryptionAvailable()).toBe(true);
  });
});

describe("secretBox without a key", () => {
  it("reports encryption as unavailable", () => {
    setKey(undefined);
    expect(isSecretEncryptionAvailable()).toBe(false);
  });

  it("throws when encrypting", () => {
    setKey(undefined);
    expect(() => encryptSecret("secret")).toThrow();
  });

  it("returns null when decrypting", () => {
    setKey("test-master-key");
    const blob = encryptSecret("secret");
    setKey(undefined);
    expect(decryptSecret(blob)).toBeNull();
  });
});
