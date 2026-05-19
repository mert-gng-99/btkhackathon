import { cookies } from "next/headers";
import { sessionStore } from "./sessionStore";
import { buildDemoTrades } from "@/lib/mock/demoData";
import type { StoredSession } from "@/types";

const DEMO_COOKIE = "tl_demo";

/**
 * Resolve a session by id, with cross-instance lookup + demo recovery.
 *
 * Sessions live in two layers: a per-instance in-memory cache and Upstash
 * Redis (the cross-instance source of truth). getCrossInstance() checks
 * both. If the session is not in either, and the requester has a tl_demo
 * cookie matching the id, we rebuild the deterministic demo session on
 * this instance — useful when the demo Lambda is cold-started fresh.
 */
export async function resolveSession(sessionId: string): Promise<StoredSession | null> {
  const found = await sessionStore.getCrossInstance(sessionId);
  if (found) return found;

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
