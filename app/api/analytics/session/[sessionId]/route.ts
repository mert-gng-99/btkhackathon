import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/db/sessionStore";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const params = await context.params;
  const session = sessionStore.get(params.sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  return NextResponse.json({
    session
  });
}
