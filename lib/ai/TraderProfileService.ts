import { GeminiService } from "@/lib/ai/GeminiService";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AnalyticsData, NormalizedTrade, TraderProfile } from "@/types";

const SYSTEM_PROMPT = [
  "You are a behavioral trading analyst for a fintech analytics app.",
  "You analyze the user's own Binance trade data only.",
  "You must not give financial advice.",
  "Never recommend buy, sell, hold, leverage, entries, exits, or specific assets.",
  "Focus on behavior, discipline, timing, fees, trade frequency, realized PnL evidence, concentration, and risk patterns.",
  "Every claim must be grounded in the provided metrics.",
  "If data is insufficient, say so explicitly."
].join("\n");

export class TraderProfileService {
  constructor(private readonly gemini = new GeminiService()) {}

  isConfigured(): boolean {
    return this.gemini.isConfigured();
  }

  async generate(analytics: AnalyticsData, trades: NormalizedTrade[]): Promise<TraderProfile> {
    if (!this.gemini.isConfigured()) {
      return {
        traderType: "Gemini not configured",
        confidence: "low",
        summary: "Set GEMINI_API_KEY in .env to generate the AI trader profile.",
        evidence: ["GEMINI_API_KEY is missing."],
        strengths: [],
        risks: [],
        behavioralTags: ["configuration-required"],
        reflectionQuestions: ["Add your Gemini API key, restart the dev server, and regenerate the profile."],
        insufficientData: true
      };
    }

    const prompt = buildPrompt(analytics, trades);
    return this.gemini.generateJson<TraderProfile>({
      systemInstruction: SYSTEM_PROMPT,
      prompt,
      temperature: 0.15
    });
  }
}

function buildPrompt(analytics: AnalyticsData, trades: NormalizedTrade[]): string {
  const topSymbols = analytics.symbolSummaries.slice(0, 8);
  const scoredHours = analytics.hourlyBehavior.filter((hour) => hour.successRate !== null && hour.pnlSamples > 0);
  const busiestHour = [...analytics.hourlyBehavior].sort((a, b) => b.trades - a.trades)[0];
  const bestHour = [...scoredHours].sort((a, b) => (b.successRate ?? 0) - (a.successRate ?? 0) || b.realizedPnl - a.realizedPnl)[0];
  const weakestHour = [...scoredHours].sort((a, b) => (a.successRate ?? 0) - (b.successRate ?? 0) || a.realizedPnl - b.realizedPnl)[0];
  const recentTrades = [...trades]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12)
    .map((trade) => ({
      marketType: trade.marketType,
      symbol: trade.symbol,
      side: trade.side,
      quoteQuantity: trade.quoteQuantity,
      timestamp: trade.timestamp,
      realizedPnl: trade.realizedPnl
    }));

  return JSON.stringify(
    {
      task:
        "Classify the user's trader type and explain the behavioral profile. Use types like Overtrading Scalper, Concentrated Specialist, Night Session Trader, Momentum Chaser, High-Frequency Futures Trader, Fee-Sensitive Micro Trader, Balanced Opportunist, or create a better evidence-based label. Return exactly the requested JSON shape.",
      outputShape: {
        traderType: "string",
        confidence: "low | medium | high",
        summary: "string",
        evidence: ["string"],
        strengths: ["string"],
        risks: ["string"],
        behavioralTags: ["string"],
        reflectionQuestions: ["string"],
        insufficientData: "boolean optional"
      },
      rules: [
        "No financial advice.",
        "Do not recommend buy, sell, hold, leverage, entries, exits, or assets.",
        "Cite metrics such as trade count, active days, symbols, hours, fees, PnL confidence, and realized PnL samples.",
        "If realized PnL samples are low, lower confidence."
      ],
      metrics: {
        totalTrades: analytics.totalTrades,
        activeDays: analytics.activeDays,
        totalVolume: analytics.totalVolume,
        averageTradeSize: analytics.averageTradeSize,
        buyRatio: formatPercent(analytics.buySell.buyRatio),
        sellRatio: formatPercent(analytics.buySell.sellRatio),
        quoteFeeEstimate: analytics.quoteFeeEstimate,
        rapidTradeCount: analytics.rapidTradeCount,
        lateNightTradeCount: analytics.lateNightTradeCount,
        pnlEstimate: analytics.pnlEstimate,
        marketBreakdown: analytics.marketBreakdown,
        topSymbols: topSymbols.map((symbol) => ({
          symbol: symbol.symbol,
          trades: symbol.trades,
          volume: symbol.volume,
          realizedPnlEstimate: symbol.realizedPnlEstimate
        })),
        busiestHour: busiestHour
          ? {
              hour: busiestHour.label,
              trades: busiestHour.trades,
              volume: busiestHour.volume
            }
          : null,
        bestScoredHour: bestHour
          ? {
              hour: bestHour.label,
              successRate: bestHour.successRate,
              realizedPnl: bestHour.realizedPnl,
              pnlSamples: bestHour.pnlSamples
            }
          : null,
        weakestScoredHour: weakestHour
          ? {
              hour: weakestHour.label,
              successRate: weakestHour.successRate,
              realizedPnl: weakestHour.realizedPnl,
              pnlSamples: weakestHour.pnlSamples
            }
          : null,
        generatedInsights: analytics.generatedInsights.map((insight) => ({
          title: insight.title,
          message: insight.message,
          evidence: insight.evidence
        }))
      },
      recentTrades,
      formattingHints: {
        summaryLength: "2-3 sentences",
        evidenceCount: "4-6",
        strengthsCount: "2-4",
        risksCount: "3-5",
        reflectionQuestionCount: "3-5",
        numberFormatExample: formatNumber(1234.56)
      }
    },
    null,
    2
  );
}

