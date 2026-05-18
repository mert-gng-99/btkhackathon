import { randomUUID } from "crypto";
import { AnalyticsService } from "@/lib/analytics/AnalyticsService";
import { InsightGenerator } from "@/lib/analytics/InsightGenerator";
import { ChunkBuilder } from "@/lib/rag/ChunkBuilder";
import { ReportService } from "@/lib/rag/ReportService";
import { VectorStoreService } from "@/lib/rag/VectorStoreService";
import type { NormalizedTrade, StoredSession, TraderProfile } from "@/types";

const SESSION_TTL_HOURS = 24;

const globalStore = globalThis as unknown as {
  tradeAnalyticsSessions?: Map<string, StoredSession>;
};

const sessions = globalStore.tradeAnalyticsSessions ?? new Map<string, StoredSession>();
globalStore.tradeAnalyticsSessions = sessions;

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

export const sessionStore = {
  createFromTrades(trades: NormalizedTrade[], warnings: string[] = []): StoredSession {
    cleanupExpired();

    const sessionId = randomUUID();
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
    return session;
  },

  get(id: string): StoredSession | null {
    cleanupExpired();
    return sessions.get(id) ?? null;
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
    return updated;
  }
};
