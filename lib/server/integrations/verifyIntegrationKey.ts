import { timingSafeEqual } from "node:crypto";

const HEADER = "x-integration-key";

export function verifyGmsIntegrationKey(req: Request): boolean {
  const expected = process.env.GMS_INTEGRATION_API_KEY;
  if (!expected) return false;

  const provided = req.headers.get(HEADER) ?? "";
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
