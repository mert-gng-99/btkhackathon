import { randomUUID } from "crypto";
import { BinanceApiError, BinanceService } from "@/lib/binance/BinanceService";
import { TradeNormalizer } from "@/lib/binance/TradeNormalizer";
import { sessionStore } from "@/lib/db/sessionStore";
import { defaultStartTime } from "@/lib/utils/dates";
import { safeErrorMessage } from "@/lib/security/redact";
import type { MarketType, NormalizedTrade, SyncJob } from "@/types";

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

const globalJobs = globalThis as unknown as {
  binanceSyncJobs?: Map<string, SyncJob>;
};

const jobs = globalJobs.binanceSyncJobs ?? new Map<string, SyncJob>();
globalJobs.binanceSyncJobs = jobs;

type SyncJobPatch = Omit<Partial<SyncJob>, "progress"> & {
  progress?: Partial<SyncJob["progress"]>;
};

function updateJob(id: string, patch: SyncJobPatch) {
  const current = jobs.get(id);
  if (!current) {
    return;
  }

  jobs.set(id, {
    ...current,
    ...patch,
    progress: {
      ...current.progress,
      ...patch.progress
    },
    updatedAt: new Date().toISOString()
  });
}

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

export const binanceSyncJobs = {
  start(input: StartSyncInput): SyncJob {
    const job = createInitialJob();
    jobs.set(job.id, job);
    void runSyncJob(job.id, input);
    return job;
  },

  get(id: string): SyncJob | null {
    return jobs.get(id) ?? null;
  }
};

async function runSyncJob(jobId: string, input: StartSyncInput) {
  const service = new BinanceService(input.apiKey, input.apiSecret);
  const warnings: string[] = [];
  const trades: NormalizedTrade[] = [];
  const includeMarkets = input.includeMarkets?.length ? input.includeMarkets : ["spot", "um_futures"];
  const scanMode = input.scanMode ?? "quoteAssets";
  const startTime = input.startTime ?? defaultStartTime();
  const endTime = input.endTime;

  try {
    updateJob(jobId, {
      status: "running",
      progress: {
        message: "Validating Binance API key permissions"
      }
    });

    const validation = await service.validateCredentials();
    warnings.push(...validation.warnings);

    if (!validation.isReadOnly) {
      throw new Error(validation.blockers.join(" "));
    }

    updateJob(jobId, {
      warnings,
      progress: {
        message: "Discovering symbols across selected markets"
      }
    });

    const symbolPlan: Array<{ marketType: MarketType; symbols: string[] }> = [];

    if (includeMarkets.includes("spot")) {
      const symbols = await service.discoverTradeSymbols({
        mode: scanMode,
        selectedSymbols: input.symbols,
        quoteAssets: input.quoteAssets
      });
      symbolPlan.push({ marketType: "spot", symbols });
    }

    if (includeMarkets.includes("um_futures")) {
      try {
        const symbols = await service.discoverUmFuturesSymbols(
          {
            mode: scanMode,
            selectedSymbols: input.symbols,
            quoteAssets: input.quoteAssets
          },
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
          {
            mode: scanMode,
            selectedSymbols: input.symbols,
            quoteAssets: input.quoteAssets
          },
          startTime,
          endTime
        );
        symbolPlan.push({ marketType: "coin_futures", symbols });
      } catch (error) {
        warnings.push(`COIN-M Futures discovery failed: ${safeErrorMessage(error)}`);
      }
    }

    const totalSymbols = symbolPlan.reduce((sum, plan) => sum + plan.symbols.length, 0);
    updateJob(jobId, {
      warnings,
      progress: {
        totalSymbols,
        message: `Discovered ${totalSymbols} symbols. Starting history scan.`
      }
    });

    for (const plan of symbolPlan) {
      await scanSymbolsConcurrently({
        jobId,
        service,
        marketType: plan.marketType,
        symbols: plan.symbols,
        trades,
        warnings,
        startTime,
        endTime
      });
    }

    const session = trades.length > 0 ? sessionStore.createFromTrades(trades, warnings) : sessionStore.createEmpty(warnings);
    updateJob(jobId, {
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
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      error: safeErrorMessage(error),
      warnings,
      progress: {
        message: "Sync failed"
      }
    });
  }
}

async function scanSymbolsConcurrently(input: {
  jobId: string;
  service: BinanceService;
  marketType: MarketType;
  symbols: string[];
  trades: NormalizedTrade[];
  warnings: string[];
  startTime?: number;
  endTime?: number;
}) {
  const concurrency = Math.max(1, Math.min(12, Number(process.env.BINANCE_SYNC_CONCURRENCY ?? "6")));
  let cursor = 0;

  async function worker() {
    for (;;) {
      const symbol = input.symbols[cursor];
      cursor += 1;

      if (!symbol) {
        return;
      }

      updateJob(input.jobId, {
        progress: {
          currentMarket: input.marketType,
          currentSymbol: symbol,
          message: `Scanning ${labelMarket(input.marketType)} ${symbol}`
        }
      });

      try {
        const normalized = await fetchAndNormalize(input.service, input.jobId, input.marketType, symbol, {
          startTime: input.startTime,
          endTime: input.endTime,
          maxPages: Number(process.env.BINANCE_MAX_PAGES_PER_SYMBOL ?? "5")
        });
        input.trades.push(...normalized);

        const current = jobs.get(input.jobId);
        updateJob(input.jobId, {
          progress: {
            scannedSymbols: (current?.progress.scannedSymbols ?? 0) + 1,
            symbolsWithTrades: (current?.progress.symbolsWithTrades ?? 0) + (normalized.length > 0 ? 1 : 0),
            tradesFound: input.trades.length,
            message: normalized.length > 0 ? `Found ${normalized.length} trades on ${symbol}` : `No trades on ${symbol}`
          }
        });
      } catch (error) {
        const message = error instanceof BinanceApiError ? error.message : safeErrorMessage(error);
        input.warnings.push(`${labelMarket(input.marketType)} ${symbol}: ${message}`);
        const current = jobs.get(input.jobId);
        updateJob(input.jobId, {
          warnings: input.warnings,
          progress: {
            scannedSymbols: (current?.progress.scannedSymbols ?? 0) + 1,
            message: `Skipped ${symbol}: ${message}`
          }
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, input.symbols.length) }, () => worker()));
}

async function fetchAndNormalize(
  service: BinanceService,
  jobId: string,
  marketType: MarketType,
  symbol: string,
  options: { startTime?: number; endTime?: number; maxPages?: number }
): Promise<NormalizedTrade[]> {
  if (marketType === "spot") {
    const raw = await service.fetchTradesForSymbol(symbol, options);
    return TradeNormalizer.fromBinanceSpot(jobId, symbol, raw);
  }

  if (marketType === "um_futures") {
    const raw = await service.fetchUmFuturesTradesForSymbol(symbol, options);
    return TradeNormalizer.fromBinanceFutures(jobId, "um_futures", symbol, raw);
  }

  const raw = await service.fetchCoinFuturesTradesForSymbol(symbol, options);
  return TradeNormalizer.fromBinanceFutures(jobId, "coin_futures", symbol, raw);
}

function labelMarket(marketType: MarketType): string {
  if (marketType === "spot") return "Spot";
  if (marketType === "um_futures") return "USD-M Futures";
  return "COIN-M Futures";
}
