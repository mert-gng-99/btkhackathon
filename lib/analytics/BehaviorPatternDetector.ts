import type { AnalyticsData, BehaviorPattern, InsightSeverity, NormalizedTrade } from "@/types";

const MS_15_MIN = 15 * 60 * 1000;
const MS_60_MIN = 60 * 60 * 1000;
const MS_24_HOUR = 24 * 60 * 60 * 1000;

function severityFromScore(score: number): InsightSeverity {
  if (score >= 0.7) return "risk";
  if (score >= 0.4) return "warning";
  return "info";
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export class BehaviorPatternDetector {
  static detect(analytics: AnalyticsData, trades: NormalizedTrade[]): BehaviorPattern[] {
    return [
      this.revengeTrading(analytics, trades),
      this.overtrading(analytics),
      this.fomo(trades),
      this.averagingDown(trades)
    ];
  }

  static revengeTrading(analytics: AnalyticsData, trades: NormalizedTrade[]): BehaviorPattern {
    const total = analytics.totalTrades;
    const rapidRatio = total > 0 ? analytics.rapidTradeCount / total : 0;

    let postLossEscalationShare = 0;
    if (analytics.worstTrades.length > 0 && trades.length > 1) {
      const worstTimestamps = analytics.worstTrades
        .map((t) => new Date(t.timestamp).getTime())
        .filter((t) => Number.isFinite(t));
      let escalationFollowUps = 0;
      let scoredOpportunities = 0;
      for (const lossTs of worstTimestamps) {
        scoredOpportunities += 1;
        const hasFollowUp = trades.some((trade) => {
          const tradeTs = new Date(trade.timestamp).getTime();
          const diff = tradeTs - lossTs;
          return diff > 0 && diff <= MS_60_MIN;
        });
        if (hasFollowUp) escalationFollowUps += 1;
      }
      postLossEscalationShare = scoredOpportunities > 0 ? escalationFollowUps / scoredOpportunities : 0;
    }

    const scoredPnlAvailable = analytics.pnlEstimate.confidence !== "none";
    const score = scoredPnlAvailable
      ? clamp01(0.5 * rapidRatio + 0.5 * postLossEscalationShare)
      : clamp01(Math.min(rapidRatio, 0.5));

    const confidence: BehaviorPattern["confidence"] =
      analytics.pnlEstimate.confidence === "high" && analytics.worstTrades.length >= 5
        ? "high"
        : analytics.pnlEstimate.confidence === "medium"
        ? "medium"
        : "low";

    const evidence: string[] = [
      `${analytics.rapidTradeCount} rapid follow-up trades within 30 min of previous (out of ${total}).`,
      scoredPnlAvailable
        ? `${(postLossEscalationShare * 100).toFixed(0)}% of worst trades had a follow-up within 60 minutes.`
        : `PnL confidence is "${analytics.pnlEstimate.confidence}" — escalation share not computed.`
    ];
    if (analytics.worstTrades[0]) {
      const w = analytics.worstTrades[0];
      evidence.push(`Worst trade: ${w.symbol} pnl ${w.pnl} at ${w.timestamp}.`);
    }

    return {
      id: "revenge_trading",
      label: "Revenge trading signals",
      score,
      confidence,
      severity: severityFromScore(score),
      evidence
    };
  }

  static overtrading(analytics: AnalyticsData): BehaviorPattern {
    const total = analytics.totalTrades;
    const tradesPerActiveDay = analytics.activeDays > 0 ? total / analytics.activeDays : total;
    const rapidRatio = total > 0 ? analytics.rapidTradeCount / total : 0;

    const score = clamp01(
      0.5 * Math.min(tradesPerActiveDay / 30, 1) + 0.5 * Math.min(rapidRatio / 0.5, 1)
    );

    const confidence: BehaviorPattern["confidence"] =
      analytics.activeDays >= 7 ? "high" : analytics.activeDays >= 3 ? "medium" : "low";

    return {
      id: "overtrading",
      label: "Overtrading",
      score,
      confidence,
      severity: severityFromScore(score),
      evidence: [
        `${total} trades across ${analytics.activeDays} active days (avg ${tradesPerActiveDay.toFixed(1)}/day).`,
        `${analytics.rapidTradeCount} rapid follow-ups within 30 min (${(rapidRatio * 100).toFixed(1)}%).`
      ]
    };
  }

  static fomo(trades: NormalizedTrade[]): BehaviorPattern {
    let count = 0;
    const sorted = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.side !== "BUY" || curr.side !== "BUY") continue;
      if (prev.symbol !== curr.symbol) continue;
      const dt = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (dt > 0 && dt <= MS_15_MIN && curr.quoteQuantity > prev.quoteQuantity) {
        count += 1;
      }
    }
    const rawScore = clamp01(count / 10);
    const score = Math.min(rawScore, 0.6);
    return {
      id: "fomo",
      label: "FOMO buying",
      score,
      confidence: count === 0 ? "low" : "medium",
      severity: severityFromScore(score),
      evidence: [
        `${count} consecutive same-symbol buys within 15 min where the next buy was larger.`,
        "Confidence capped at medium without price data."
      ]
    };
  }

  static averagingDown(trades: NormalizedTrade[]): BehaviorPattern {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let longestStreak = 0;
    let bestSymbol = "";

    const bySymbol = new Map<string, NormalizedTrade[]>();
    for (const t of sorted) {
      const arr = bySymbol.get(t.symbol) ?? [];
      arr.push(t);
      bySymbol.set(t.symbol, arr);
    }

    for (const [symbol, list] of bySymbol) {
      let currentStreak = 0;
      let cumulativeQty = 0;
      let lastTs = 0;
      for (const trade of list) {
        const ts = new Date(trade.timestamp).getTime();
        if (trade.side === "SELL") {
          currentStreak = 0;
          cumulativeQty = 0;
          lastTs = ts;
          continue;
        }
        if (lastTs === 0 || ts - lastTs <= MS_24_HOUR) {
          currentStreak += 1;
          cumulativeQty += trade.quantity;
        } else {
          currentStreak = 1;
          cumulativeQty = trade.quantity;
        }
        lastTs = ts;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
          bestSymbol = symbol;
        }
      }
    }

    const qualifyingStreak = longestStreak >= 3 ? longestStreak : 0;
    const score = clamp01(qualifyingStreak / 6);
    const confidence: BehaviorPattern["confidence"] =
      qualifyingStreak >= 5 ? "high" : qualifyingStreak >= 3 ? "medium" : "low";

    return {
      id: "averaging_down",
      label: "Averaging down",
      score,
      confidence,
      severity: severityFromScore(score),
      evidence:
        qualifyingStreak > 0
          ? [
              `Longest BUY-only streak on ${bestSymbol}: ${qualifyingStreak} buys within 24h windows.`,
              "Without price data, this is a sequence heuristic, not loss confirmation."
            ]
          : ["No qualifying averaging-down sequence (≥3 consecutive BUYs within 24h)."]
    };
  }
}
