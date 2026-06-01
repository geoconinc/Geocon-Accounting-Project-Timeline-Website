import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/login", "/api/microsoft-login", "/api/verify-session", "/api/cron"];

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/logo.png" ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json({ error: "unauthorized" }, { status: 401 })
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  if (pathname.startsWith("/api/") && req.method !== "GET") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return addSecurityHeaders(
        NextResponse.json({ error: "invalid_origin" }, { status: 403 })
      );
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
