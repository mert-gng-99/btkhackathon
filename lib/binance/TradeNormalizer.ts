import type { BinanceRawFuturesTrade, BinanceRawTrade } from "@/lib/binance/binanceTypes";
import type { MarketType } from "@/types";
import type { NormalizedTrade } from "@/types";

export class TradeNormalizer {
  static fromBinanceSpot(sessionId: string, symbol: string, rawTrades: BinanceRawTrade[]): NormalizedTrade[] {
    return rawTrades.map((trade) => ({
      id: `${sessionId}:binance:spot:${symbol}:${trade.id}`,
      sessionId,
      exchange: "binance",
      marketType: "spot",
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

  static fromBinanceFutures(sessionId: string, marketType: Exclude<MarketType, "spot">, symbol: string, rawTrades: BinanceRawFuturesTrade[]): NormalizedTrade[] {
    return rawTrades.map((trade) => {
      const price = Number(trade.price);
      const quantity = Number(trade.baseQty ?? trade.qty);
      const quoteQuantity = Number(trade.quoteQty ?? price * quantity);

      return {
        id: `${sessionId}:binance:${marketType}:${symbol}:${trade.id}`,
        sessionId,
        exchange: "binance",
        marketType,
        symbol,
        orderId: String(trade.orderId),
        tradeId: String(trade.id),
        side: trade.side,
        price,
        quantity,
        quoteQuantity: Number.isFinite(quoteQuantity) ? quoteQuantity : 0,
        fee: Math.abs(Number(trade.commission)),
        feeAsset: trade.commissionAsset,
        timestamp: new Date(trade.time).toISOString(),
        isBuyer: trade.buyer,
        isMaker: trade.maker,
        realizedPnl: trade.realizedPnl === undefined ? undefined : Number(trade.realizedPnl),
        positionSide: trade.positionSide
      };
    });
  }
}
