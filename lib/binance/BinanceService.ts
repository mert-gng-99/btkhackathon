import { createHmac } from "crypto";
import type {
  BinanceAccountResponse,
  BinanceApiRestrictionsResponse,
  BinanceExchangeInfoResponse,
  BinanceFuturesExchangeInfoResponse,
  BinanceFuturesIncome,
  BinanceRawFuturesTrade,
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
const DEFAULT_UM_FUTURES_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT"];
const DEFAULT_COIN_FUTURES_SYMBOLS = ["BTCUSD_PERP", "ETHUSD_PERP", "BNBUSD_PERP", "SOLUSD_PERP", "XRPUSD_PERP", "ADAUSD_PERP", "DOGEUSD_PERP", "AVAXUSD_PERP", "LINKUSD_PERP"];

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
  private readonly umFuturesBaseUrl: string;
  private readonly coinFuturesBaseUrl: string;

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string
  ) {
    this.baseUrl = process.env.BINANCE_BASE_URL ?? "https://api.binance.com";
    this.umFuturesBaseUrl = process.env.BINANCE_UM_FUTURES_BASE_URL ?? "https://fapi.binance.com";
    this.coinFuturesBaseUrl = process.env.BINANCE_COIN_FUTURES_BASE_URL ?? "https://dapi.binance.com";
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
    return this.uniqueSymbols([...selectedSymbols, ...discovered]);
  }

  async discoverUmFuturesSymbols(options: DiscoverSymbolsOptions, startTime?: number, endTime?: number): Promise<string[]> {
    if (options.mode === "selected") {
      return this.uniqueSymbols(options.selectedSymbols?.length ? options.selectedSymbols : BinanceService.getDefaultSymbols());
    }

    const incomeSymbols = await this.fetchUmFuturesIncomeSymbols(startTime, endTime).catch(() => []);
    if (options.mode === "quoteAssets") {
      return this.uniqueSymbols([...(options.selectedSymbols ?? []), ...incomeSymbols, ...DEFAULT_UM_FUTURES_SYMBOLS]);
    }

    const exchangeInfo = await this.publicGet<BinanceFuturesExchangeInfoResponse>("/fapi/v1/exchangeInfo", {}, this.umFuturesBaseUrl);
    const quoteAssets = new Set((options.quoteAssets?.length ? options.quoteAssets : ["USDT", "USDC"]).map((asset) => asset.toUpperCase()));
    const discovered = exchangeInfo.symbols
      .filter((symbol) => symbol.status === "TRADING")
      .filter((symbol) => options.mode === "all" || (symbol.quoteAsset ? quoteAssets.has(symbol.quoteAsset) : true))
      .map((symbol) => symbol.symbol);

    return this.uniqueSymbols([...(options.selectedSymbols ?? []), ...incomeSymbols, ...discovered]);
  }

  async discoverCoinFuturesSymbols(options: DiscoverSymbolsOptions, startTime?: number, endTime?: number): Promise<string[]> {
    if (options.mode === "selected") {
      return this.uniqueSymbols(options.selectedSymbols?.length ? options.selectedSymbols : DEFAULT_COIN_FUTURES_SYMBOLS);
    }

    const incomeSymbols = await this.fetchCoinFuturesIncomeSymbols(startTime, endTime).catch(() => []);
    if (options.mode === "quoteAssets") {
      return this.uniqueSymbols([...incomeSymbols, ...DEFAULT_COIN_FUTURES_SYMBOLS]);
    }

    const exchangeInfo = await this.publicGet<BinanceFuturesExchangeInfoResponse>("/dapi/v1/exchangeInfo", {}, this.coinFuturesBaseUrl);
    const quoteAssets = new Set((options.quoteAssets?.length ? options.quoteAssets : ["USD"]).map((asset) => asset.toUpperCase()));
    const discovered = exchangeInfo.symbols
      .filter((symbol) => symbol.contractStatus === "TRADING")
      .filter((symbol) => options.mode === "all" || (symbol.quoteAsset ? quoteAssets.has(symbol.quoteAsset) : true))
      .map((symbol) => symbol.symbol);

    return this.uniqueSymbols([...incomeSymbols, ...discovered]);
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

  async fetchUmFuturesTradesForSymbol(symbol: string, options: FetchTradesOptions = {}): Promise<BinanceRawFuturesTrade[]> {
    return this.fetchWindowedFuturesTrades("/fapi/v1/userTrades", this.umFuturesBaseUrl, symbol, options, 180);
  }

  async fetchCoinFuturesTradesForSymbol(symbol: string, options: FetchTradesOptions = {}): Promise<BinanceRawFuturesTrade[]> {
    return this.fetchWindowedFuturesTrades("/dapi/v1/userTrades", this.coinFuturesBaseUrl, symbol, options, 365);
  }

  private async fetchUmFuturesIncomeSymbols(startTime?: number, endTime?: number): Promise<string[]> {
    const rows = await this.fetchFuturesIncome("/fapi/v1/income", this.umFuturesBaseUrl, startTime, endTime, 180);
    return this.symbolsFromIncome(rows);
  }

  private async fetchCoinFuturesIncomeSymbols(startTime?: number, endTime?: number): Promise<string[]> {
    const rows = await this.fetchFuturesIncome("/dapi/v1/income", this.coinFuturesBaseUrl, startTime, endTime, 365);
    return this.symbolsFromIncome(rows);
  }

  private async fetchFuturesIncome(path: string, baseUrl: string, startTime?: number, endTime?: number, maxLookbackDays = 90): Promise<BinanceFuturesIncome[]> {
    const now = Date.now();
    const cappedStart = Math.max(startTime ?? now - maxLookbackDays * 24 * 60 * 60 * 1000, now - maxLookbackDays * 24 * 60 * 60 * 1000);
    const cappedEnd = endTime ?? now;
    const collected: BinanceFuturesIncome[] = [];
    const windowMs = 89 * 24 * 60 * 60 * 1000;

    for (let cursor = cappedStart; cursor <= cappedEnd; cursor += windowMs + 1) {
      const windowEnd = Math.min(cappedEnd, cursor + windowMs);
      for (let page = 1; page <= 10; page += 1) {
        const rows = await this.signedGet<BinanceFuturesIncome[]>(
          path,
          {
            startTime: cursor,
            endTime: windowEnd,
            page,
            limit: 1000
          },
          baseUrl
        );
        collected.push(...rows);
        if (rows.length < 1000) {
          break;
        }
      }
    }

    return collected;
  }

  private async fetchWindowedFuturesTrades(path: string, baseUrl: string, symbol: string, options: FetchTradesOptions, maxLookbackDays: number): Promise<BinanceRawFuturesTrade[]> {
    const now = Date.now();
    const end = options.endTime ?? now;
    const start = Math.max(options.startTime ?? end - maxLookbackDays * 24 * 60 * 60 * 1000, now - maxLookbackDays * 24 * 60 * 60 * 1000);
    const maxWindows = Number(process.env.BINANCE_FUTURES_MAX_WINDOWS_PER_SYMBOL ?? "30");
    const windowMs = 7 * 24 * 60 * 60 * 1000 - 1;
    const collected: BinanceRawFuturesTrade[] = [];
    const seen = new Set<string>();

    for (let cursor = start, windowIndex = 0; cursor <= end && windowIndex < maxWindows; cursor += windowMs + 1, windowIndex += 1) {
      const windowEnd = Math.min(end, cursor + windowMs);
      const rows = await this.signedGet<BinanceRawFuturesTrade[]>(
        path,
        {
          symbol: symbol.toUpperCase(),
          startTime: cursor,
          endTime: windowEnd,
          limit: 1000
        },
        baseUrl
      );

      for (const row of rows) {
        const key = String(row.id);
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(row);
        }
      }
    }

    return collected.sort((a, b) => a.time - b.time);
  }

  private async signedGet<T>(path: string, params: Record<string, string | number | boolean>, baseUrl = this.baseUrl): Promise<T> {
    const timestamp = Date.now();
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries({ ...params, recvWindow: 5000, timestamp })) {
      query.set(key, String(value));
    }

    const signature = createHmac("sha256", this.apiSecret).update(query.toString()).digest("hex");
    query.set("signature", signature);

    const response = await fetch(`${baseUrl}${path}?${query.toString()}`, {
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

  private async publicGet<T>(path: string, params: Record<string, string | number | boolean>, baseUrl = this.baseUrl): Promise<T> {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      query.set(key, String(value));
    }

    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const response = await fetch(`${baseUrl}${path}${suffix}`, {
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

  private symbolsFromIncome(rows: BinanceFuturesIncome[]): string[] {
    return this.uniqueSymbols(rows.map((row) => row.symbol).filter((symbol) => symbol && symbol.length > 0));
  }

  private uniqueSymbols(symbols: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const symbol of symbols) {
      const normalized = symbol.toUpperCase().trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      unique.push(normalized);
    }

    return unique;
  }
}
