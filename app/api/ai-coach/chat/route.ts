import { NextResponse } from "next/server";
import { z } from "zod";
import { AICoachService } from "@/lib/rag/AICoachService";
import { ChunkBuilder } from "@/lib/rag/ChunkBuilder";
import { VectorStoreService } from "@/lib/rag/VectorStoreService";
import { sessionStore } from "@/lib/db/sessionStore";
import { resolveSession } from "@/lib/db/sessionResolver";
import { TraderProfileService } from "@/lib/ai/TraderProfileService";
import { anonymousTraderRegistry } from "@/lib/traders/AnonymousTraderRegistry";

const BodySchema = z.object({
  sessionId: z.string().min(8),
  question: z.string().min(3).max(500)
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "A session and question are required." }, { status: 400 });
  }

  const session = await resolveSession(parsed.data.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  let traderProfile = session.traderProfile;
  if (!traderProfile) {
    try {
      const profile = await new TraderProfileService().generate(session.analytics, session.trades);
      traderProfile = profile;
      sessionStore.setTraderProfile(session.id, profile);
    } catch {
      traderProfile = undefined;
    }
  }

  if (traderProfile) {
    await anonymousTraderRegistry.upsertFromSession(sessionStore.get(session.id) ?? session, traderProfile).catch(() => null);
  }

  const materialChunks = await ChunkBuilder.buildMaterialChunksFromFolder(session.id);
  const indexedMaterials = new VectorStoreService().index(materialChunks);
  const answer = await new AICoachService().answerQuestion(
    parsed.data.question,
    session.analytics,
    [...session.chunks, ...indexedMaterials],
    traderProfile
  );

  return NextResponse.json({ answer });
}
