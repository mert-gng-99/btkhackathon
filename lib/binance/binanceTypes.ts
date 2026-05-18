export interface BinanceAccountResponse {
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  permissions?: string[];
  accountType?: string;
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

export interface SymbolFetchResult {
  symbol: string;
  trades: BinanceRawTrade[];
  warning?: string;
}

