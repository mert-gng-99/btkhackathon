import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// In-memory fallback for local dev when UPSTASH_* env vars are not set.
// Each instance keeps its own counters; sufficient for a single dev process.
type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

function memoryLimiter(limit: number, windowSeconds: number) {
  return async (key: string) => {
    const now = Date.now();
    const bucket = memoryBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      const fresh: Bucket = { count: 1, resetAt: now + windowSeconds * 1000 };
      memoryBuckets.set(key, fresh);
      return { success: true, remaining: limit - 1, reset: fresh.resetAt, limit };
    }
    bucket.count += 1;
    return {
      success: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      reset: bucket.resetAt,
      limit,
    };
  };
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstash = Boolean(redisUrl && redisToken);

const redis = hasUpstash
  ? new Redis({ url: redisUrl!, token: redisToken! })
  : null;

function makeLimiter(tokens: number, window: `${number} s` | `${number} m` | `${number} h`) {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      analytics: true,
      prefix: "tradelens",
    });
  }
  const seconds = parseWindowSeconds(window);
  const mem = memoryLimiter(tokens, seconds);
  return {
    limit: async (key: string) => mem(key),
  } as Pick<Ratelimit, "limit">;
}

function parseWindowSeconds(window: string): number {
  const m = /^(\d+)\s*([smh])$/.exec(window);
  if (!m) return 60;
  const n = Number(m[1]);
  const u = m[2];
  return u === "s" ? n : u === "m" ? n * 60 : n * 3600;
}

// Buckets tuned to protect cost / load hotspots:
// - aiCoach: Gemini calls are billed per token, RAG context is large.
// - binanceSync: each request can spawn a multi-symbol scan job.
// - traderWrite: registry mutation — bursty bot abuse risk.
// - api: catch-all for read endpoints.
// - signin: per-IP, blocks credential-stuffing / login spray.
export const limiters = {
  aiCoach: makeLimiter(10, "1 m"),
  binanceSync: makeLimiter(3, "1 m"),
  traderWrite: makeLimiter(20, "1 m"),
  api: makeLimiter(60, "1 m"),
  signin: makeLimiter(5, "1 m"),
} as const;

export type LimiterKey = keyof typeof limiters;

// Pick the right limiter for a given pathname.
export function limiterForPath(pathname: string): { key: LimiterKey; limiter: (typeof limiters)[LimiterKey] } | null {
  if (pathname.startsWith("/api/ai-coach/")) return { key: "aiCoach", limiter: limiters.aiCoach };
  if (pathname.startsWith("/api/binance/sync")) return { key: "binanceSync", limiter: limiters.binanceSync };
  if (pathname.startsWith("/api/traders/") && pathname !== "/api/traders/similar") {
    return { key: "traderWrite", limiter: limiters.traderWrite };
  }
  if (pathname.startsWith("/api/auth/signin") || pathname.startsWith("/api/auth/callback/")) {
    return { key: "signin", limiter: limiters.signin };
  }
  if (pathname.startsWith("/api/")) return { key: "api", limiter: limiters.api };
  return null;
}

export const RATE_LIMIT_ENABLED = hasUpstash || process.env.NODE_ENV !== "production";
