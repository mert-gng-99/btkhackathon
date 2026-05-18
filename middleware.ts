import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { limiterForPath } from "./lib/security/ratelimit";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/dashboard", "/insights", "/ai-coach", "/connect", "/trades", "/traders"];

const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/demo/"];

const PROTECTED_API_PREFIXES = [
  "/api/binance/",
  "/api/ai-coach/",
  "/api/analytics/",
  "/api/export/",
  "/api/insights/",
  "/api/traders/",
];

function clientKey(req: Parameters<Parameters<typeof auth>[0]>[0]): string {
  const userId = req.auth?.user?.id;
  if (userId) return `u:${userId}`;
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0]?.trim() : null) ?? "anon";
  return `ip:${ip}`;
}

export default auth(async (req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth;
  const path = nextUrl.pathname;

  const isProtectedPage = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => path.startsWith(p));
  const isProtectedApi =
    !isPublicApi && PROTECTED_API_PREFIXES.some((p) => path.startsWith(p));

  // Auth gating
  if (isProtectedApi && !isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isProtectedPage && !isAuthed) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Rate limiting (only for /api/*)
  const match = limiterForPath(path);
  if (match) {
    const key = `${match.key}:${clientKey(req)}`;
    const result = await match.limiter.limit(key);
    if (!result.success) {
      const resetSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too Many Requests", retryAfterSeconds: resetSec },
        {
          status: 429,
          headers: {
            "Retry-After": String(resetSec),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.reset),
          },
        }
      );
    }
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    res.headers.set("X-RateLimit-Reset", String(result.reset));
    return res;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)",
  ],
};
