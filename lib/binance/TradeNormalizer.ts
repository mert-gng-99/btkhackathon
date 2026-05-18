import type { BinanceRawTrade } from "@/lib/binance/binanceTypes";
import type { NormalizedTrade } from "@/types";

export class TradeNormalizer {
  static fromBinanceSpot(sessionId: string, symbol: string, rawTrades: BinanceRawTrade[]): NormalizedTrade[] {
    return rawTrades.map((trade) => ({
      id: `${sessionId}:binance:${symbol}:${trade.id}`,
      sessionId,
      exchange: "binance",
      symbol,
      orderId: String(trade.orderId),
      tradeId: String(trade.id),
      side: trade.isBuyer ? "BUY" : "SELL",
      price: Number(trade.price),
      quantity: Number(trade.qty),
      quoteQuantity: Number(trade.quoteQty),
      fee: Number(trade.commission),
      feeAsset: trade.commissionAsset,
      timestamp: new Date(trade.time).toISOString(),
      isBuyer: trade.isBuyer,
      isMaker: trade.isMaker
    }));
  }
}

