import { describe, it, expect } from "vitest";
import { parseJsonBody, badRequest, serverError } from "@/lib/server/http";

describe("parseJsonBody", () => {
  it("parses valid JSON", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
      headers: { "content-type": "application/json" }
    });
    expect(await parseJsonBody<{ a: number }>(req)).toEqual({ a: 1 });
  });

  it("returns null for invalid JSON instead of throwing", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      body: "{not-json",
      headers: { "content-type": "application/json" }
    });
    expect(await parseJsonBody(req)).toBeNull();
  });
});

describe("badRequest / serverError", () => {
  it("badRequest returns 400 with a default message", async () => {
    const res = badRequest();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(body.message).toMatch(/JSON/i);
  });

  it("serverError returns 500 with a default message", async () => {
    const res = serverError();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("server_error");
  });

  it("accepts custom messages", async () => {
    expect(await badRequest("nope").json()).toMatchObject({ message: "nope" });
    expect(await serverError("boom").json()).toMatchObject({ message: "boom" });
  });
});
