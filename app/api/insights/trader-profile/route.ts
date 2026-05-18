import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/db/sessionStore";
import { TraderProfileService } from "@/lib/ai/TraderProfileService";
import { anonymousTraderRegistry } from "@/lib/traders/AnonymousTraderRegistry";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const refresh = url.searchParams.get("refresh") === "1";

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  const service = new TraderProfileService();

  if (session.traderProfile && !refresh) {
    await anonymousTraderRegistry.upsertFromSession(session, session.traderProfile).catch(() => null);

    return NextResponse.json({
      configured: service.isConfigured(),
      cached: true,
      generatedAt: session.traderProfileGeneratedAt,
      profile: session.traderProfile
    });
  }

  try {
    const profile = await service.generate(session.analytics, session.trades);
    const updated = sessionStore.setTraderProfile(session.id, profile);
    await anonymousTraderRegistry.upsertFromSession(updated ?? session, profile).catch(() => null);

    return NextResponse.json({
      configured: service.isConfigured(),
      cached: false,
      generatedAt: updated?.traderProfileGeneratedAt,
      profile
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Trader profile generation failed."
      },
      { status: 500 }
    );
  }
}
