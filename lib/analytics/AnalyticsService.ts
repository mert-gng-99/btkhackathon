import { toDateKey, toMonthKey } from "@/lib/utils/dates";
import { round } from "@/lib/utils/numbers";
import { splitSymbol, STABLE_QUOTE_ASSETS } from "@/lib/analytics/analyticsTypes";
import type {
  ActivityPoint,
  AnalyticsData,
  EstimatedTradePnl,
  FeeSummary,
  GeneratedInsight,
  HeatmapPoint,
  NormalizedTrade,
  PnlEstimate,
  SymbolSummary
} from "@/types";

interface WorkingLot {
  quantity: number;
  totalCost: number;
}

interface PnlComputation {
  pnlEstimate: PnlEstimate;
  bySymbol: Map<string, number>;
  bestTrades: EstimatedTradePnl[];
  worstTrades: EstimatedTradePnl[];
}

export class AnalyticsService {
  static compute(trades: NormalizedTrade[], generatedInsights: GeneratedInsight[] = []): AnalyticsData {
    const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const totalTrades = sorted.length;
    const totalVolume = sorted.reduce((sum, trade) => sum + trade.quoteQuantity, 0);
    const buys = sorted.filter((trade) => trade.side === "BUY").length;
    const sells = totalTrades - buys;
    const feesByAsset = this.computeFees(sorted);
    const quoteFeeEstimate = feesByAsset
      .filter((fee) => STABLE_QUOTE_ASSETS.includes(fee.asset))
      .reduce((sum, fee) => sum + fee.amount, 0);
    const pnlComputation = this.estimateRealizedPnl(sorted);
    const symbolSummaries = this.computeSymbolSummaries(sorted, pnlComputation.bySymbol);

    const activityByDate = this.groupActivity(sorted, (trade) => toDateKey(new Date(trade.timestamp)));
    const activityByMonth = this.groupActivity(sorted, (trade) => toMonthKey(new Date(trade.timestamp)));
    const activityByHour = this.groupActivity(sorted, (trade) => `${new Date(trade.timestamp).getUTCHours().toString().padStart(2, "0")}:00 UTC`);
    const heatmap = this.computeHeatmap(sorted);
    const rapidTradeCount = this.computeRapidTradeCount(sorted);
    const lateNightTradeCount = sorted.filter((trade) => {
      const hour = new Date(trade.timestamp).getUTCHours();
      return hour >= 0 && hour < 4;
    }).length;

    return {
      totalTrades,
      totalVolume: round(totalVolume, 2),
      averageTradeSize: totalTrades > 0 ? round(totalVolume / totalTrades, 2) : 0,
      buySell: {
        buys,
        sells,
        buyRatio: totalTrades > 0 ? buys / totalTrades : 0,
        sellRatio: totalTrades > 0 ? sells / totalTrades : 0
      },
      feesByAsset,
      quoteFeeEstimate: round(quoteFeeEstimate, 4),
      mostTradedSymbols: [...symbolSummaries].sort((a, b) => b.trades - a.trades).slice(0, 8),
      symbolSummaries,
      activityByDate,
      activityByMonth,
      activityByHour,
      heatmap,
      rapidTradeCount,
      lateNightTradeCount,
      activeDays: activityByDate.length,
      pnlEstimate: pnlComputation.pnlEstimate,
      bestTrades: pnlComputation.bestTrades,
      worstTrades: pnlComputation.worstTrades,
      generatedInsights
    };
  }

  private static computeFees(trades: NormalizedTrade[]): FeeSummary[] {
    const fees = new Map<string, number>();

    for (const trade of trades) {
      fees.set(trade.feeAsset, (fees.get(trade.feeAsset) ?? 0) + trade.fee);
    }

    return Array.from(fees.entries())
      .map(([asset, amount]) => ({ asset, amount: round(amount, 8) }))
      .sort((a, b) => a.asset.localeCompare(b.asset));
  }

  private static computeSymbolSummaries(trades: NormalizedTrade[], pnlBySymbol: Map<string, number>): SymbolSummary[] {
    const grouped = new Map<string, NormalizedTrade[]>();

    for (const trade of trades) {
      const group = grouped.get(trade.symbol) ?? [];
      group.push(trade);
      grouped.set(trade.symbol, group);
    }

    return Array.from(grouped.entries())
      .map(([symbol, group]) => {
        const buys = group.filter((trade) => trade.side === "BUY").length;
        const volume = group.reduce((sum, trade) => sum + trade.quoteQuantity, 0);

        return {
          symbol,
          trades: group.length,
          buys,
          sells: group.length - buys,
          volume: round(volume, 2),
          averageTradeSize: group.length > 0 ? round(volume / group.length, 2) : 0,
          firstTradeAt: group[0]?.timestamp,
          lastTradeAt: group[group.length - 1]?.timestamp,
          realizedPnlEstimate: pnlBySymbol.has(symbol) ? round(pnlBySymbol.get(symbol) ?? 0, 2) : undefined
        };
      })
      .sort((a, b) => b.volume - a.volume);
  }

  private static groupActivity(trades: NormalizedTrade[], keyFn: (trade: NormalizedTrade) => string): ActivityPoint[] {
    const grouped = new Map<string, { trades: number; volume: number }>();

    for (const trade of trades) {
      const key = keyFn(trade);
      const item = grouped.get(key) ?? { trades: 0, volume: 0 };
      item.trades += 1;
      item.volume += trade.quoteQuantity;
      grouped.set(key, item);
    }

    return Array.from(grouped.entries())
      .map(([label, value]) => ({
        label,
        trades: value.trades,
        volume: round(value.volume, 2)
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private static computeHeatmap(trades: NormalizedTrade[]): HeatmapPoint[] {
    const grouped = new Map<string, number>();

    for (const trade of trades) {
      const date = new Date(trade.timestamp);
      const key = `${date.getUTCDay()}-${date.getUTCHours()}`;
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    const points: HeatmapPoint[] = [];
    for (let day = 0; day < 7; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        points.push({
          dayOfWeek: day,
          hour,
          trades: grouped.get(`${day}-${hour}`) ?? 0
        });
      }
    }

    return points;
  }

  private static computeRapidTradeCount(trades: NormalizedTrade[]): number {
    let rapid = 0;

    for (let index = 1; index < trades.length; index += 1) {
      const previous = new Date(trades[index - 1].timestamp).getTime();
      const current = new Date(trades[index].timestamp).getTime();
      if (current - previous <= 30 * 60 * 1000) {
        rapid += 1;
      }
    }

    return rapid;
  }

  private static estimateRealizedPnl(trades: NormalizedTrade[]): PnlComputation {
    const lotsBySymbol = new Map<string, WorkingLot[]>();
    const pnlBySymbol = new Map<string, number>();
    const sellTradePnl: EstimatedTradePnl[] = [];
    let matchedSellTrades = 0;
    let unmatchedSellTrades = 0;

    for (const trade of trades) {
      const { quoteAsset } = splitSymbol(trade.symbol);
      if (!STABLE_QUOTE_ASSETS.includes(quoteAsset)) {
        continue;
      }

      const lots = lotsBySymbol.get(trade.symbol) ?? [];

      if (trade.side === "BUY") {
        lots.push({ quantity: trade.quantity, totalCost: trade.quoteQuantity });
        lotsBySymbol.set(trade.symbol, lots);
        continue;
      }

      let remaining = trade.quantity;
      let costBasis = 0;
      let matchedQuantity = 0;

      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const consume = Math.min(remaining, lot.quantity);
        const costPortion = lot.totalCost * (consume / lot.quantity);
        costBasis += costPortion;
        matchedQuantity += consume;
        lot.quantity -= consume;
        lot.totalCost -= costPortion;
        remaining -= consume;

        if (lot.quantity <= 0.00000001) {
          lots.shift();
        }
      }

      lotsBySymbol.set(trade.symbol, lots);

      if (matchedQuantity <= 0) {
        unmatchedSellTrades += 1;
        continue;
      }

      matchedSellTrades += 1;
      if (remaining > 0) {
        unmatchedSellTrades += 1;
      }

      const matchedProceeds = trade.quoteQuantity * (matchedQuantity / trade.quantity);
      const pnl = matchedProceeds - costBasis;
      pnlBySymbol.set(trade.symbol, (pnlBySymbol.get(trade.symbol) ?? 0) + pnl);
      sellTradePnl.push({
        symbol: trade.symbol,
        tradeId: trade.tradeId,
        timestamp: trade.timestamp,
        side: trade.side,
        pnl: round(pnl, 2),
        quantity: round(matchedQuantity, 8)
      });
    }

    const realized = Array.from(pnlBySymbol.values()).reduce((sum, value) => sum + value, 0);
    const totalEvaluated = matchedSellTrades + unmatchedSellTrades;
    const matchedRatio = totalEvaluated > 0 ? matchedSellTrades / totalEvaluated : 0;
    const confidence: PnlEstimate["confidence"] =
      matchedSellTrades === 0 ? "none" : matchedRatio > 0.85 ? "high" : matchedRatio > 0.6 ? "medium" : "low";

    return {
      pnlEstimate: {
        realized: round(realized, 2),
        matchedSellTrades,
        unmatchedSellTrades,
        confidence
      },
      bySymbol: pnlBySymbol,
      bestTrades: [...sellTradePnl].sort((a, b) => b.pnl - a.pnl).slice(0, 5),
      worstTrades: [...sellTradePnl].sort((a, b) => a.pnl - b.pnl).slice(0, 5)
    };
  }
}

