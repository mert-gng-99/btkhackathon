import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/db/sessionStore";
import { TraderProfileService } from "@/lib/ai/TraderProfileService";

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

  try {
    const service = new TraderProfileService();
    const profile = await service.generate(session.analytics, session.trades);

    return NextResponse.json({
      configured: service.isConfigured(),
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

