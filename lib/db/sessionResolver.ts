import { cookies } from "next/headers";
import { sessionStore } from "./sessionStore";
import { buildDemoTrades } from "@/lib/mock/demoData";
import type { StoredSession } from "@/types";

const DEMO_COOKIE = "tl_demo";

/**
 * Resolve a session by id, with demo recovery.
 *
 * The in-memory sessionStore is per-process. On Vercel each request can
 * hit a different serverless instance, so a demo session created on
 * Lambda A is not visible to Lambda B. If we're asked for a session id
 * that matches the requester's tl_demo cookie, rebuild the demo session
 * with the SAME id on this instance — the demo data is deterministic,
 * so the result is identical regardless of which Lambda serves it.
 */
export async function resolveSession(sessionId: string): Promise<StoredSession | null> {
  const cached = sessionStore.get(sessionId);
  if (cached) return cached;

  const cookieStore = await cookies();
  const demoCookie = cookieStore.get(DEMO_COOKIE)?.value;
  if (demoCookie && demoCookie === sessionId) {
    return sessionStore.createFromTrades(
      buildDemoTrades(),
      ["Demo data is synthetic and does not represent a real Binance account."],
      sessionId
    );
  }

  return null;
}
