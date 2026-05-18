import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/db/sessionStore";
import { buildDemoTrades } from "@/lib/mock/demoData";

export async function POST() {
  const session = sessionStore.createFromTrades(buildDemoTrades(), [
    "Demo data is synthetic and does not represent a real Binance account."
  ]);

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    analytics: session.analytics,
    warnings: session.warnings
  });
}

