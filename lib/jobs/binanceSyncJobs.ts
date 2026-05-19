import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import { BinanceApiError, BinanceService } from "@/lib/binance/BinanceService";
import { TradeNormalizer } from "@/lib/binance/TradeNormalizer";
import { sessionStore } from "@/lib/db/sessionStore";
import { encryptForStorage, decryptFromStorage } from "@/lib/security/crypto";
import { defaultStartTime } from "@/lib/utils/dates";
import { safeErrorMessage } from "@/lib/security/redact";
import type { MarketType, NormalizedTrade, SyncJob } from "@/types";

// Polling-driven incremental sync.
//
// Vercel serverless functions die when their response is returned, so the
// original fire-and-forget background pattern stalled at 0%. We split sync
// into two phases:
//
//   1. start(): runs inside the POST request (Hobby plan: <= 60s). Validates
//      credentials, runs symbol discovery, enqueues every {market, symbol}
//      pair, and stores everything in Upstash Redis (or in-memory for dev).
//   2. advance(): runs inside each polling GET. Dequeues ADVANCE_BATCH_SIZE
//      symbols, fetches their trades concurrently, buffers them in Redis,
//      and updates progress. When the queue is empty, drains the trade
//      buffer into a TradingSession and marks the job completed.
//
// This pattern is bounded only by the user's polling interval and the
// Redis TTL — every scan mode (selected / quoteAssets / all) works.

const ADVANCE_BATCH_SIZE = Math.max(
  1,
  Math.min(20, Number(process.env.BINANCE_ADVANCE_BATCH ?? "12"))
);
const JOB_TTL_SECONDS = 30 * 60;
const MAX_PAGES_PER_SYMBOL = Number(process.env.BINANCE_MAX_PAGES_PER_SYMBOL ?? "5");

interface StartSyncInput {
  apiKey: string;
  apiSecret: string;
  symbols?: string[];
  quoteAssets?: string[];
  scanMode?: "selected" | "quoteAssets" | "all";
  includeMarkets?: MarketType[];
  startTime?: number;
  endTime?: number;
}

interface SyncOptions {
  scanMode: "selected" | "quoteAssets" | "all";
  selectedSymbols?: string[];
  quoteAssets?: string[];
  includeMarkets: MarketType[];
  startTime: number;
  endTime?: number;
}

interface QueueItem {
  marketType: MarketType;
  symbol: string;
}

// -------- Storage layer ------------------------------------------------------

interface JobStorage {
  saveMeta(id: string, job: SyncJob): Promise<void>;
  loadMeta(id: string): Promise<SyncJob | null>;
  saveCreds(id: string, creds: { apiKey: string; apiSecret: string }): Promise<void>;
  loadCreds(id: string): Promise<{ apiKey: string; apiSecret: string } | null>;
  saveOpts(id: string, opts: SyncOptions): Promise<void>;
  loadOpts(id: string): Promise<SyncOptions | null>;
  enqueue(id: string, items: QueueItem[]): Promise<void>;
  dequeue(id: string, count: number): Promise<QueueItem[]>;
  queueSize(id: string): Promise<number>;
  pushTrades(id: string, trades: NormalizedTrade[]): Promise<void>;
  drainTrades(id: string): Promise<NormalizedTrade[]>;
  pushWarning(id: string, warning: string): Promise<void>;
  loadWarnings(id: string): Promise<string[]>;
  destroyWorkData(id: string): Promise<void>;
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstash = Boolean(redisUrl && redisToken);
const redis = hasUpstash ? new Redis({ url: redisUrl!, token: redisToken! }) : null;

function kMeta(id: string) {
  return `syncjob:${id}:meta`;
}
function kCreds(id: string) {
  return `syncjob:${id}:creds`;
}
function kOpts(id: string) {
  return `syncjob:${id}:opts`;
}
function kQueue(id: string) {
  return `syncjob:${id}:queue`;
}
function kTrades(id: string) {
  return `syncjob:${id}:trades`;
}
function kWarnings(id: string) {
  return `syncjob:${id}:warnings`;
}

class RedisStorage implements JobStorage {
  constructor(private readonly r: Redis) {}

  async saveMeta(id: string, job: SyncJob): Promise<void> {
    await this.r.set(kMeta(id), JSON.stringify(job), { ex: JOB_TTL_SECONDS });
  }

  async loadMeta(id: string): Promise<SyncJob | null> {
    const raw = await this.r.get<string>(kMeta(id));
    if (!raw) return null;
    if (typeof raw === "object") return raw as SyncJob;
    try {
      return JSON.parse(raw as string) as SyncJob;
    } catch {
      return null;
    }
  }

  async saveCreds(id: string, creds: { apiKey: string; apiSecret: string }): Promise<void> {
    const blob = encryptForStorage(`${creds.apiKey}\n${creds.apiSecret}`);
    await this.r.set(kCreds(id), blob, { ex: JOB_TTL_SECONDS });
  }

  async loadCreds(id: string): Promise<{ apiKey: string; apiSecret: string } | null> {
    const blob = await this.r.get<string>(kCreds(id));
    if (!blob) return null;
    try {
      const decoded = decryptFromStorage(blob as string);
      const [apiKey, apiSecret] = decoded.split("\n");
      if (!apiKey || !apiSecret) return null;
      return { apiKey, apiSecret };
    } catch {
      return null;
    }
  }

  async saveOpts(id: string, opts: SyncOptions): Promise<void> {
    await this.r.set(kOpts(id), JSON.stringify(opts), { ex: JOB_TTL_SECONDS });
  }

  async loadOpts(id: string): Promise<SyncOptions | null> {
    const raw = await this.r.get<string>(kOpts(id));
    if (!raw) return null;
    if (typeof raw === "object") return raw as SyncOptions;
    try {
      return JSON.parse(raw as string) as SyncOptions;
    } catch {
      return null;
    }
  }

  async enqueue(id: string, items: QueueItem[]): Promise<void> {
    if (items.length === 0) return;
    const serialized = items.map((q) => `${q.marketType}|${q.symbol}`);
    await this.r.rpush(kQueue(id), ...serialized);
    await this.r.expire(kQueue(id), JOB_TTL_SECONDS);
  }

  async dequeue(id: string, count: number): Promise<QueueItem[]> {
    if (count <= 0) return [];
    const popped = (await this.r.lpop(kQueue(id), count)) as string[] | string | null;
    if (!popped) return [];
    const list = Array.isArray(popped) ? popped : [popped];
    return list
      .map((entry) => {
        const idx = entry.indexOf("|");
        if (idx === -1) return null;
        return { marketType: entry.slice(0, idx) as MarketType, symbol: entry.slice(idx + 1) };
      })
      .filter((q): q is QueueItem => q !== null);
  }

  async queueSize(id: string): Promise<number> {
    return (await this.r.llen(kQueue(id))) ?? 0;
  }

  async pushTrades(id: string, trades: NormalizedTrade[]): Promise<void> {
    if (trades.length === 0) return;
    const serialized = trades.map((t) => JSON.stringify(t));
    await this.r.rpush(kTrades(id), ...serialized);
    await this.r.expire(kTrades(id), JOB_TTL_SECONDS);
  }

  async drainTrades(id: string): Promise<NormalizedTrade[]> {
    const all = (await this.r.lrange<string>(kTrades(id), 0, -1)) ?? [];
    await this.r.del(kTrades(id));
    return all
      .map((raw) => {
        if (typeof raw === "object") return raw as NormalizedTrade;
        try {
          return JSON.parse(raw as string) as NormalizedTrade;
        } catch {
          return null;
        }
      })
      .filter((t): t is NormalizedTrade => t !== null);
  }

  async pushWarning(id: string, warning: string): Promise<void> {
    await this.r.rpush(kWarnings(id), warning);
    await this.r.expire(kWarnings(id), JOB_TTL_SECONDS);
  }

  async loadWarnings(id: string): Promise<string[]> {
    const all = (await this.r.lrange<string>(kWarnings(id), 0, -1)) ?? [];
    return all.map((w) => (typeof w === "string" ? w : String(w)));
  }

  async destroyWorkData(id: string): Promise<void> {
    await this.r.del(kCreds(id), kOpts(id), kQueue(id), kTrades(id), kWarnings(id));
  }
}

interface MemoryBucket {
  meta: SyncJob | null;
  creds: { apiKey: string; apiSecret: string } | null;
  opts: SyncOptions | null;
  queue: QueueItem[];
  trades: NormalizedTrade[];
  warnings: string[];
}

class MemoryStorage implements JobStorage {
  private buckets = new Map<string, MemoryBucket>();

  private bucket(id: string): MemoryBucket {
    const existing = this.buckets.get(id);
    if (existing) return existing;
    const fresh: MemoryBucket = {
      meta: null,
      creds: null,
      opts: null,
      queue: [],
      trades: [],
      warnings: []
    };
    this.buckets.set(id, fresh);
    return fresh;
  }

  async saveMeta(id: string, job: SyncJob): Promise<void> {
    this.bucket(id).meta = job;
  }
  async loadMeta(id: string): Promise<SyncJob | null> {
    return this.buckets.get(id)?.meta ?? null;
  }
  async saveCreds(id: string, creds: { apiKey: string; apiSecret: string }): Promise<void> {
    this.bucket(id).creds = creds;
  }
  async loadCreds(id: string): Promise<{ apiKey: string; apiSecret: string } | null> {
    return this.buckets.get(id)?.creds ?? null;
  }
  async saveOpts(id: string, opts: SyncOptions): Promise<void> {
    this.bucket(id).opts = opts;
  }
  async loadOpts(id: string): Promise<SyncOptions | null> {
    return this.buckets.get(id)?.opts ?? null;
  }
  async enqueue(id: string, items: QueueItem[]): Promise<void> {
    this.bucket(id).queue.push(...items);
  }
  async dequeue(id: string, count: number): Promise<QueueItem[]> {
    return this.bucket(id).queue.splice(0, count);
  }
  async queueSize(id: string): Promise<number> {
    return this.bucket(id).queue.length;
  }
  async pushTrades(id: string, trades: NormalizedTrade[]): Promise<void> {
    this.bucket(id).trades.push(...trades);
  }
  async drainTrades(id: string): Promise<NormalizedTrade[]> {
    const all = this.bucket(id).trades;
    this.bucket(id).trades = [];
    return all;
  }
  async pushWarning(id: string, warning: string): Promise<void> {
    this.bucket(id).warnings.push(warning);
  }
  async loadWarnings(id: string): Promise<string[]> {
    return [...this.bucket(id).warnings];
  }
  async destroyWorkData(id: string): Promise<void> {
    const b = this.bucket(id);
    b.creds = null;
    b.opts = null;
    b.queue = [];
    b.trades = [];
    b.warnings = [];
  }
}

const storage: JobStorage = redis ? new RedisStorage(redis) : new MemoryStorage();

// -------- Helpers ------------------------------------------------------------

function createInitialJob(): SyncJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    warnings: [],
    progress: {
      totalSymbols: 0,
      scannedSymbols: 0,
      symbolsWithTrades: 0,
      tradesFound: 0,
      message: "Queued"
    }
  };
}

async function patchMeta(
  id: string,
  patch: Omit<Partial<SyncJob>, "progress"> & { progress?: Partial<SyncJob["progress"]> }
): Promise<SyncJob | null> {
  const current = await storage.loadMeta(id);
  if (!current) return null;
  const next: SyncJob = {
    ...current,
    ...patch,
    progress: { ...current.progress, ...patch.progress },
    updatedAt: new Date().toISOString()
  };
  await storage.saveMeta(id, next);
  return next;
}

function labelMarket(marketType: MarketType): string {
  if (marketType === "spot") return "Spot";
  if (marketType === "um_futures") return "USD-M Futures";
  return "COIN-M Futures";
}

async function fetchAndNormalize(
  service: BinanceService,
  jobId: string,
  marketType: MarketType,
  symbol: string,
  options: { startTime?: number; endTime?: number }
): Promise<NormalizedTrade[]> {
  if (marketType === "spot") {
    const raw = await service.fetchTradesForSymbol(symbol, { ...options, maxPages: MAX_PAGES_PER_SYMBOL });
    return TradeNormalizer.fromBinanceSpot(jobId, symbol, raw);
  }
  if (marketType === "um_futures") {
    const raw = await service.fetchUmFuturesTradesForSymbol(symbol, { ...options, maxPages: MAX_PAGES_PER_SYMBOL });
    return TradeNormalizer.fromBinanceFutures(jobId, "um_futures", symbol, raw);
  }
  const raw = await service.fetchCoinFuturesTradesForSymbol(symbol, { ...options, maxPages: MAX_PAGES_PER_SYMBOL });
  return TradeNormalizer.fromBinanceFutures(jobId, "coin_futures", symbol, raw);
}

// -------- Public API --------------------------------------------------------

export const binanceSyncJobs = {
  /**
   * Start a sync job: validate credentials, discover symbols across requested
   * markets, persist them to Redis, and return a `running` job. Discovery is
   * synchronous (within the POST request budget of ~60s on Hobby).
   */
  async start(input: StartSyncInput): Promise<SyncJob> {
    const job = createInitialJob();
    await storage.saveMeta(job.id, job);

    const includeMarkets: MarketType[] = input.includeMarkets?.length
      ? input.includeMarkets
      : ["spot", "um_futures"];
    const scanMode = input.scanMode ?? "quoteAssets";
    const startTime = input.startTime ?? defaultStartTime();
    const endTime = input.endTime;

    const opts: SyncOptions = {
      scanMode,
      selectedSymbols: input.symbols,
      quoteAssets: input.quoteAssets,
      includeMarkets,
      startTime,
      endTime
    };

    try {
      await patchMeta(job.id, {
        status: "running",
        progress: { message: "Validating Binance API key permissions" }
      });

      const service = new BinanceService(input.apiKey, input.apiSecret);
      const validation = await service.validateCredentials();
      const warnings = [...validation.warnings];

      if (!validation.isReadOnly) {
        const failed = await patchMeta(job.id, {
          status: "failed",
          error: validation.blockers.join(" "),
          warnings,
          progress: { message: "Sync failed" }
        });
        return failed ?? job;
      }

      await patchMeta(job.id, {
        warnings,
        progress: { message: "Discovering symbols across selected markets" }
      });

      const symbolPlan: Array<{ marketType: MarketType; symbols: string[] }> = [];

      if (includeMarkets.includes("spot")) {
        try {
          const symbols = await service.discoverTradeSymbols({
            mode: scanMode,
            selectedSymbols: input.symbols,
            quoteAssets: input.quoteAssets
          });
          symbolPlan.push({ marketType: "spot", symbols });
        } catch (error) {
          warnings.push(`Spot discovery failed: ${safeErrorMessage(error)}`);
        }
      }

      if (includeMarkets.includes("um_futures")) {
        try {
          const symbols = await service.discoverUmFuturesSymbols(
            { mode: scanMode, selectedSymbols: input.symbols, quoteAssets: input.quoteAssets },
            startTime,
            endTime
          );
          symbolPlan.push({ marketType: "um_futures", symbols });
        } catch (error) {
          warnings.push(`USD-M Futures discovery failed: ${safeErrorMessage(error)}`);
        }
      }

      if (includeMarkets.includes("coin_futures")) {
        try {
          const symbols = await service.discoverCoinFuturesSymbols(
            { mode: scanMode, selectedSymbols: input.symbols, quoteAssets: input.quoteAssets },
            startTime,
            endTime
          );
          symbolPlan.push({ marketType: "coin_futures", symbols });
        } catch (error) {
          warnings.push(`COIN-M Futures discovery failed: ${safeErrorMessage(error)}`);
        }
      }

      const queueItems: QueueItem[] = [];
      for (const plan of symbolPlan) {
        for (const symbol of plan.symbols) queueItems.push({ marketType: plan.marketType, symbol });
      }

      const totalSymbols = queueItems.length;
      await storage.saveCreds(job.id, { apiKey: input.apiKey, apiSecret: input.apiSecret });
      await storage.saveOpts(job.id, opts);
      await storage.enqueue(job.id, queueItems);
      for (const w of warnings) await storage.pushWarning(job.id, w);

      const ready = await patchMeta(job.id, {
        warnings,
        progress: {
          totalSymbols,
          message:
            totalSymbols > 0
              ? `Discovered ${totalSymbols} symbols. Scanning in batches of ${ADVANCE_BATCH_SIZE}.`
              : "No symbols matched the selected filters."
        }
      });

      if (totalSymbols === 0) {
        return await this.advance(job.id) ?? ready ?? job;
      }

      return ready ?? job;
    } catch (error) {
      const failed = await patchMeta(job.id, {
        status: "failed",
        error: safeErrorMessage(error),
        progress: { message: "Sync failed" }
      });
      return failed ?? job;
    }
  },

  /**
   * Process exactly one batch of queued symbols and return. We deliberately
   * stay short (~2-4s per call) so the UI gets a fresh progress snapshot on
   * every poll instead of waiting tens of seconds for one mega-call.
   *
   * When the queue is empty, drain the trade buffer into a TradingSession
   * and mark the job completed.
   */
  async advance(id: string): Promise<SyncJob | null> {
    let meta = await storage.loadMeta(id);
    if (!meta) return null;
    if (meta.status === "completed" || meta.status === "failed") return meta;

    // Finalize path: queue empty.
    const initialSize = await storage.queueSize(id);
    if (initialSize === 0) {
      const trades = await storage.drainTrades(id);
      const warnings = await storage.loadWarnings(id);
      const session =
        trades.length > 0
          ? sessionStore.createFromTrades(trades, warnings)
          : sessionStore.createEmpty(warnings);
      const final = await patchMeta(id, {
        status: "completed",
        sessionId: session.id,
        warnings: session.warnings,
        progress: {
          currentMarket: undefined,
          currentSymbol: undefined,
          tradesFound: session.trades.length,
          message: `Completed. Found ${session.trades.length} trades across ${session.analytics.symbolSummaries.length} symbols.`
        }
      });
      await storage.destroyWorkData(id);
      return final ?? meta;
    }

    const creds = await storage.loadCreds(id);
    const opts = await storage.loadOpts(id);
    if (!creds || !opts) {
      const failed = await patchMeta(id, {
        status: "failed",
        error: "Job credentials expired or unavailable.",
        progress: { message: "Sync failed" }
      });
      return failed ?? meta;
    }

    const batch = await storage.dequeue(id, ADVANCE_BATCH_SIZE);
    if (batch.length === 0) {
      // Race: queue went empty between size check and dequeue. Next poll
      // will hit the finalize branch.
      return meta;
    }

    const service = new BinanceService(creds.apiKey, creds.apiSecret);

    let scanned = meta.progress.scannedSymbols;
    let withTrades = meta.progress.symbolsWithTrades;
    let tradesFound = meta.progress.tradesFound;
    let lastMarket: MarketType | undefined = meta.progress.currentMarket;
    let lastSymbol: string | undefined = meta.progress.currentSymbol;

    const collectedTrades: NormalizedTrade[] = [];

    await Promise.all(
      batch.map(async ({ marketType, symbol }) => {
        try {
          const normalized = await fetchAndNormalize(service, id, marketType, symbol, {
            startTime: opts.startTime,
            endTime: opts.endTime
          });
          if (normalized.length > 0) {
            collectedTrades.push(...normalized);
            withTrades += 1;
            tradesFound += normalized.length;
          }
          scanned += 1;
          lastMarket = marketType;
          lastSymbol = symbol;
        } catch (error) {
          const msg = error instanceof BinanceApiError ? error.message : safeErrorMessage(error);
          await storage.pushWarning(id, `${labelMarket(marketType)} ${symbol}: ${msg}`);
          scanned += 1;
        }
      })
    );

    if (collectedTrades.length > 0) {
      await storage.pushTrades(id, collectedTrades);
    }

    const warnings = await storage.loadWarnings(id);
    const remainingAfter = await storage.queueSize(id);

    const updated = await patchMeta(id, {
      warnings,
      progress: {
        currentMarket: lastMarket,
        currentSymbol: lastSymbol,
        scannedSymbols: scanned,
        symbolsWithTrades: withTrades,
        tradesFound,
        message:
          remainingAfter > 0
            ? `Scanning ${labelMarket(lastMarket ?? "spot")} ${lastSymbol ?? ""}. ${scanned}/${meta.progress.totalSymbols} scanned.`
            : `Wrapping up. ${scanned}/${meta.progress.totalSymbols} scanned.`
      }
    });

    return updated ?? meta;
  },

  async get(id: string): Promise<SyncJob | null> {
    return storage.loadMeta(id);
  }
};
