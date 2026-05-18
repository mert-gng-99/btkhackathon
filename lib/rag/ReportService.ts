import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AiReport, AnalyticsData, ReportType } from "@/types";

export class ReportService {
  static generate(sessionId: string, type: ReportType, analytics: AnalyticsData): AiReport {
    const topSymbol = analytics.symbolSummaries[0];
    const lateNightRatio = analytics.totalTrades > 0 ? analytics.lateNightTradeCount / analytics.totalTrades : 0;

    return {
      id: `${sessionId}:${type}:${Date.now()}`,
      sessionId,
      type,
      title: `${type[0].toUpperCase()}${type.slice(1)} trading behavior report`,
      summary: `This report reviews ${analytics.totalTrades} analyzed Binance Spot trades with ${formatNumber(analytics.totalVolume)} quote volume. It focuses on behavior, fees, timing, and consistency, not investment advice.`,
      metrics: [
        `Total trades: ${analytics.totalTrades}`,
        `Average trade size: ${formatNumber(analytics.averageTradeSize)}`,
        `Buy/sell split: ${analytics.buySell.buys} buys and ${analytics.buySell.sells} sells`,
        `Estimated quote fees: ${formatNumber(analytics.quoteFeeEstimate)}`,
        `Estimated realized PnL confidence: ${analytics.pnlEstimate.confidence}`
      ],
      observations: [
        topSymbol ? `Most active symbol: ${topSymbol.symbol} with ${topSymbol.trades} trades.` : "No symbol-level concentration available.",
        `${analytics.rapidTradeCount} trades happened within 30 minutes of a previous trade.`,
        `${formatPercent(lateNightRatio)} of trades happened between 00:00 and 04:00 UTC.`,
        ...analytics.generatedInsights.slice(0, 3).map((insight) => `${insight.title}: ${insight.message}`)
      ],
      reflectionQuestions: [
        "Which trades were planned before entry, and which were reactive?",
        "Do fee-heavy trades share the same size, symbol, or time window?",
        "Are rapid follow-up trades improving decisions or adding noise?",
        "Which time window produces the most disciplined behavior?"
      ],
      createdAt: new Date().toISOString()
    };
  }
}

