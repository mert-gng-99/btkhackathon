import { COACH_DISCLAIMER } from "@/lib/rag/ragTypes";
import { VectorStoreService } from "@/lib/rag/VectorStoreService";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import { GeminiService } from "@/lib/ai/GeminiService";
import type { AiCoachAnswer, AiEvidence, AnalyticsData, RagChunk } from "@/types";

function evidenceFromChunk(chunk: RagChunk): AiEvidence {
  return {
    title: `${chunk.sourceType.replace("_", " ")}: ${chunk.sourceRef}`,
    detail: chunk.content,
    sourceRef: chunk.sourceRef
  };
}

export class AICoachService {
  constructor(
    private readonly vectorStore = new VectorStoreService(),
    private readonly gemini = new GeminiService()
  ) {}

  async answerQuestion(question: string, analytics: AnalyticsData, chunks: RagChunk[]): Promise<AiCoachAnswer> {
    const retrieved = this.vectorStore.retrieve(question, chunks, 7);

    if (analytics.totalTrades === 0 || retrieved.length === 0) {
      return {
        answer:
          "I do not have enough grounded trade data to answer that. Connect a read-only Binance Spot key or load demo data, then ask again. I will not guess without session-specific evidence.",
        evidence: [],
        retrievedChunks: [],
        disclaimer: COACH_DISCLAIMER
      };
    }

    if (this.gemini.isConfigured()) {
      try {
        const answer = await this.gemini.generateText({
          systemInstruction: [
            "You are an AI Trade Coach for a read-only Binance analytics app.",
            "Answer only from the supplied user-specific trade context.",
            "Do not give financial advice.",
            "Never recommend buy, sell, hold, leverage, entries, exits, or specific assets.",
            "Focus on behavior, discipline, fees, timing, frequency, concentration, and realized-PnL evidence.",
            "If context is insufficient, say so clearly."
          ].join("\n"),
          prompt: JSON.stringify(
            {
              question,
              analytics: {
                totalTrades: analytics.totalTrades,
                totalVolume: analytics.totalVolume,
                buySell: analytics.buySell,
                feesByAsset: analytics.feesByAsset,
                rapidTradeCount: analytics.rapidTradeCount,
                lateNightTradeCount: analytics.lateNightTradeCount,
                pnlEstimate: analytics.pnlEstimate,
                marketBreakdown: analytics.marketBreakdown,
                topSymbols: analytics.symbolSummaries.slice(0, 8),
                hourlyBehavior: analytics.hourlyBehavior.filter((hour) => hour.trades > 0)
              },
              retrievedContext: retrieved.map((chunk) => ({
                sourceType: chunk.sourceType,
                sourceRef: chunk.sourceRef,
                content: chunk.content
              })),
              requiredStyle: "Concise, evidence-based, no investment advice, include concrete metrics."
            },
            null,
            2
          ),
          temperature: 0.2
        });

        return {
          answer,
          evidence: retrieved.slice(0, 5).map(evidenceFromChunk),
          retrievedChunks: retrieved,
          disclaimer: COACH_DISCLAIMER
        };
      } catch {
        // Fall through to the deterministic grounded answer if Gemini is temporarily unavailable.
      }
    }

    const lower = question.toLowerCase();
    const sections: string[] = [];

    if (lower.includes("mistake") || lower.includes("wrong") || lower.includes("problem") || lower.includes("pattern")) {
      sections.push(this.describeMistakes(analytics));
    }

    if (lower.includes("overtrade") || lower.includes("frequency") || lower.includes("too much")) {
      sections.push(this.describeOvertrading(analytics));
    }

    if (lower.includes("fee") || lower.includes("cost")) {
      sections.push(this.describeFees(analytics));
    }

    if (lower.includes("night") || lower.includes("control") || lower.includes("emotion") || lower.includes("time")) {
      sections.push(this.describeTiming(analytics));
    }

    if (lower.includes("coin") || lower.includes("symbol") || lower.includes("asset")) {
      sections.push(this.describeSymbols(analytics));
    }

    if (sections.length === 0) {
      sections.push(this.describeMistakes(analytics), this.describeSymbols(analytics), this.describeFees(analytics));
    }

    const answer = [
      "Based on your analyzed Binance Spot history, here is the grounded read:",
      "",
      ...sections.filter(Boolean),
      "",
      "Evidence used:",
      ...retrieved.slice(0, 4).map((chunk, index) => `${index + 1}. ${chunk.content}`)
    ].join("\n");

    return {
      answer,
      evidence: retrieved.slice(0, 5).map(evidenceFromChunk),
      retrievedChunks: retrieved,
      disclaimer: COACH_DISCLAIMER
    };
  }

  private describeMistakes(analytics: AnalyticsData): string {
    const topInsights = analytics.generatedInsights.slice(0, 3);
    if (topInsights.length === 0) {
      return "I do not see strong rule-based mistakes in the current data, but this depends on the limited fields available from Spot trade history.";
    }

    return topInsights
      .map((item, index) => `${index + 1}. ${item.title}: ${item.message}`)
      .join("\n\n");
  }

  private describeOvertrading(analytics: AnalyticsData): string {
    const tradesPerDay = analytics.activeDays > 0 ? analytics.totalTrades / analytics.activeDays : analytics.totalTrades;
    const rapidRatio = analytics.totalTrades > 0 ? analytics.rapidTradeCount / analytics.totalTrades : 0;

    return `Overtrading check: you made ${analytics.totalTrades} trades across ${analytics.activeDays} active days, averaging ${formatNumber(tradesPerDay)} trades per active day. ${analytics.rapidTradeCount} trades happened within 30 minutes of the previous trade (${formatPercent(rapidRatio)}).`;
  }

  private describeFees(analytics: AnalyticsData): string {
    const feeRatio = analytics.totalVolume > 0 ? analytics.quoteFeeEstimate / analytics.totalVolume : 0;
    const feeBreakdown = analytics.feesByAsset.map((fee) => `${formatNumber(fee.amount)} ${fee.asset}`).join(", ");

    return `Fee impact: estimated quote-asset fees were ${formatNumber(analytics.quoteFeeEstimate)} against ${formatNumber(analytics.totalVolume)} analyzed volume (${formatPercent(feeRatio)}). Fee assets observed: ${feeBreakdown || "none"}.`;
  }

  private describeTiming(analytics: AnalyticsData): string {
    const lateNightRatio = analytics.totalTrades > 0 ? analytics.lateNightTradeCount / analytics.totalTrades : 0;
    const busiestHour = [...analytics.activityByHour].sort((a, b) => b.trades - a.trades)[0];

    return `Timing pattern: ${analytics.lateNightTradeCount} trades happened between 00:00 and 04:00 UTC (${formatPercent(lateNightRatio)}). Your busiest hour bucket was ${busiestHour?.label ?? "not available"} with ${busiestHour?.trades ?? 0} trades.`;
  }

  private describeSymbols(analytics: AnalyticsData): string {
    const top = analytics.symbolSummaries.slice(0, 3);
    if (top.length === 0) {
      return "Symbol pattern: no symbol-level trade data is available.";
    }

    return `Symbol concentration: your top analyzed symbols were ${top
      .map((symbol) => `${symbol.symbol} (${symbol.trades} trades, ${formatNumber(symbol.volume)} volume)`)
      .join(", ")}.`;
  }
}
