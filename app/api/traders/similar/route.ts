import { NextResponse } from "next/server";
import { TraderProfileService } from "@/lib/ai/TraderProfileService";
import { sessionStore } from "@/lib/db/sessionStore";
import { anonymousTraderRegistry } from "@/lib/traders/AnonymousTraderRegistry";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  let traderProfile = session.traderProfile;
  if (!traderProfile) {
    traderProfile = await new TraderProfileService().generate(session.analytics, session.trades);
    sessionStore.setTraderProfile(session.id, traderProfile);
  }

  const result = await anonymousTraderRegistry.findSimilar(sessionStore.get(session.id) ?? session, traderProfile);

  return NextResponse.json(result);
}
