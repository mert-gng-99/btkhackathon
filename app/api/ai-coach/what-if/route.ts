import { NextResponse } from "next/server";
import { z } from "zod";
import { CoachToolService } from "@/lib/ai/CoachToolService";
import { resolveSession } from "@/lib/db/sessionResolver";

const BodySchema = z.object({
  sessionId: z.string().min(8),
  skipTradeIds: z.array(z.string()).max(20).optional()
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = await resolveSession(parsed.data.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  const tool = new CoachToolService(session.analytics, session.trades);
  const skipIds =
    parsed.data.skipTradeIds && parsed.data.skipTradeIds.length > 0
      ? parsed.data.skipTradeIds
      : session.analytics.worstTrades.slice(0, 5).map((t) => t.tradeId);

  const result = tool.simulateWhatIf({ skipTradeIds: skipIds });
  return NextResponse.json(result);
}
