import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/db/sessionStore";
import { tradesToCsv } from "@/lib/utils/csv";

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

  return new NextResponse(tradesToCsv(session.trades), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="binance-trades-${sessionId}.csv"`
    }
  });
}

