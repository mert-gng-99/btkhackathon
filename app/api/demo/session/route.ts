import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/db/sessionStore";
import { buildDemoTrades } from "@/lib/mock/demoData";

const DEMO_COOKIE = "tl_demo";
const DEMO_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function POST() {
  const session = sessionStore.createFromTrades(buildDemoTrades(), [
    "Demo data is synthetic and does not represent a real Binance account."
  ]);

  const res = NextResponse.json({
    ok: true,
    sessionId: session.id,
    analytics: session.analytics,
    warnings: session.warnings
  });

  res.cookies.set({
    name: DEMO_COOKIE,
    value: session.id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_TTL_SECONDS
  });

  return res;
}

