import { NextResponse } from "next/server";

/** Parse a JSON request body, returning null instead of throwing on bad input. */
export async function parseJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function badRequest(message = "Request body must be valid JSON.") {
  return NextResponse.json({ error: "invalid_request", message }, { status: 400 });
}

export function serverError(message = "Something went wrong. Please try again.") {
  return NextResponse.json({ error: "server_error", message }, { status: 500 });
}
