import { NextResponse } from "next/server";
import { z } from "zod";
import { AICoachService } from "@/lib/rag/AICoachService";
import { ChunkBuilder } from "@/lib/rag/ChunkBuilder";
import { VectorStoreService } from "@/lib/rag/VectorStoreService";
import { sessionStore } from "@/lib/db/sessionStore";

const BodySchema = z.object({
  sessionId: z.string().min(8),
  question: z.string().min(3).max(500)
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "A session and question are required." }, { status: 400 });
  }

  const session = sessionStore.get(parsed.data.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  const materialChunks = await ChunkBuilder.buildMaterialChunksFromFolder(session.id);
  const indexedMaterials = new VectorStoreService().index(materialChunks);
  const answer = new AICoachService().answerQuestion(parsed.data.question, session.analytics, [...session.chunks, ...indexedMaterials]);

  return NextResponse.json({ answer });
}

