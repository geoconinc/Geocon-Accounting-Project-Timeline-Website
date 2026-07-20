import { describe, it, expect, afterEach } from "vitest";
import { verifyGmsIntegrationKey } from "@/lib/server/integrations/verifyIntegrationKey";

function requestWithKey(key: string | null): Request {
  const headers = new Headers();
  if (key !== null) headers.set("x-integration-key", key);
  return new Request("https://example.com/api/integrations/gms/projects", {
    method: "POST",
    headers
  });
}

const ORIGINAL = process.env.GMS_INTEGRATION_API_KEY;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.GMS_INTEGRATION_API_KEY;
  else process.env.GMS_INTEGRATION_API_KEY = ORIGINAL;
});

describe("verifyGmsIntegrationKey", () => {
  it("accepts a matching key", () => {
    process.env.GMS_INTEGRATION_API_KEY = "s3cret-key-value";
    expect(verifyGmsIntegrationKey(requestWithKey("s3cret-key-value"))).toBe(true);
  });

  it("rejects a wrong key", () => {
    process.env.GMS_INTEGRATION_API_KEY = "s3cret-key-value";
    expect(verifyGmsIntegrationKey(requestWithKey("wrong"))).toBe(false);
  });

  it("rejects a missing header", () => {
    process.env.GMS_INTEGRATION_API_KEY = "s3cret-key-value";
    expect(verifyGmsIntegrationKey(requestWithKey(null))).toBe(false);
  });

  it("rejects everything when the server key is unset", () => {
    delete process.env.GMS_INTEGRATION_API_KEY;
    expect(verifyGmsIntegrationKey(requestWithKey("anything"))).toBe(false);
  });
});
