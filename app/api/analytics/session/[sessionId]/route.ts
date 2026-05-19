import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/db/sessionResolver";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const params = await context.params;
  const session = await resolveSession(params.sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  return NextResponse.json({
    session
  });
}
