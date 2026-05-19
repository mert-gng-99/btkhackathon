import { formatNumber, formatPercent, round } from "@/lib/utils/numbers";
import { BehaviorPatternDetector } from "@/lib/analytics/BehaviorPatternDetector";
import type { AnalyticsData, BehaviorPattern, GeneratedInsight, NormalizedTrade } from "@/types";

function insight(input: Omit<GeneratedInsight, "id">): GeneratedInsight {
  return {
    id: `${input.category}-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ...input
  };
}

export class InsightGenerator {
  static generate(analytics: AnalyticsData, trades: NormalizedTrade[]): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];

    if (analytics.totalTrades === 0) {
      return [
        insight({
          title: "No trade history found",
          message: "The selected symbols did not return Spot trade history for this session.",
          severity: "info",
          category: "data",
          evidence: ["Total trades: 0"]
        })
      ];
    }

    const tradesPerActiveDay = analytics.activeDays > 0 ? analytics.totalTrades / analytics.activeDays : analytics.totalTrades;
    const rapidRatio = analytics.totalTrades > 0 ? analytics.rapidTradeCount / analytics.totalTrades : 0;

    if (tradesPerActiveDay >= 20 || rapidRatio >= 0.35) {
      insights.push(
        insight({
          title: "Possible overtrading",
          message: `You averaged ${formatNumber(tradesPerActiveDay)} trades per active day, and ${analytics.rapidTradeCount} trades happened within 30 minutes of the previous trade.`,
          severity: "risk",
          category: "frequency",
          evidence: [
            `Total trades: ${analytics.totalTrades}`,
            `Active days: ${analytics.activeDays}`,
            `Rapid follow-up trades: ${analytics.rapidTradeCount}`
          ]
        })
      );
    }

    const lateNightRatio = analytics.totalTrades > 0 ? analytics.lateNightTradeCount / analytics.totalTrades : 0;
    if (lateNightRatio >= 0.35) {
      insights.push(
        insight({
          title: "Late-night concentration",
          message: `${formatPercent(lateNightRatio)} of trades happened between 00:00 and 04:00 UTC. That time window is worth reviewing for discipline and consistency.`,
          severity: "warning",
          category: "timing",
          evidence: [`Late-night trades: ${analytics.lateNightTradeCount}`, `Total trades: ${analytics.totalTrades}`]
        })
      );
    }

    const topSymbol = analytics.symbolSummaries[0];
    const topSymbolShare = topSymbol && analytics.totalVolume > 0 ? topSymbol.volume / analytics.totalVolume : 0;
    if (topSymbol && topSymbolShare >= 0.5) {
      insights.push(
        insight({
          title: "High symbol concentration",
          message: `${topSymbol.symbol} represented ${formatPercent(topSymbolShare)} of your analyzed volume. Concentration can make behavior patterns easier to audit but also less diversified.`,
          severity: "warning",
          category: "symbols",
          evidence: [`${topSymbol.symbol} volume: ${formatNumber(topSymbol.volume)} USDT`, `Total volume: ${formatNumber(analytics.totalVolume)} USDT`]
        })
      );
    }

    const feeRatio = analytics.totalVolume > 0 ? analytics.quoteFeeEstimate / analytics.totalVolume : 0;
    if (analytics.quoteFeeEstimate > 0 && (feeRatio >= 0.0015 || analytics.quoteFeeEstimate >= 25)) {
      insights.push(
        insight({
          title: "Fees deserve attention",
          message: `Quote-asset fees were about ${formatNumber(analytics.quoteFeeEstimate)} against ${formatNumber(analytics.totalVolume)} analyzed volume. Small frequent trades can make this drag more visible.`,
          severity: "warning",
          category: "fees",
          evidence: [`Estimated quote fees: ${formatNumber(analytics.quoteFeeEstimate)}`, `Fee / volume ratio: ${formatPercent(feeRatio)}`]
        })
      );
    }

    if (analytics.buySell.buyRatio >= 0.72 || analytics.buySell.sellRatio >= 0.72) {
      const dominant = analytics.buySell.buyRatio >= analytics.buySell.sellRatio ? "buys" : "sells";
      const ratio = dominant === "buys" ? analytics.buySell.buyRatio : analytics.buySell.sellRatio;
      insights.push(
        insight({
          title: "One-sided activity",
          message: `${formatPercent(ratio)} of trades were ${dominant}. This may simply reflect portfolio building or exits, but it should be interpreted before judging performance.`,
          severity: "info",
          category: "discipline",
          evidence: [`Buys: ${analytics.buySell.buys}`, `Sells: ${analytics.buySell.sells}`]
        })
      );
    }

    if (analytics.pnlEstimate.confidence !== "none") {
      const severity = analytics.pnlEstimate.realized < 0 ? "warning" : "info";
      insights.push(
        insight({
          title: "Estimated realized PnL available",
          message: `FIFO-based estimated realized PnL is ${formatNumber(analytics.pnlEstimate.realized)} with ${analytics.pnlEstimate.confidence} confidence. This is an estimate, not official Binance tax or performance data.`,
          severity,
          category: "pnl",
          evidence: [
            `Matched sell trades: ${analytics.pnlEstimate.matchedSellTrades}`,
            `Unmatched sell trades: ${analytics.pnlEstimate.unmatchedSellTrades}`,
            `Estimated realized PnL: ${round(analytics.pnlEstimate.realized, 2)}`
          ]
        })
      );
    }

    const symbolSwitches = this.countSymbolSwitches(trades);
    if (trades.length >= 20 && symbolSwitches / Math.max(1, trades.length - 1) >= 0.55) {
      insights.push(
        insight({
          title: "Frequent symbol switching",
          message: `Your sequence switched symbols ${symbolSwitches} times across ${trades.length} trades. This can indicate broad scanning, but it can also make review and discipline harder.`,
          severity: "info",
          category: "symbols",
          evidence: [`Symbol switches: ${symbolSwitches}`, `Analyzed trades: ${trades.length}`]
        })
      );
    }

    const patterns = BehaviorPatternDetector.detect(analytics, trades);
    const topPatterns = [...patterns].sort((a, b) => b.score - a.score).slice(0, 3);
    for (const p of topPatterns) {
      if (p.score < 0.3) continue;
      if (p.id === "overtrading" && insights.some((i) => i.title.toLowerCase().includes("overtrading"))) continue;
      if (p.id === "revenge_trading" && insights.some((i) => i.title.toLowerCase().includes("revenge"))) continue;
      insights.push(this.behaviorPatternInsight(p));
    }

    return insights.length > 0
      ? insights
      : [
          insight({
            title: "No major behavioral flags",
            message: "The current rule set did not find strong overtrading, fee, timing, or concentration warnings in the analyzed data.",
            severity: "info",
            category: "data",
            evidence: [`Total trades analyzed: ${analytics.totalTrades}`]
          })
        ];
  }

  private static behaviorPatternInsight(p: BehaviorPattern): GeneratedInsight {
    return insight({
      title: p.label,
      message: p.evidence.join(" "),
      severity: p.severity,
      category: "discipline",
      evidence: p.evidence
    });
  }

  private static countSymbolSwitches(trades: NormalizedTrade[]): number {
    let switches = 0;
    const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].symbol !== sorted[index - 1].symbol) {
        switches += 1;
      }
    }

    return switches;
  }
}

