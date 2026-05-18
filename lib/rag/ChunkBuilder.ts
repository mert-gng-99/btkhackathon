import { readdir, readFile } from "fs/promises";
import path from "path";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AnalyticsData, NormalizedTrade, RagChunk } from "@/types";

function chunkId(sessionId: string, sourceType: RagChunk["sourceType"], sourceRef: string): string {
  return `${sessionId}:${sourceType}:${sourceRef}`.replace(/\s+/g, "-");
}

export class ChunkBuilder {
  static buildSessionChunks(sessionId: string, analytics: AnalyticsData, trades: NormalizedTrade[]): RagChunk[] {
    const chunks: RagChunk[] = [];

    chunks.push({
      id: chunkId(sessionId, "analytics", "overview"),
      sessionId,
      sourceType: "analytics",
      sourceRef: "overview",
      content: `Session overview: ${analytics.totalTrades} Binance Spot trades, ${formatNumber(analytics.totalVolume)} quote volume, average trade size ${formatNumber(analytics.averageTradeSize)}, ${analytics.buySell.buys} buys and ${analytics.buySell.sells} sells. Estimated quote fees: ${formatNumber(analytics.quoteFeeEstimate)}. Active days: ${analytics.activeDays}.`,
      metadata: {
        totalTrades: analytics.totalTrades,
        totalVolume: analytics.totalVolume
      }
    });

    if (analytics.pnlEstimate.confidence !== "none") {
      chunks.push({
        id: chunkId(sessionId, "analytics", "pnl-estimate"),
        sessionId,
        sourceType: "analytics",
        sourceRef: "pnl-estimate",
        content: `Estimated realized PnL using FIFO is ${formatNumber(analytics.pnlEstimate.realized)} with ${analytics.pnlEstimate.confidence} confidence. Matched sell trades: ${analytics.pnlEstimate.matchedSellTrades}. Unmatched sell trades: ${analytics.pnlEstimate.unmatchedSellTrades}. This is not official Binance PnL.`,
        metadata: {
          realized: analytics.pnlEstimate.realized,
          confidence: analytics.pnlEstimate.confidence
        }
      });
    }

    for (const summary of analytics.symbolSummaries.slice(0, 10)) {
      chunks.push({
        id: chunkId(sessionId, "symbol", summary.symbol),
        sessionId,
        sourceType: "symbol",
        sourceRef: summary.symbol,
        content: `${summary.symbol}: ${summary.trades} trades, ${summary.buys} buys, ${summary.sells} sells, ${formatNumber(summary.volume)} quote volume, average trade size ${formatNumber(summary.averageTradeSize)}. First trade ${summary.firstTradeAt ?? "unknown"}, last trade ${summary.lastTradeAt ?? "unknown"}. Estimated realized PnL ${summary.realizedPnlEstimate ?? "not available"}.`,
        metadata: {
          symbol: summary.symbol,
          trades: summary.trades,
          volume: summary.volume
        }
      });
    }

    for (const period of analytics.activityByMonth.slice(-12)) {
      chunks.push({
        id: chunkId(sessionId, "period", period.label),
        sessionId,
        sourceType: "period",
        sourceRef: period.label,
        content: `In ${period.label}, the user made ${period.trades} trades with ${formatNumber(period.volume)} quote volume.`,
        metadata: {
          month: period.label,
          trades: period.trades,
          volume: period.volume
        }
      });
    }

    const lateNightRatio = analytics.totalTrades > 0 ? analytics.lateNightTradeCount / analytics.totalTrades : 0;
    chunks.push({
      id: chunkId(sessionId, "trade_cluster", "timing"),
      sessionId,
      sourceType: "trade_cluster",
      sourceRef: "timing",
      content: `Timing pattern: ${analytics.lateNightTradeCount} of ${analytics.totalTrades} trades happened between 00:00 and 04:00 UTC (${formatPercent(lateNightRatio)}). ${analytics.rapidTradeCount} trades happened within 30 minutes of the previous trade.`,
      metadata: {
        lateNightTradeCount: analytics.lateNightTradeCount,
        rapidTradeCount: analytics.rapidTradeCount
      }
    });

    for (const insight of analytics.generatedInsights) {
      chunks.push({
        id: chunkId(sessionId, "insight", insight.id),
        sessionId,
        sourceType: "insight",
        sourceRef: insight.id,
        content: `${insight.title}: ${insight.message} Evidence: ${insight.evidence.join("; ")}.`,
        metadata: {
          category: insight.category,
          severity: insight.severity
        }
      });
    }

    const rapidTrades = this.findRapidTradeExamples(trades);
    if (rapidTrades.length > 0) {
      chunks.push({
        id: chunkId(sessionId, "trade_cluster", "rapid-examples"),
        sessionId,
        sourceType: "trade_cluster",
        sourceRef: "rapid-examples",
        content: `Rapid trade examples: ${rapidTrades.join(" ")}`,
        metadata: {
          examples: rapidTrades.length
        }
      });
    }

    return chunks;
  }

  static async buildMaterialChunksFromFolder(sessionId: string): Promise<RagChunk[]> {
    const folder = path.join(process.cwd(), "rag-materials");
    const chunks: RagChunk[] = [];

    try {
      const files = await readdir(folder);
      for (const file of files) {
        if (!file.endsWith(".md") && !file.endsWith(".txt")) {
          continue;
        }

        const content = await readFile(path.join(folder, file), "utf8");
        const sections = content
          .split(/\n\s*\n/g)
          .map((section) => section.trim())
          .filter((section) => section.length > 40)
          .slice(0, 20);

        sections.forEach((section, index) => {
          chunks.push({
            id: chunkId(sessionId, "material", `${file}-${index}`),
            sessionId,
            sourceType: "material",
            sourceRef: file,
            content: section.slice(0, 1800),
            metadata: {
              file,
              index
            }
          });
        });
      }
    } catch {
      return [];
    }

    return chunks;
  }

  private static findRapidTradeExamples(trades: NormalizedTrade[]): string[] {
    const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const examples: string[] = [];

    for (let index = 1; index < sorted.length && examples.length < 5; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const diffMinutes = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 60000;
      if (diffMinutes <= 30) {
        examples.push(
          `${previous.symbol} ${previous.side} at ${previous.timestamp}, followed ${Math.round(diffMinutes)} minutes later by ${current.symbol} ${current.side} at ${current.timestamp}.`
        );
      }
    }

    return examples;
  }
}

