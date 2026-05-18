import { createHmac } from "crypto";
import type {
  BinanceAccountResponse,
  BinanceApiRestrictionsResponse,
  BinanceExchangeInfoResponse,
  BinanceRawTrade,
  DiscoverSymbolsOptions,
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

const DEFAULT_QUOTE_ASSETS = ["USDT", "USDC", "FDUSD", "BTC", "ETH", "BNB", "TRY", "EUR"];

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
  permissionFlags: BinanceApiRestrictionsResponse;
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

  static getDefaultQuoteAssets(): string[] {
    const configured = process.env.BINANCE_DEFAULT_QUOTE_ASSETS;
    if (!configured) {
      return DEFAULT_QUOTE_ASSETS;
    }

    return configured
      .split(",")
      .map((asset) => asset.trim().toUpperCase())
      .filter(Boolean);
  }

  async validateCredentials(): Promise<BinanceValidationResult> {
    const restrictions = await this.getApiRestrictions();
    const readOnly = validateReadOnlyPermissions(restrictions);
    const account = await this.getAccount().catch(() => ({} as BinanceAccountResponse));

    return {
      isValid: true,
      isReadOnly: readOnly.isReadOnly,
      accountType: account.accountType,
      permissions: this.permissionLabels(restrictions),
      permissionFlags: restrictions,
      blockers: readOnly.blockers,
      warnings: readOnly.warnings
    };
  }

  async getAccount(): Promise<BinanceAccountResponse> {
    return this.signedGet<BinanceAccountResponse>("/api/v3/account", {});
  }

  async getApiRestrictions(): Promise<BinanceApiRestrictionsResponse> {
    return this.signedGet<BinanceApiRestrictionsResponse>("/sapi/v1/account/apiRestrictions", {});
  }

  async discoverTradeSymbols(options: DiscoverSymbolsOptions): Promise<string[]> {
    if (options.mode === "selected") {
      return Array.from(new Set((options.selectedSymbols?.length ? options.selectedSymbols : BinanceService.getDefaultSymbols()).map((symbol) => symbol.toUpperCase().trim()).filter(Boolean)));
    }

    const exchangeInfo = await this.publicGet<BinanceExchangeInfoResponse>("/api/v3/exchangeInfo", {});
    const quoteAssets = new Set((options.quoteAssets?.length ? options.quoteAssets : BinanceService.getDefaultQuoteAssets()).map((asset) => asset.toUpperCase()));
    const spotSymbols = exchangeInfo.symbols.filter((symbol) => symbol.isSpotTradingAllowed !== false);
    const discovered = spotSymbols
      .filter((symbol) => options.mode === "all" || quoteAssets.has(symbol.quoteAsset))
      .map((symbol) => symbol.symbol);

    const selectedSymbols = options.selectedSymbols ?? [];
    return Array.from(new Set([...selectedSymbols, ...discovered].map((symbol) => symbol.toUpperCase().trim()).filter(Boolean))).sort();
  }

  async fetchTradesForSymbols(symbols: string[], options: FetchTradesOptions = {}): Promise<SymbolFetchResult[]> {
    const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.toUpperCase().trim()).filter(Boolean)));
    const results: SymbolFetchResult[] = [];
    const symbolDelayMs = Number(process.env.BINANCE_SYMBOL_SCAN_DELAY_MS ?? "120");

    for (let index = 0; index < uniqueSymbols.length; index += 1) {
      const symbol = uniqueSymbols[index];
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

      if (index < uniqueSymbols.length - 1 && symbolDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, symbolDelayMs));
      }
    }

    return results;
  }

  async fetchTradesForSymbolsWithProgress(
    symbols: string[],
    options: FetchTradesOptions = {}
  ): Promise<SymbolFetchResult[]> {
    return this.fetchTradesForSymbols(symbols, options);
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

  private async publicGet<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      query.set(key, String(value));
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const response = await fetch(`${this.baseUrl}${path}${suffix}`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { msg?: string; code?: number } | null;
      throw new BinanceApiError(body?.msg ?? `Binance request failed with status ${response.status}`, response.status, body?.code);
    }

    return (await response.json()) as T;
  }

  private permissionLabels(restrictions: BinanceApiRestrictionsResponse): string[] {
    const labels: Array<[keyof BinanceApiRestrictionsResponse, string]> = [
      ["enableReading", "Reading"],
      ["enableSpotAndMarginTrading", "Spot & Margin Trading"],
      ["enableWithdrawals", "Withdrawals"],
      ["enableInternalTransfer", "Internal Transfer"],
      ["permitsUniversalTransfer", "Universal Transfer"],
      ["enableMargin", "Margin"],
      ["enableFutures", "Futures"],
      ["enableVanillaOptions", "Vanilla Options"],
      ["enableFixApiTrade", "FIX API Trade"],
      ["enableFixReadOnly", "FIX API Read Only"],
      ["enablePortfolioMarginTrading", "Portfolio Margin Trading"]
    ];

    return labels.filter(([flag]) => restrictions[flag] === true).map(([, label]) => label);
  }
}
