import { NextResponse } from "next/server";
import { z } from "zod";
import { TraderProfileService } from "@/lib/ai/TraderProfileService";
import { sessionStore } from "@/lib/db/sessionStore";
import { resolveSession } from "@/lib/db/sessionResolver";
import { anonymousTraderRegistry } from "@/lib/traders/AnonymousTraderRegistry";

const BodySchema = z.object({
  sessionId: z.string().min(8),
  targetAnonymousId: z.string().min(8).max(64)
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId and targetAnonymousId are required." }, { status: 400 });
  }

  const session = await resolveSession(parsed.data.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  let traderProfile = session.traderProfile;
  if (!traderProfile) {
    traderProfile = await new TraderProfileService().generate(session.analytics, session.trades);
    sessionStore.setTraderProfile(session.id, traderProfile);
  }

  const result = await anonymousTraderRegistry.follow(sessionStore.get(session.id) ?? session, traderProfile, parsed.data.targetAnonymousId);

  return NextResponse.json({
    ok: result.followed,
    ...result
  });
}
