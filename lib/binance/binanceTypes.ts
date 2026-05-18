export interface BinanceAccountResponse {
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  permissions?: string[];
  accountType?: string;
  balances?: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

export interface BinanceApiRestrictionsResponse {
  ipRestrict?: boolean;
  createTime?: number;
  enableReading?: boolean;
  enableWithdrawals?: boolean;
  enableInternalTransfer?: boolean;
  enableMargin?: boolean;
  enableFutures?: boolean;
  permitsUniversalTransfer?: boolean;
  enableVanillaOptions?: boolean;
  enableFixApiTrade?: boolean;
  enableFixReadOnly?: boolean;
  enableSpotAndMarginTrading?: boolean;
  enablePortfolioMarginTrading?: boolean;
}

export interface BinanceRawTrade {
  id: number;
  orderId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

export interface FetchTradesOptions {
  startTime?: number;
  endTime?: number;
  maxPages?: number;
}

export interface BinanceExchangeInfoResponse {
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    isSpotTradingAllowed?: boolean;
  }>;
}

export interface DiscoverSymbolsOptions {
  mode: "selected" | "quoteAssets" | "all";
  selectedSymbols?: string[];
  quoteAssets?: string[];
}

export interface SymbolFetchResult {
  symbol: string;
  trades: BinanceRawTrade[];
  warning?: string;
}
