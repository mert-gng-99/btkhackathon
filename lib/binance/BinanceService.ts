import { createHmac } from "crypto";
import type {
  BinanceAccountResponse,
  BinanceRawTrade,
  FetchTradesOptions,
  SymbolFetchResult
} from "@/lib/binance/binanceTypes";
import { validateReadOnlyPermissions } from "@/lib/security/permissions";

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "MATICUSDT"
];

export class BinanceApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: number
  ) {
    super(message);
    this.name = "BinanceApiError";
  }
}

export interface BinanceValidationResult {
  isValid: boolean;
  isReadOnly: boolean;
  accountType?: string;
  permissions: string[];
  blockers: string[];
  warnings: string[];
}

export class BinanceService {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string
  ) {
    this.baseUrl = process.env.BINANCE_BASE_URL ?? "https://api.binance.com";
  }

  static getDefaultSymbols(): string[] {
    const configured = process.env.BINANCE_DEFAULT_SYMBOLS;
    if (!configured) {
      return DEFAULT_SYMBOLS;
    }

    return configured
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);
  }

  async validateCredentials(): Promise<BinanceValidationResult> {
    const account = await this.getAccount();
    const readOnly = validateReadOnlyPermissions(account);

    return {
      isValid: true,
      isReadOnly: readOnly.isReadOnly,
      accountType: account.accountType,
      permissions: account.permissions ?? [],
      blockers: readOnly.blockers,
      warnings: readOnly.warnings
    };
  }

  async getAccount(): Promise<BinanceAccountResponse> {
    return this.signedGet<BinanceAccountResponse>("/api/v3/account", {});
  }

  async fetchTradesForSymbols(symbols: string[], options: FetchTradesOptions = {}): Promise<SymbolFetchResult[]> {
    const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.toUpperCase().trim()).filter(Boolean)));
    const results: SymbolFetchResult[] = [];

    for (const symbol of uniqueSymbols) {
      try {
        const trades = await this.fetchTradesForSymbol(symbol, options);
        results.push({ symbol, trades });
      } catch (error) {
        if (error instanceof BinanceApiError && (error.code === -1121 || error.status === 400)) {
          results.push({ symbol, trades: [], warning: `${symbol} is unsupported or has no accessible Spot history.` });
          continue;
        }

        throw error;
      }
    }

    return results;
  }

  async fetchTradesForSymbol(symbol: string, options: FetchTradesOptions = {}): Promise<BinanceRawTrade[]> {
    const maxPages = options.maxPages ?? Number(process.env.BINANCE_MAX_PAGES_PER_SYMBOL ?? "5");
    const endTime = options.endTime;
    let startTime = options.startTime;
    const collected: BinanceRawTrade[] = [];
    const seen = new Set<number>();

    for (let page = 0; page < maxPages; page += 1) {
      const pageTrades = await this.signedGet<BinanceRawTrade[]>("/api/v3/myTrades", {
        symbol: symbol.toUpperCase(),
        limit: 1000,
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {})
      });

      for (const trade of pageTrades) {
        if (!seen.has(trade.id)) {
          seen.add(trade.id);
          collected.push(trade);
        }
      }

      if (pageTrades.length < 1000) {
        break;
      }

      const lastTrade = pageTrades[pageTrades.length - 1];
      const nextStartTime = Number(lastTrade.time) + 1;
      if (!Number.isFinite(nextStartTime) || (startTime && nextStartTime <= startTime)) {
        break;
      }

      startTime = nextStartTime;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    return collected.sort((a, b) => a.time - b.time);
  }

  private async signedGet<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
    const timestamp = Date.now();
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries({ ...params, recvWindow: 5000, timestamp })) {
      query.set(key, String(value));
    }

    const signature = createHmac("sha256", this.apiSecret).update(query.toString()).digest("hex");
    query.set("signature", signature);

    const response = await fetch(`${this.baseUrl}${path}?${query.toString()}`, {
      method: "GET",
      headers: {
        "X-MBX-APIKEY": this.apiKey
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { msg?: string; code?: number } | null;
      throw new BinanceApiError(body?.msg ?? `Binance request failed with status ${response.status}`, response.status, body?.code);
    }

    return (await response.json()) as T;
  }
}

