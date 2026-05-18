import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

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

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth;
  const path = nextUrl.pathname;

  const isProtectedPage = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => path.startsWith(p));
  const isProtectedApi =
    !isPublicApi && PROTECTED_API_PREFIXES.some((p) => path.startsWith(p));

  if (isProtectedApi && !isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isProtectedPage && !isAuthed) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)",
  ],
};
