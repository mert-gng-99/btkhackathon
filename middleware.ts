import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { limiterForPath } from "./lib/security/ratelimit";

const { auth } = NextAuth(authConfig);

// Pages that require either a real auth session OR an active demo session cookie.
const DEMO_OR_AUTH_PAGES = ["/dashboard", "/insights", "/ai-coach", "/trades"];
// Pages that always require a real auth session (real Binance key, trader network).
const AUTH_ONLY_PAGES = ["/connect", "/traders"];

const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/demo/"];

// APIs the demo flow must reach (read mock session, generate insights, coach, export).
const DEMO_OR_AUTH_APIS = [
  "/api/ai-coach/",
  "/api/analytics/",
  "/api/export/",
  "/api/insights/",
];
// APIs that always require real auth (real Binance keys, trader network).
const AUTH_ONLY_APIS = [
  "/api/binance/",
  "/api/traders/",
];

const DEMO_COOKIE = "tl_demo";

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
  const hasDemoSession = !!req.cookies.get(DEMO_COOKIE)?.value;
  const path = nextUrl.pathname;

  const matches = (prefixes: string[]) =>
    prefixes.some((p) => path === p || path.startsWith(`${p}/`));

  const isAuthOnlyPage = matches(AUTH_ONLY_PAGES);
  const isDemoOrAuthPage = matches(DEMO_OR_AUTH_PAGES);
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => path.startsWith(p));
  const isAuthOnlyApi = !isPublicApi && AUTH_ONLY_APIS.some((p) => path.startsWith(p));
  const isDemoOrAuthApi = !isPublicApi && DEMO_OR_AUTH_APIS.some((p) => path.startsWith(p));

  // Auth gating
  if (isAuthOnlyApi && !isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoOrAuthApi && !isAuthed && !hasDemoSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isAuthOnlyPage && !isAuthed) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }
  if (isDemoOrAuthPage && !isAuthed && !hasDemoSession) {
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
