import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import { AnalyticsService } from "@/lib/analytics/AnalyticsService";
import { InsightGenerator } from "@/lib/analytics/InsightGenerator";
import { ChunkBuilder } from "@/lib/rag/ChunkBuilder";
import { ReportService } from "@/lib/rag/ReportService";
import { VectorStoreService } from "@/lib/rag/VectorStoreService";
import type { NormalizedTrade, StoredSession, TraderProfile } from "@/types";

const SESSION_TTL_HOURS = 24;
const SESSION_TTL_SECONDS = SESSION_TTL_HOURS * 60 * 60;

const globalStore = globalThis as unknown as {
  tradeAnalyticsSessions?: Map<string, StoredSession>;
};

const sessions = globalStore.tradeAnalyticsSessions ?? new Map<string, StoredSession>();
globalStore.tradeAnalyticsSessions = sessions;

// Upstash Redis is the source of truth across Vercel function instances.
// In-memory Map above is a per-instance hot cache for the same-request fast path.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

function sessionKey(id: string): string {
  return `session:${id}`;
}

function expiresAt(): string {
  return new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (new Date(session.expiresAt).getTime() <= now) {
      sessions.delete(id);
    }
  }
}

async function persistSession(session: StoredSession): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(sessionKey(session.id), JSON.stringify(session), { ex: SESSION_TTL_SECONDS });
  } catch {
    // Best-effort persistence; in-memory cache still holds the session
    // for this instance.
  }
}

async function loadSession(id: string): Promise<StoredSession | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<string | StoredSession>(sessionKey(id));
    if (!raw) return null;
    if (typeof raw === "object") return raw as StoredSession;
    return JSON.parse(raw as string) as StoredSession;
  } catch {
    return null;
  }
}

export const sessionStore = {
  createFromTrades(trades: NormalizedTrade[], warnings: string[] = [], targetSessionId?: string): StoredSession {
    cleanupExpired();

    const sessionId = targetSessionId ?? randomUUID();
    const withSessionId = trades.map((trade) => ({
      ...trade,
      sessionId,
      id: `${sessionId}:binance:${trade.marketType}:${trade.symbol}:${trade.tradeId}`
    }));

    const initialAnalytics = AnalyticsService.compute(withSessionId);
    const generatedInsights = InsightGenerator.generate(initialAnalytics, withSessionId);
    const analytics = AnalyticsService.compute(withSessionId, generatedInsights);
    const chunks = new VectorStoreService().index(ChunkBuilder.buildSessionChunks(sessionId, analytics, withSessionId));
    const reports = [
      ReportService.generate(sessionId, "daily", analytics),
      ReportService.generate(sessionId, "weekly", analytics),
      ReportService.generate(sessionId, "monthly", analytics)
    ];

    const session: StoredSession = {
      id: sessionId,
      source: "binance",
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt(),
      trades: withSessionId,
      analytics,
      chunks,
      reports,
      warnings
    };

    sessions.set(sessionId, session);
    void persistSession(session);
    return session;
  },

  createEmpty(warnings: string[] = []): StoredSession {
    const initialAnalytics = AnalyticsService.compute([]);
    const generatedInsights = InsightGenerator.generate(initialAnalytics, []);
    const analytics = AnalyticsService.compute([], generatedInsights);
    const sessionId = randomUUID();
    const chunks = new VectorStoreService().index(ChunkBuilder.buildSessionChunks(sessionId, analytics, []));

    const session: StoredSession = {
      id: sessionId,
      source: "binance",
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt(),
      trades: [],
      analytics,
      chunks,
      reports: [
        ReportService.generate(sessionId, "daily", analytics),
        ReportService.generate(sessionId, "weekly", analytics),
        ReportService.generate(sessionId, "monthly", analytics)
      ],
      warnings
    };

    sessions.set(session.id, session);
    void persistSession(session);
    return session;
  },

  get(id: string): StoredSession | null {
    cleanupExpired();
    return sessions.get(id) ?? null;
  },

  // Cross-instance lookup: tries the in-memory cache first, then Redis.
  // Used by resolveSession so any function instance can serve a session
  // that was created by another instance.
  async getCrossInstance(id: string): Promise<StoredSession | null> {
    cleanupExpired();
    const local = sessions.get(id);
    if (local) return local;
    const remote = await loadSession(id);
    if (remote) {
      sessions.set(id, remote);
      return remote;
    }
    return null;
  },

  setTraderProfile(id: string, profile: TraderProfile): StoredSession | null {
    cleanupExpired();
    const session = sessions.get(id);

    if (!session) {
      return null;
    }

    const updated: StoredSession = {
      ...session,
      traderProfile: profile,
      traderProfileGeneratedAt: new Date().toISOString()
    };

    sessions.set(id, updated);
    void persistSession(updated);
    return updated;
  }
};
