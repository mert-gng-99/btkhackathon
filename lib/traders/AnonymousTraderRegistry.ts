import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { AnalyticsData, PublicTraderProfile, StoredSession, TraderProfile } from "@/types";

type RegistryRecord = PublicTraderProfile;

const globalRegistry = globalThis as unknown as {
  anonymousTraderProfiles?: Map<string, RegistryRecord>;
  anonymousTraderFollows?: Set<string>;
};

const memoryProfiles = globalRegistry.anonymousTraderProfiles ?? new Map<string, RegistryRecord>();
const memoryFollows = globalRegistry.anonymousTraderFollows ?? new Set<string>();

globalRegistry.anonymousTraderProfiles = memoryProfiles;
globalRegistry.anonymousTraderFollows = memoryFollows;

function shouldUseDatabase(): boolean {
  return process.env.TRADER_REGISTRY_STORAGE === "database";
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function ratio(part: number, whole: number): number {
  return whole > 0 ? clamp(part / whole) : 0;
}

function anonymousIdForSession(sessionId: string): string {
  const salt = process.env.ANONYMIZATION_SALT ?? "readonly-alpha-dev-salt";
  return createHash("sha256").update(`${salt}:${sessionId}`).digest("hex").slice(0, 16);
}

function followKey(followerAnonymousId: string, targetAnonymousId: string): string {
  return `${followerAnonymousId}:${targetAnonymousId}`;
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function successRateFromAnalytics(analytics: AnalyticsData): number | null {
  const scoredHours = analytics.hourlyBehavior.filter((hour) => hour.pnlSamples > 0);
  const totalSamples = scoredHours.reduce((sum, hour) => sum + hour.pnlSamples, 0);

  if (totalSamples === 0) {
    return null;
  }

  const winningSamples = scoredHours.reduce((sum, hour) => sum + hour.winningTrades, 0);
  return clamp(winningSamples / totalSamples);
}

function publicProfileFromSession(session: StoredSession, traderProfile: TraderProfile): PublicTraderProfile {
  const analytics = session.analytics;
  const anonymousId = anonymousIdForSession(session.id);
  const topSymbols = analytics.symbolSummaries.slice(0, 3).map((symbol) => symbol.symbol);
  const topVolume = analytics.symbolSummaries[0]?.volume ?? 0;
  const primaryMarket =
    [...analytics.marketBreakdown].sort((a, b) => b.trades - a.trades)[0]?.marketType.replace("_", " ") ?? "unknown";
  const traderTypeWords = traderProfile.traderType
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

  return {
    anonymousId,
    displayName: `${traderTypeWords || "Trader"} ${anonymousId.slice(0, 4).toUpperCase()}`,
    traderType: traderProfile.traderType,
    confidence: traderProfile.confidence,
    successRate: successRateFromAnalytics(analytics),
    buyRatio: clamp(analytics.buySell.buyRatio),
    rapidTradeRatio: ratio(analytics.rapidTradeCount, analytics.totalTrades),
    lateNightRatio: ratio(analytics.lateNightTradeCount, analytics.totalTrades),
    feeToVolumeRatio: analytics.totalVolume > 0 ? clamp(analytics.quoteFeeEstimate / analytics.totalVolume) : 0,
    topSymbolShare: analytics.totalVolume > 0 ? clamp(topVolume / analytics.totalVolume) : 0,
    tradeCount: analytics.totalTrades,
    activeDays: analytics.activeDays,
    primaryMarket,
    topSymbols,
    behavioralTags: traderProfile.behavioralTags.slice(0, 8),
    updatedAt: new Date().toISOString()
  };
}

function similarityScore(current: PublicTraderProfile, candidate: PublicTraderProfile): number {
  const currentSuccess = current.successRate ?? 0.5;
  const candidateSuccess = candidate.successRate ?? 0.5;
  const numericDistance =
    Math.abs(currentSuccess - candidateSuccess) * 1.4 +
    Math.abs(current.buyRatio - candidate.buyRatio) +
    Math.abs(current.rapidTradeRatio - candidate.rapidTradeRatio) +
    Math.abs(current.lateNightRatio - candidate.lateNightRatio) +
    Math.abs(current.feeToVolumeRatio - candidate.feeToVolumeRatio) * 3 +
    Math.abs(current.topSymbolShare - candidate.topSymbolShare) +
    Math.abs(Math.log1p(current.tradeCount) - Math.log1p(candidate.tradeCount)) / 5;

  const sharedTags = current.behavioralTags.filter((tag) => candidate.behavioralTags.includes(tag)).length;
  const sharedSymbols = current.topSymbols.filter((symbol) => candidate.topSymbols.includes(symbol)).length;
  const sameTypeBoost = current.traderType === candidate.traderType ? 12 : 0;
  const marketBoost = current.primaryMarket === candidate.primaryMarket ? 5 : 0;
  const rawScore = 100 - numericDistance * 28 + sharedTags * 4 + sharedSymbols * 3 + sameTypeBoost + marketBoost;

  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

function memoryUpsert(profile: PublicTraderProfile): PublicTraderProfile {
  const previous = memoryProfiles.get(profile.anonymousId);
  const updated = {
    ...previous,
    ...profile,
    updatedAt: new Date().toISOString()
  };
  memoryProfiles.set(profile.anonymousId, updated);
  return updated;
}

async function databaseUpsert(profile: PublicTraderProfile): Promise<PublicTraderProfile> {
  const saved = await prisma.anonymousTraderProfile.upsert({
    where: { anonymousId: profile.anonymousId },
    update: {
      displayName: profile.displayName,
      traderType: profile.traderType,
      confidence: profile.confidence,
      successRate: profile.successRate,
      buyRatio: profile.buyRatio,
      rapidTradeRatio: profile.rapidTradeRatio,
      lateNightRatio: profile.lateNightRatio,
      feeToVolumeRatio: profile.feeToVolumeRatio,
      topSymbolShare: profile.topSymbolShare,
      tradeCount: profile.tradeCount,
      activeDays: profile.activeDays,
      primaryMarket: profile.primaryMarket,
      topSymbolsJson: profile.topSymbols as Prisma.InputJsonValue,
      behavioralTagsJson: profile.behavioralTags as Prisma.InputJsonValue
    },
    create: {
      anonymousId: profile.anonymousId,
      displayName: profile.displayName,
      traderType: profile.traderType,
      confidence: profile.confidence,
      successRate: profile.successRate,
      buyRatio: profile.buyRatio,
      rapidTradeRatio: profile.rapidTradeRatio,
      lateNightRatio: profile.lateNightRatio,
      feeToVolumeRatio: profile.feeToVolumeRatio,
      topSymbolShare: profile.topSymbolShare,
      tradeCount: profile.tradeCount,
      activeDays: profile.activeDays,
      primaryMarket: profile.primaryMarket,
      topSymbolsJson: profile.topSymbols as Prisma.InputJsonValue,
      behavioralTagsJson: profile.behavioralTags as Prisma.InputJsonValue
    }
  });

  return fromDatabaseRecord(saved);
}

function fromDatabaseRecord(record: {
  anonymousId: string;
  displayName: string;
  traderType: string;
  confidence: string;
  successRate: number | null;
  buyRatio: number;
  rapidTradeRatio: number;
  lateNightRatio: number;
  feeToVolumeRatio: number;
  topSymbolShare: number;
  tradeCount: number;
  activeDays: number;
  primaryMarket: string;
  topSymbolsJson: unknown;
  behavioralTagsJson: unknown;
  updatedAt: Date;
}): PublicTraderProfile {
  return {
    anonymousId: record.anonymousId,
    displayName: record.displayName,
    traderType: record.traderType,
    confidence: record.confidence === "high" || record.confidence === "medium" || record.confidence === "low" ? record.confidence : "medium",
    successRate: record.successRate,
    buyRatio: record.buyRatio,
    rapidTradeRatio: record.rapidTradeRatio,
    lateNightRatio: record.lateNightRatio,
    feeToVolumeRatio: record.feeToVolumeRatio,
    topSymbolShare: record.topSymbolShare,
    tradeCount: record.tradeCount,
    activeDays: record.activeDays,
    primaryMarket: record.primaryMarket,
    topSymbols: parseStringArray(record.topSymbolsJson),
    behavioralTags: parseStringArray(record.behavioralTagsJson),
    updatedAt: record.updatedAt.toISOString()
  };
}

export const anonymousTraderRegistry = {
  anonymousIdForSession,

  async upsertFromSession(session: StoredSession, traderProfile: TraderProfile): Promise<PublicTraderProfile> {
    const profile = publicProfileFromSession(session, traderProfile);

    if (shouldUseDatabase()) {
      try {
        return await databaseUpsert(profile);
      } catch {
        return memoryUpsert(profile);
      }
    }

    return memoryUpsert(profile);
  },

  async findSimilar(session: StoredSession, traderProfile: TraderProfile, limit = 12): Promise<{
    current: PublicTraderProfile;
    traders: PublicTraderProfile[];
    storage: "database" | "memory";
  }> {
    const current = await this.upsertFromSession(session, traderProfile);
    const followerAnonymousId = current.anonymousId;

    if (shouldUseDatabase()) {
      try {
        const [profiles, follows] = await Promise.all([
          prisma.anonymousTraderProfile.findMany({
            where: {
              anonymousId: { not: current.anonymousId }
            },
            orderBy: { updatedAt: "desc" },
            take: 80
          }),
          prisma.anonymousTraderFollow.findMany({
            where: { followerAnonymousId }
          })
        ]);
        const followed = new Set(follows.map((follow) => follow.targetAnonymousId));
        const traders = profiles
          .map(fromDatabaseRecord)
          .map((profile) => ({
            ...profile,
            similarityScore: similarityScore(current, profile),
            followedByCurrentUser: followed.has(profile.anonymousId)
          }))
          .sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0))
          .slice(0, limit);

        return { current, traders, storage: "database" };
      } catch {
        // Fall back to memory below.
      }
    }

    const traders = [...memoryProfiles.values()]
      .filter((profile) => profile.anonymousId !== current.anonymousId)
      .map((profile) => ({
        ...profile,
        similarityScore: similarityScore(current, profile),
        followedByCurrentUser: memoryFollows.has(followKey(followerAnonymousId, profile.anonymousId))
      }))
      .sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0))
      .slice(0, limit);

    return { current, traders, storage: "memory" };
  },

  async follow(session: StoredSession, traderProfile: TraderProfile, targetAnonymousId: string): Promise<{ followed: boolean; storage: "database" | "memory" }> {
    const current = await this.upsertFromSession(session, traderProfile);

    if (current.anonymousId === targetAnonymousId) {
      return { followed: false, storage: shouldUseDatabase() ? "database" : "memory" };
    }

    if (shouldUseDatabase()) {
      try {
        await prisma.anonymousTraderFollow.upsert({
          where: {
            followerAnonymousId_targetAnonymousId: {
              followerAnonymousId: current.anonymousId,
              targetAnonymousId
            }
          },
          update: {},
          create: {
            followerAnonymousId: current.anonymousId,
            targetAnonymousId
          }
        });
        return { followed: true, storage: "database" };
      } catch {
        // Fall back to memory below.
      }
    }

    memoryFollows.add(followKey(current.anonymousId, targetAnonymousId));
    return { followed: true, storage: "memory" };
  }
};
