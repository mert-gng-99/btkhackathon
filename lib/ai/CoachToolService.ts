import { BehaviorPatternDetector } from "@/lib/analytics/BehaviorPatternDetector";
import type {
  AnalyticsData,
  BehaviorPattern,
  EstimatedTradePnl,
  NormalizedTrade,
  WhatIfSimulationResult
} from "@/types";

export interface WorstTradesInput {
  period?: "7d" | "30d" | "all";
  limit?: number;
}

export interface WorstTradesOutput {
  period: "7d" | "30d" | "all";
  trades: Array<{
    tradeId: string;
    symbol: string;
    timestamp: string;
    pnl: number;
    side?: "BUY" | "SELL";
    qty?: number;
    confidence: "none" | "low" | "medium" | "high";
  }>;
  pnlConfidence: "none" | "low" | "medium" | "high";
}

export interface SimulateWhatIfInput {
  skipTradeIds: string[];
}

export interface DetectBehaviorPatternsInput {
  focus?: "revenge_trading" | "overtrading" | "fomo" | "averaging_down" | "all";
}

export interface DetectBehaviorPatternsOutput {
  patterns: BehaviorPattern[];
}

export interface RiskBudgetOutput {
  riskLevel: "low" | "elevated" | "high";
  reasons: string[];
  guardrails: string[];
  confidence: "low" | "medium" | "high";
}

const MS_DAY = 24 * 60 * 60 * 1000;

export class CoachToolService {
  constructor(
    private readonly analytics: AnalyticsData,
    private readonly trades: NormalizedTrade[]
  ) {}

  getMyWorstTrades(input: WorstTradesInput = {}): WorstTradesOutput {
    const requested: "7d" | "30d" | "all" = input.period ?? "all";
    const rawLimit = typeof input.limit === "number" ? input.limit : 5;
    const limit = Math.max(1, Math.min(rawLimit, 10));
    const pnlConfidence = this.analytics.pnlEstimate.confidence;

    const filter = (period: "7d" | "30d" | "all", source: EstimatedTradePnl[]) => {
      if (period === "all") return source.slice(0, limit);
      const windowMs = period === "7d" ? 7 * MS_DAY : 30 * MS_DAY;
      const cutoff = Date.now() - windowMs;
      return source.filter((t) => new Date(t.timestamp).getTime() >= cutoff).slice(0, limit);
    };

    let resolved: "7d" | "30d" | "all" = requested;
    let trades = filter(resolved, this.analytics.worstTrades);
    if (trades.length === 0 && resolved !== "all") {
      resolved = "all";
      trades = filter("all", this.analytics.worstTrades);
    }

    return {
      period: resolved,
      pnlConfidence,
      trades: trades.map((t) => ({
        tradeId: t.tradeId,
        symbol: t.symbol,
        timestamp: t.timestamp,
        pnl: t.pnl,
        side: t.side,
        qty: t.quantity,
        confidence: pnlConfidence
      }))
    };
  }

  simulateWhatIf(input: SimulateWhatIfInput): WhatIfSimulationResult {
    const lookup = new Map<string, EstimatedTradePnl>();
    for (const t of [...this.analytics.worstTrades, ...this.analytics.bestTrades]) {
      lookup.set(t.tradeId, t);
    }

    const skipped: Array<Pick<EstimatedTradePnl, "tradeId" | "symbol" | "timestamp" | "pnl">> = [];
    const ignored: string[] = [];

    for (const id of input.skipTradeIds ?? []) {
      const found = lookup.get(id);
      if (!found) {
        ignored.push(id);
        continue;
      }
      skipped.push({ tradeId: found.tradeId, symbol: found.symbol, timestamp: found.timestamp, pnl: found.pnl });
    }

    const baselinePnl = this.analytics.pnlEstimate.realized;
    const sumSkipped = skipped.reduce((sum, t) => sum + t.pnl, 0);
    const simulatedPnl = baselinePnl - sumSkipped;

    return {
      baselinePnl,
      simulatedPnl,
      delta: simulatedPnl - baselinePnl,
      skippedTrades: skipped,
      ignoredIds: ignored,
      confidence: this.analytics.pnlEstimate.confidence
    };
  }

  detectBehaviorPatterns(input: DetectBehaviorPatternsInput = {}): DetectBehaviorPatternsOutput {
    const all = BehaviorPatternDetector.detect(this.analytics, this.trades);
    if (!input.focus || input.focus === "all") {
      return { patterns: all };
    }
    return { patterns: all.filter((p) => p.id === input.focus) };
  }

  riskBudgetToday(): RiskBudgetOutput {
    const total = this.analytics.totalTrades;
    const rapidRatio = total > 0 ? this.analytics.rapidTradeCount / total : 0;
    const lateNightRatio = total > 0 ? this.analytics.lateNightTradeCount / total : 0;
    const patterns = BehaviorPatternDetector.detect(this.analytics, this.trades);
    const maxPatternScore = patterns.reduce((max, p) => (p.score > max ? p.score : max), 0);

    const reasons: string[] = [];
    if (rapidRatio > 0.15) {
      reasons.push(`Rapid follow-up ratio is ${(rapidRatio * 100).toFixed(0)}% of trades.`);
    }
    if (lateNightRatio > 0.2) {
      reasons.push(`Late-night (00:00-04:00 UTC) trades are ${(lateNightRatio * 100).toFixed(0)}% of activity.`);
    }
    if (maxPatternScore > 0.4) {
      const top = [...patterns].sort((a, b) => b.score - a.score)[0];
      reasons.push(`${top.label} score is ${(top.score * 100).toFixed(0)}%.`);
    }
    if (reasons.length === 0) {
      reasons.push("No elevated behavioral signals detected in current session window.");
    }

    let riskLevel: "low" | "elevated" | "high" = "low";
    if (rapidRatio > 0.3 || lateNightRatio > 0.3 || maxPatternScore > 0.7) {
      riskLevel = "high";
    } else if (rapidRatio > 0.15 || maxPatternScore > 0.4) {
      riskLevel = "elevated";
    }

    const guardrails: string[] =
      riskLevel === "high"
        ? [
            "Pause for 5 minutes after each closed position before opening a new one.",
            "Avoid trading between 00:00-04:00 UTC tonight.",
            "Review the latest worst trade before continuing the session."
          ]
        : riskLevel === "elevated"
        ? [
            "Add a 2-minute decision delay between consecutive trades.",
            "Review behavioral pattern findings on the Insights page."
          ]
        : [
            "Maintain the current cadence and keep journaling decisions.",
            "Re-check the Insights page after the next 10 trades."
          ];

    const confidence: RiskBudgetOutput["confidence"] =
      total >= 50 && this.analytics.pnlEstimate.confidence !== "none"
        ? "high"
        : total >= 15
        ? "medium"
        : "low";

    return { riskLevel, reasons, guardrails, confidence };
  }
}
