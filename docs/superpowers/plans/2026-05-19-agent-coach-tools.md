# Agent Coach 2.0 — Gemini Tool-Using Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the AI Coach into a Gemini tool-using agent that calls 4 deterministic backend tools (worst trades / what-if / behavior patterns / risk budget), exposes a What-If button in chat, and adds a Trading DNA radar on the Insights page — without breaking any existing behaviour.

**Architecture:** Surgical additions on top of the current `AICoachService` (planSubTasks/runSubAgent/composeAnswer) pipeline. New `CoachToolService` (pure logic over `AnalyticsData`), new `BehaviorPatternDetector` (shared by tool, insights, and radar), new `GeminiService.generateWithTools` method (native Gemini function calling with max 4 rounds + fallback). `AICoachService.answerQuestion` tries the tool path when Gemini is configured; on **any** failure it falls back to the existing sub-agent path verbatim. All new fields on `AiCoachAnswer` / `AnalyticsData` are optional → response shape stays backward-compatible.

**Tech Stack:** Next.js 15 / React 19 / TypeScript 5.8 / Prisma 6 / Gemini 2.5 Flash (REST `v1beta`) / Recharts 2.15 / Zod 3.24 / Tailwind 3.4.

**Verification strategy:** No test framework exists in this repo (spec out-of-scope) and the user explicitly excluded adding one this sprint. Each task therefore ends with `npm run typecheck` (must exit 0) and, after UI tasks, a `npm run build` (must exit 0) plus a brief manual smoke. **Type-check is the contract.** This matches the spec's success criteria.

**Reference spec:** [docs/superpowers/specs/2026-05-19-agent-coach-tools-design.md](../specs/2026-05-19-agent-coach-tools-design.md)

**Open spec question (Section 13):** `toolTrace` is **UI-only** this sprint (default per spec). PDF route is not modified.

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/analytics/BehaviorPatternDetector.ts` | Pure detection logic for revenge / overtrading / fomo / averaging-down. Shared by tool C, InsightGenerator, and TradingDnaRadar. |
| Create | `lib/ai/CoachToolService.ts` | 4 tool executors (get_my_worst_trades, simulate_what_if, detect_behavior_patterns, risk_budget_today). Pure functions over `AnalyticsData`. |
| Create | `app/api/ai-coach/what-if/route.ts` | POST endpoint for the What-If panel. |
| Create | `components/insights/TradingDnaRadar.tsx` | 6-axis Recharts radar (Revenge / Overtrading / FOMO / Averaging / Timing / Fee Drag). |
| Modify | `types/index.ts` | Append optional types: `BehaviorPattern`, `CoachToolTrace`, `WhatIfSimulationResult`, optional fields on `AnalyticsData` and `AiCoachAnswer`, widen `structuredVersion` union. |
| Modify | `lib/ai/GeminiService.ts` | Add `generateWithTools<T>` method. `generateText`/`generateJson` unchanged. |
| Modify | `lib/rag/AICoachService.ts` | Add `runToolUsingPath` + `keyFindingsFromTrace`. `answerQuestion` tries tool path first; fallback path verbatim. |
| Modify | `lib/analytics/AnalyticsService.ts` | After computing analytics, attach `behaviorPatterns` from `BehaviorPatternDetector`. |
| Modify | `lib/analytics/InsightGenerator.ts` | After existing rules, append top 2-3 behavior pattern insights (skip duplicates). |
| Modify | `app/api/ai-coach/chat/route.ts` | No code changes; verify it still returns the existing shape. (Touch only if shape regresses.) |
| Modify | `components/ai-coach/CoachChat.tsx` | Add What-If panel above chat box. Render `toolTrace` block when present. |
| Modify | `app/insights/page.tsx` | Mount `<TradingDnaRadar/>` below `<TraderProfileCard/>`. |
| Modify | `lib/i18n/dictionaries/en.ts` + `tr.ts` | Add `aiCoach.chat.whatIf.*`, `aiCoach.chat.toolTrace`, `insights.dna.*`. |

---

## Task order rationale

Built bottom-up: types → pure logic → integration → API → UI → i18n → final verification. Each task is independently committable; later tasks depend on earlier ones (e.g. CoachToolService imports BehaviorPatternDetector).

---

## Task 1: Add new types (additive only)

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add new exported interfaces and widen `structuredVersion`**

Open `types/index.ts`. Find `EstimatedTradePnl` interface (around line 75). After the `PnlEstimate` interface block ends, add:

```ts
export interface BehaviorPattern {
  id: "revenge_trading" | "overtrading" | "fomo" | "averaging_down";
  label: string;
  score: number;
  confidence: "low" | "medium" | "high";
  severity: InsightSeverity;
  evidence: string[];
}

export interface CoachToolTrace {
  tool: string;
  input: unknown;
  outputSummary: string;
}

export interface WhatIfSimulationResult {
  baselinePnl: number;
  simulatedPnl: number;
  delta: number;
  skippedTrades: Array<Pick<EstimatedTradePnl, "tradeId" | "symbol" | "timestamp" | "pnl">>;
  ignoredIds: string[];
  confidence: "none" | "low" | "medium" | "high";
}
```

- [ ] **Step 2: Add optional `behaviorPatterns` to `AnalyticsData`**

In the same file, find the `AnalyticsData` interface. Add `behaviorPatterns?: BehaviorPattern[];` after `generatedInsights: GeneratedInsight[];`:

```ts
export interface AnalyticsData {
  /* ...existing fields unchanged... */
  generatedInsights: GeneratedInsight[];
  behaviorPatterns?: BehaviorPattern[];
}
```

- [ ] **Step 3: Add optional `toolTrace` and widen `structuredVersion` on `AiCoachAnswer`**

Find the `AiCoachAnswer` interface. Replace the `structuredVersion: "agentic-v1";` line with the widened union, and add the optional toolTrace field:

```ts
export interface AiCoachAnswer {
  answer: string;
  keyFindings: CoachKeyFinding[];
  evidence: AiEvidence[];
  retrievedChunks: RagChunk[];
  subAgentResults: CoachSubAgentResult[];
  traderProfile?: TraderProfile;
  disclaimer: string;
  structuredVersion: "agentic-v1" | "agentic-tools-v1";
  toolTrace?: CoachToolTrace[];
}
```

- [ ] **Step 4: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: exit 0. (`app/api/ai-coach/report/route.ts` uses literal `"agentic-v1"` — it falls into the widened union, no edit needed.)

- [ ] **Step 5: Commit**

```bash
git add types/index.ts
git commit -m "types: add BehaviorPattern, CoachToolTrace, WhatIfSimulationResult; widen structuredVersion"
```

---

## Task 2: BehaviorPatternDetector (pure logic)

**Files:**
- Create: `lib/analytics/BehaviorPatternDetector.ts`

- [ ] **Step 1: Create the detector with all four pattern rules**

Create `lib/analytics/BehaviorPatternDetector.ts` with:

```ts
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
          return diff > 0 && diff <= MS_60_MIN && diff >= MS_15_MIN * 0;
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
          if (trade.quantity > cumulativeQty * 0.1 || cumulativeQty === 0) {
            currentStreak += 1;
            cumulativeQty += trade.quantity;
          }
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
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/BehaviorPatternDetector.ts
git commit -m "analytics: BehaviorPatternDetector for revenge/overtrading/fomo/averaging"
```

---

## Task 3: GeminiService — `generateWithTools`

**Files:**
- Modify: `lib/ai/GeminiService.ts`

- [ ] **Step 1: Add `GeminiToolDeclaration` type and `generateWithTools` method**

Open `lib/ai/GeminiService.ts`. After the `generateJson<T>` method ends and before the `extractJson` function, add:

```ts
export interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GeminiToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiToolResult<TTrace = unknown> {
  finalText: string;
  trace: Array<{ tool: string; input: unknown; outputSummary: string }>;
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
}

interface GeminiContent {
  role: "user" | "model" | "function";
  parts: GeminiPart[];
}
```

Then add a new method inside the `GeminiService` class (after `generateJson`):

```ts
  async generateWithTools(opts: {
    systemInstruction: string;
    prompt: string;
    tools: GeminiToolDeclaration[];
    executor: (call: GeminiToolCall) => Promise<unknown>;
    summarize?: (call: GeminiToolCall, output: unknown) => string;
    maxRounds?: number;
    temperature?: number;
  }): Promise<GeminiToolResult> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const maxRounds = opts.maxRounds ?? 4;
    const trace: Array<{ tool: string; input: unknown; outputSummary: string }> = [];

    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: opts.prompt }] }
    ];

    for (let round = 0; round < maxRounds; round += 1) {
      const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.systemInstruction }] },
          contents,
          tools: [{ functionDeclarations: opts.tools }],
          generationConfig: {
            temperature: opts.temperature ?? 0.15
          }
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? `Gemini tool request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { role?: string; parts?: GeminiPart[] } }>;
      };

      const candidate = payload.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts ?? [];
      if (parts.length === 0) {
        return { finalText: "", trace };
      }

      contents.push({ role: "model", parts });

      const functionCallPart = parts.find((p) => p.functionCall);
      if (!functionCallPart || !functionCallPart.functionCall) {
        const finalText = parts
          .map((part) => part.text ?? "")
          .join("")
          .trim();
        return { finalText, trace };
      }

      const call: GeminiToolCall = {
        name: functionCallPart.functionCall.name,
        args: functionCallPart.functionCall.args ?? {}
      };

      let output: unknown;
      try {
        output = await opts.executor(call);
      } catch (executorError) {
        output = { error: executorError instanceof Error ? executorError.message : "tool execution failed" };
      }

      const summary = opts.summarize ? opts.summarize(call, output) : defaultSummary(call, output);
      trace.push({ tool: call.name, input: call.args, outputSummary: summary });

      contents.push({
        role: "function",
        parts: [{ functionResponse: { name: call.name, response: output as Record<string, unknown> } }]
      });
    }

    return { finalText: "", trace };
  }
```

Then after the `extractJson` function, add a `defaultSummary` helper at the bottom of the file:

```ts
function defaultSummary(call: GeminiToolCall, output: unknown): string {
  try {
    const json = JSON.stringify(output);
    const truncated = json.length > 240 ? `${json.slice(0, 240)}…` : json;
    return `${call.name}(${JSON.stringify(call.args)}) → ${truncated}`;
  } catch {
    return `${call.name} → [unserializable output]`;
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/GeminiService.ts
git commit -m "ai: GeminiService.generateWithTools for native function calling"
```

---

## Task 4: CoachToolService — 4 tool executors

**Files:**
- Create: `lib/ai/CoachToolService.ts`

- [ ] **Step 1: Create the service with the four tools**

Create `lib/ai/CoachToolService.ts`:

```ts
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
      const top = patterns.sort((a, b) => b.score - a.score)[0];
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
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/CoachToolService.ts
git commit -m "ai: CoachToolService with worst-trades, what-if, behavior-patterns, risk-budget tools"
```

---

## Task 5: Wire tool path into AICoachService

**Files:**
- Modify: `lib/rag/AICoachService.ts`

- [ ] **Step 1: Add imports for the new tool service**

Open `lib/rag/AICoachService.ts`. At the top, the existing imports already include `GeminiService` and types. Add an import for `CoachToolService` and its IO types, and import `NormalizedTrade`:

```ts
import { CoachToolService } from "@/lib/ai/CoachToolService";
import type {
  AiCoachAnswer,
  AiEvidence,
  AnalyticsData,
  BehaviorPattern,
  CoachKeyFinding,
  CoachSubAgentResult,
  CoachToolTrace,
  NormalizedTrade,
  RagChunk,
  TraderProfile
} from "@/types";
```

(Replace the existing types import block; do not duplicate.)

- [ ] **Step 2: Change `answerQuestion` to accept trades and try the tool path**

Currently `answerQuestion(question, analytics, chunks, traderProfile)`. Tools need raw trades for FOMO/averaging-down. Change signature to also accept trades — keep `trades` defaulting to `[]` for backward compatibility so older callers still typecheck:

Replace the existing `answerQuestion` method with:

```ts
  async answerQuestion(
    question: string,
    analytics: AnalyticsData,
    chunks: RagChunk[],
    traderProfile?: TraderProfile,
    trades: NormalizedTrade[] = []
  ): Promise<AiCoachAnswer> {
    const retrieved = this.vectorStore.retrieve(question, chunks, 8);

    if (analytics.totalTrades === 0 || retrieved.length === 0) {
      return {
        answer:
          "I do not have enough grounded trade data to answer that. Connect a read-only Binance key or load demo data, then ask again. I will not guess without session-specific evidence.",
        keyFindings: [],
        evidence: [],
        retrievedChunks: [],
        subAgentResults: [],
        traderProfile,
        disclaimer: COACH_DISCLAIMER,
        structuredVersion: "agentic-v1"
      };
    }

    if (this.gemini.isConfigured()) {
      try {
        const toolResult = await this.runToolUsingPath(question, analytics, trades, retrieved, traderProfile);
        if (toolResult && toolResult.finalText.trim().length > 0) {
          return {
            answer: toolResult.finalText,
            keyFindings: this.keyFindingsFromTrace(toolResult.trace, analytics, traderProfile),
            evidence: retrieved.slice(0, 5).map(evidenceFromChunk),
            retrievedChunks: retrieved,
            subAgentResults: [],
            toolTrace: toolResult.trace,
            traderProfile,
            disclaimer: COACH_DISCLAIMER,
            structuredVersion: "agentic-tools-v1"
          };
        }
      } catch {
        // fall through to existing path
      }
    }

    const plan = await this.planSubTasks(question, analytics, retrieved, traderProfile);
    const subAgentResults = await Promise.all(
      plan.subTasks.map((task) => this.runSubAgent(task, question, analytics, retrieved, traderProfile))
    );

    const final = await this.composeAnswer(question, analytics, retrieved, subAgentResults, traderProfile);

    return {
      answer: final.answer,
      keyFindings: final.keyFindings,
      evidence: retrieved.slice(0, 5).map(evidenceFromChunk),
      retrievedChunks: retrieved,
      subAgentResults,
      traderProfile,
      disclaimer: COACH_DISCLAIMER,
      structuredVersion: "agentic-v1"
    };
  }
```

- [ ] **Step 3: Add `runToolUsingPath` and `keyFindingsFromTrace` private methods**

At the bottom of the `AICoachService` class (before the closing brace), add:

```ts
  private async runToolUsingPath(
    question: string,
    analytics: AnalyticsData,
    trades: NormalizedTrade[],
    retrieved: RagChunk[],
    traderProfile?: TraderProfile
  ): Promise<{ finalText: string; trace: CoachToolTrace[] } | null> {
    const toolService = new CoachToolService(analytics, trades);

    const tools = [
      {
        name: "get_my_worst_trades",
        description: "Return the worst trades by realized PnL from the user's session.",
        parameters: {
          type: "object",
          properties: {
            period: { type: "string", enum: ["7d", "30d", "all"] },
            limit: { type: "integer", minimum: 1, maximum: 10 }
          }
        }
      },
      {
        name: "simulate_what_if",
        description: "Subtractively simulate what the realized PnL would be if certain trades were skipped.",
        parameters: {
          type: "object",
          properties: {
            skipTradeIds: { type: "array", items: { type: "string" } }
          },
          required: ["skipTradeIds"]
        }
      },
      {
        name: "detect_behavior_patterns",
        description: "Detect revenge trading, overtrading, FOMO, and averaging-down patterns in the user's session.",
        parameters: {
          type: "object",
          properties: {
            focus: { type: "string", enum: ["revenge_trading", "overtrading", "fomo", "averaging_down", "all"] }
          }
        }
      },
      {
        name: "risk_budget_today",
        description: "Return behavioral (NOT financial) risk hygiene guidance for the current session.",
        parameters: { type: "object", properties: {} }
      }
    ];

    const executor = async (call: { name: string; args: Record<string, unknown> }): Promise<unknown> => {
      switch (call.name) {
        case "get_my_worst_trades":
          return toolService.getMyWorstTrades(call.args as { period?: "7d" | "30d" | "all"; limit?: number });
        case "simulate_what_if":
          return toolService.simulateWhatIf({ skipTradeIds: ((call.args.skipTradeIds as string[]) ?? []).filter((id) => typeof id === "string") });
        case "detect_behavior_patterns":
          return toolService.detectBehaviorPatterns(call.args as { focus?: "revenge_trading" | "overtrading" | "fomo" | "averaging_down" | "all" });
        case "risk_budget_today":
          return toolService.riskBudgetToday();
        default:
          return { error: `unknown tool: ${call.name}` };
      }
    };

    const systemInstruction = [
      "You are the Gemini AI Trade Coach for a read-only Binance analytics dashboard.",
      "Use the provided tools BEFORE answering when the user's question involves losses, worst trades, what-if simulations, revenge trading, overtrading, FOMO, averaging-down, risk budget, or behavioral patterns.",
      "Never recommend buy, sell, hold, leverage, entries, exits, or specific assets.",
      "Tool results are factual session data. Quote concrete numbers from them.",
      "If a tool reports low confidence, say so in the answer."
    ].join("\n");

    const prompt = JSON.stringify(
      {
        question,
        cachedTraderProfile: traderProfile ?? null,
        retrievedContextRefs: retrieved.slice(0, 6).map((c) => c.sourceRef),
        outputInstruction: "Plain text answer for the trader. Include 3-5 concrete data points."
      },
      null,
      2
    );

    const { finalText, trace } = await this.gemini.generateWithTools({
      systemInstruction,
      prompt,
      tools,
      executor,
      maxRounds: 4,
      temperature: 0.15
    });

    return { finalText, trace };
  }

  private keyFindingsFromTrace(
    trace: CoachToolTrace[],
    analytics: AnalyticsData,
    traderProfile?: TraderProfile
  ): CoachKeyFinding[] {
    const findings: CoachKeyFinding[] = [];

    const patternsCall = trace.find((t) => t.tool === "detect_behavior_patterns");
    if (patternsCall) {
      const summary = patternsCall.outputSummary;
      // Pull pattern info from the executor output via summary text isn't ideal; instead re-run detector since it's pure.
    }

    // Always re-run detector here for deterministic findings (pure function, cheap).
    const patterns: BehaviorPattern[] = (() => {
      try {
        // Lazy import-style — same module already imported at top via BehaviorPatternDetector usage in CoachToolService.
        const { BehaviorPatternDetector } = require("@/lib/analytics/BehaviorPatternDetector") as typeof import("@/lib/analytics/BehaviorPatternDetector");
        return BehaviorPatternDetector.detect(analytics, []);
      } catch {
        return [];
      }
    })();

    const sortedPatterns = [...patterns].sort((a, b) => b.score - a.score).slice(0, 3);
    for (const p of sortedPatterns) {
      findings.push({
        title: p.label,
        detail: p.evidence.slice(0, 2).join(" "),
        severity: p.severity,
        evidenceRef: p.id
      });
    }

    const hasWorstTradesCall = trace.some((t) => t.tool === "get_my_worst_trades");
    if (hasWorstTradesCall && analytics.worstTrades.length > 0) {
      const worst = analytics.worstTrades[0];
      findings.push({
        title: `Worst trade: ${worst.symbol}`,
        detail: `pnl ${worst.pnl} at ${worst.timestamp}`,
        severity: "warning",
        evidenceRef: worst.tradeId
      });
    }

    if (analytics.pnlEstimate.confidence === "low" || analytics.pnlEstimate.confidence === "none") {
      findings.push({
        title: "PnL confidence is limited",
        detail: `PnL estimate confidence is "${analytics.pnlEstimate.confidence}" — interpret performance claims with caution.`,
        severity: "info",
        evidenceRef: "pnl-estimate"
      });
    }

    if (findings.length === 0) {
      return this.defaultKeyFindings(analytics, traderProfile);
    }

    return findings.slice(0, 5);
  }
```

**Replace the `require`-based dynamic import with a static import** to keep TypeScript happy. At the top of the file, add:

```ts
import { BehaviorPatternDetector } from "@/lib/analytics/BehaviorPatternDetector";
```

Then simplify the patterns IIFE inside `keyFindingsFromTrace` to:

```ts
    const patterns: BehaviorPattern[] = BehaviorPatternDetector.detect(analytics, []);
```

(Remove the entire `(() => { try { const { ... } = require(...) ... } catch { ... } })()` block.)

- [ ] **Step 4: Update the call site in `app/api/ai-coach/chat/route.ts` to pass trades**

Open `app/api/ai-coach/chat/route.ts`. Find the line:

```ts
  const answer = await new AICoachService().answerQuestion(
    parsed.data.question,
    session.analytics,
    [...session.chunks, ...indexedMaterials],
    traderProfile
  );
```

Replace with:

```ts
  const answer = await new AICoachService().answerQuestion(
    parsed.data.question,
    session.analytics,
    [...session.chunks, ...indexedMaterials],
    traderProfile,
    session.trades
  );
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/rag/AICoachService.ts app/api/ai-coach/chat/route.ts
git commit -m "rag: wire Gemini tool-using path with fallback into AICoachService"
```

---

## Task 6: Attach behavior patterns to AnalyticsData + append insights

**Files:**
- Modify: `lib/analytics/AnalyticsService.ts`
- Modify: `lib/analytics/InsightGenerator.ts`

- [ ] **Step 1: Have `AnalyticsService.compute` attach `behaviorPatterns`**

Open `lib/analytics/AnalyticsService.ts`. At the top, add import:

```ts
import { BehaviorPatternDetector } from "@/lib/analytics/BehaviorPatternDetector";
```

Inside `static compute(...)`, just before the `return {` statement, add:

```ts
    const behaviorPatterns = BehaviorPatternDetector.detect(
      {
        totalTrades,
        totalVolume,
        averageTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0,
        buySell: { buys, sells, buyRatio: 0, sellRatio: 0 },
        feesByAsset,
        quoteFeeEstimate,
        marketBreakdown,
        mostTradedSymbols: symbolSummaries,
        symbolSummaries,
        activityByDate,
        activityByMonth,
        activityByHour,
        hourlyBehavior,
        heatmap,
        rapidTradeCount,
        lateNightTradeCount,
        activeDays: activityByDate.length,
        pnlEstimate: pnlComputation.pnlEstimate,
        bestTrades: pnlComputation.bestTrades,
        worstTrades: pnlComputation.worstTrades,
        generatedInsights
      },
      sorted
    );
```

Then in the returned object, append `behaviorPatterns` as the last field:

```ts
    return {
      /* ...existing unchanged... */
      generatedInsights,
      behaviorPatterns
    };
```

- [ ] **Step 2: Append behavior pattern insights in `InsightGenerator`**

Open `lib/analytics/InsightGenerator.ts`. At the top, add import:

```ts
import { BehaviorPatternDetector } from "@/lib/analytics/BehaviorPatternDetector";
import type { BehaviorPattern } from "@/types";
```

Replace the final `return insights.length > 0 ? insights : [...]` block. Just before that final return, add:

```ts
    const patterns = BehaviorPatternDetector.detect(analytics, trades);
    const topPatterns = [...patterns].sort((a, b) => b.score - a.score).slice(0, 3);
    for (const p of topPatterns) {
      if (p.score < 0.3) continue;
      const titleLower = p.label.toLowerCase();
      if (p.id === "overtrading" && insights.some((i) => i.title.toLowerCase().includes("overtrading"))) continue;
      if (p.id === "revenge_trading" && insights.some((i) => i.title.toLowerCase().includes("revenge"))) continue;
      insights.push(this.behaviorPatternInsight(p));
    }
```

Then, still in the class, add a static helper method just below `generate`:

```ts
  private static behaviorPatternInsight(p: BehaviorPattern): GeneratedInsight {
    return insight({
      title: p.label,
      message: p.evidence.join(" "),
      severity: p.severity,
      category: "discipline",
      evidence: p.evidence
    });
  }
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add lib/analytics/AnalyticsService.ts lib/analytics/InsightGenerator.ts
git commit -m "analytics: attach behaviorPatterns and append behavioral insights"
```

---

## Task 7: i18n keys (EN + TR)

**Files:**
- Modify: `lib/i18n/dictionaries/en.ts`
- Modify: `lib/i18n/dictionaries/tr.ts`

- [ ] **Step 1: Inspect the existing `aiCoach.chat` and `insights` structures**

Run: `head -200 lib/i18n/dictionaries/en.ts | grep -n -E "aiCoach|insights|whatIf|dna" || true`
Expected: shows where `aiCoach` and `insights` blocks start.

- [ ] **Step 2: Add new EN keys under `aiCoach.chat` and `insights`**

Open `lib/i18n/dictionaries/en.ts`. Inside the `aiCoach.chat` object, add (before the closing brace of `chat`):

```ts
      whatIf: {
        title: "What-if simulator",
        skipWorst5: "Skip worst 5 trades",
        baseline: "Current PnL",
        simulated: "Without skipped",
        delta: "Difference",
        empty: "No worst trades available yet.",
        loading: "Simulating…"
      },
      toolTrace: "Tools Coach used"
```

(Add a comma after the previous key if needed.)

Inside the `insights` object, add:

```ts
    dna: {
      title: "Trading DNA",
      subtitle: "Six behavioral axes from your own session.",
      axes: {
        revenge: "Revenge",
        overtrading: "Overtrading",
        fomo: "FOMO",
        averaging: "Averaging Down",
        timing: "Timing Risk",
        feeDrag: "Fee Drag"
      },
      empty: "Not enough trade data yet."
    }
```

- [ ] **Step 3: Mirror in TR**

Open `lib/i18n/dictionaries/tr.ts`. Add the same shape with Turkish strings:

```ts
      whatIf: {
        title: "Ya yapmasaydım?",
        skipWorst5: "En kötü 5 trade'i atla",
        baseline: "Mevcut PnL",
        simulated: "Atlandıktan sonra",
        delta: "Fark",
        empty: "Henüz analiz edilecek en kötü trade yok.",
        loading: "Hesaplanıyor…"
      },
      toolTrace: "Koç'un kullandığı araçlar"
```

```ts
    dna: {
      title: "Trading DNA",
      subtitle: "Senin oturumundan altı davranış ekseni.",
      axes: {
        revenge: "İntikam",
        overtrading: "Aşırı işlem",
        fomo: "FOMO",
        averaging: "Ortalama düşürme",
        timing: "Zamanlama riski",
        feeDrag: "Komisyon yükü"
      },
      empty: "Henüz yeterli işlem verisi yok."
    }
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0. The `Dictionary` type is inferred from `en.ts` and `tr.ts` must satisfy it — if a key was missed on one side, TS will fail. Fix any mismatch.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/dictionaries/en.ts lib/i18n/dictionaries/tr.ts
git commit -m "i18n: add what-if and DNA radar keys (EN+TR)"
```

---

## Task 8: What-If API route

**Files:**
- Create: `app/api/ai-coach/what-if/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/ai-coach/what-if/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { CoachToolService } from "@/lib/ai/CoachToolService";
import { resolveSession } from "@/lib/db/sessionResolver";

const BodySchema = z.object({
  sessionId: z.string().min(8),
  skipTradeIds: z.array(z.string()).max(20).optional()
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = await resolveSession(parsed.data.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  const tool = new CoachToolService(session.analytics, session.trades);
  const skipIds =
    parsed.data.skipTradeIds && parsed.data.skipTradeIds.length > 0
      ? parsed.data.skipTradeIds
      : session.analytics.worstTrades.slice(0, 5).map((t) => t.tradeId);

  const result = tool.simulateWhatIf({ skipTradeIds: skipIds });
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/api/ai-coach/what-if/route.ts
git commit -m "api: what-if simulation endpoint"
```

---

## Task 9: CoachChat — add What-If panel + render `toolTrace`

**Files:**
- Modify: `components/ai-coach/CoachChat.tsx`

- [ ] **Step 1: Add useState + the What-If panel above chat messages**

Open `components/ai-coach/CoachChat.tsx`. Add an import for the icon: in the existing `lucide-react` imports, add `Wand2`:

```ts
import {
  Activity,
  Bot,
  BrainCircuit,
  CheckCircle2,
  DatabaseZap,
  FileDown,
  Flame,
  Layers3,
  Loader2,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserRoundCog,
  Wand2
} from "lucide-react";
```

Import the type:

```ts
import type { AiCoachAnswer, AnalyticsData, TraderProfile, WhatIfSimulationResult } from "@/types";
```

Inside the `CoachChat` function, near the other `useState` hooks (after `const [reportError, setReportError] = useState<string | null>(null);`), add:

```ts
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfSimulationResult | null>(null);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);
```

Add the handler function just above the existing `async function ask(...)`:

```ts
  async function runWhatIf() {
    if (whatIfLoading) return;
    setWhatIfLoading(true);
    setWhatIfError(null);
    try {
      const response = await fetch("/api/ai-coach/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const payload = (await response.json()) as WhatIfSimulationResult | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "What-if request failed.");
      }
      setWhatIfResult(payload as WhatIfSimulationResult);
    } catch (err) {
      setWhatIfError(err instanceof Error ? err.message : "What-if request failed.");
    } finally {
      setWhatIfLoading(false);
    }
  }
```

- [ ] **Step 2: Render the What-If panel above the chat box**

Inside the chat `<Card>` → `<CardContent>`, immediately after the SUGGESTED_COACH_QUESTIONS chips `</div>` and BEFORE the message list `<div className="mt-4 sm:mt-5" ...>`, insert:

```tsx
          <div
            className="mt-4"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--tl-line)",
              background: "rgba(6, 10, 20, 0.45)",
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ padding: 6, borderRadius: 8, border: "1px solid var(--tl-line-strong)", background: "var(--tl-cyan-soft)", color: "var(--tl-cyan)" }}>
                <Wand2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tl-ink)", margin: 0 }}>{t.aiCoach.chat.whatIf.title}</p>
                <p style={{ marginTop: 2, fontSize: 11.5, color: "var(--tl-ink-3)" }}>
                  {analytics.worstTrades.length === 0 ? t.aiCoach.chat.whatIf.empty : null}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <Button
                variant="secondary"
                onClick={runWhatIf}
                disabled={whatIfLoading || analytics.worstTrades.length === 0}
              >
                {whatIfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
                {whatIfLoading ? t.aiCoach.chat.whatIf.loading : t.aiCoach.chat.whatIf.skipWorst5}
              </Button>
              {whatIfResult ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <MetricChip label={t.aiCoach.chat.whatIf.baseline} value={whatIfResult.baselinePnl.toFixed(2)} />
                  <MetricChip label={t.aiCoach.chat.whatIf.simulated} value={whatIfResult.simulatedPnl.toFixed(2)} />
                  <MetricChip
                    label={t.aiCoach.chat.whatIf.delta}
                    value={`${whatIfResult.delta >= 0 ? "+" : ""}${whatIfResult.delta.toFixed(2)}`}
                  />
                </div>
              ) : null}
            </div>
            {whatIfResult && whatIfResult.skippedTrades.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {whatIfResult.skippedTrades.map((t) => (
                  <div
                    key={t.tradeId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      fontSize: 12,
                      color: "var(--tl-ink-3)"
                    }}
                  >
                    <span>{t.symbol}</span>
                    <span style={{ color: t.pnl < 0 ? "var(--tl-red)" : "var(--tl-green)" }}>{t.pnl.toFixed(2)}</span>
                    <span style={{ color: "var(--tl-ink-3)", fontSize: 11 }}>{t.timestamp.slice(0, 16).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {whatIfError ? <div className="tl-notice tl-notice-red">{whatIfError}</div> : null}
          </div>
```

- [ ] **Step 3: Render `toolTrace` block in the message map (alongside subAgentResults)**

Inside the `messages.map((message, index) => ...)` block, find the conditional that renders `message.answer?.subAgentResults.length ?`. Immediately after that block (and before the `evidence` block), add:

```tsx
                {message.answer?.toolTrace && message.answer.toolTrace.length > 0 ? (
                  <div className="tl-panel tl-tone-cyan" style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(91, 224, 230, 0.9)" }}>
                      <Wand2 className="h-4 w-4" aria-hidden="true" />
                      {t.aiCoach.chat.toolTrace}
                    </div>
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {message.answer.toolTrace.map((tt, ttIndex) => (
                        <div key={`${tt.tool}-${ttIndex}`} className="tl-panel" style={{ background: "rgba(6, 10, 20, 0.55)" }}>
                          <Badge tone="cyan">{tt.tool}</Badge>
                          <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55, color: "var(--tl-ink-2)" }}>{tt.outputSummary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: exit 0 (Next.js production build succeeds).

- [ ] **Step 6: Manual smoke (only if dev server is available)**

Run: `npm run dev` (in another terminal)
Navigate to: `/ai-coach` with a session that has trades. Click "Skip worst 5 trades". Confirm:
- Baseline / Simulated / Delta chips render with numbers.
- 5 skipped trades list below.
- Empty state shows if `worstTrades.length === 0`.

Stop the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add components/ai-coach/CoachChat.tsx
git commit -m "ai-coach: what-if panel + tool trace render"
```

---

## Task 10: TradingDnaRadar component

**Files:**
- Create: `components/insights/TradingDnaRadar.tsx`

- [ ] **Step 1: Create the radar component**

Create `components/insights/TradingDnaRadar.tsx`:

```tsx
"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n";
import { BehaviorPatternDetector } from "@/lib/analytics/BehaviorPatternDetector";
import type { AnalyticsData, NormalizedTrade } from "@/types";

interface TradingDnaRadarProps {
  analytics: AnalyticsData;
  trades: NormalizedTrade[];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function TradingDnaRadar({ analytics, trades }: TradingDnaRadarProps) {
  const t = useT();

  if (analytics.totalTrades === 0) {
    return (
      <Card>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ padding: 8, borderRadius: 10, border: "1px solid var(--tl-line-strong)", background: "var(--tl-cyan-soft)", color: "var(--tl-cyan)" }}>
              <Activity className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="tl-card-title">{t.insights.dna.title}</h2>
              <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.insights.dna.subtitle}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="tl-panel" style={{ fontSize: 13, color: "var(--tl-ink-3)" }}>{t.insights.dna.empty}</p>
        </CardContent>
      </Card>
    );
  }

  const patterns = analytics.behaviorPatterns ?? BehaviorPatternDetector.detect(analytics, trades);
  const byId = new Map(patterns.map((p) => [p.id, p.score]));

  const lateNightRatio = clamp01(analytics.lateNightTradeCount / Math.max(1, analytics.totalTrades));
  const feeDragRaw = analytics.quoteFeeEstimate / Math.max(1, analytics.totalVolume);
  const feeDrag = clamp01(feeDragRaw / 0.005);

  const data = [
    { axis: t.insights.dna.axes.revenge, value: clamp01(byId.get("revenge_trading") ?? 0) },
    { axis: t.insights.dna.axes.overtrading, value: clamp01(byId.get("overtrading") ?? 0) },
    { axis: t.insights.dna.axes.fomo, value: clamp01(byId.get("fomo") ?? 0) },
    { axis: t.insights.dna.axes.averaging, value: clamp01(byId.get("averaging_down") ?? 0) },
    { axis: t.insights.dna.axes.timing, value: lateNightRatio },
    { axis: t.insights.dna.axes.feeDrag, value: feeDrag }
  ];

  return (
    <Card>
      <CardHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ padding: 8, borderRadius: 10, border: "1px solid var(--tl-line-strong)", background: "var(--tl-cyan-soft)", color: "var(--tl-cyan)" }}>
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="tl-card-title">{t.insights.dna.title}</h2>
            <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.insights.dna.subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--tl-ink-2)", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
              <Radar
                name="DNA"
                dataKey="value"
                stroke="var(--tl-cyan)"
                fill="var(--tl-cyan)"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/insights/TradingDnaRadar.tsx
git commit -m "insights: TradingDnaRadar component (6-axis recharts)"
```

---

## Task 11: Mount the radar in the Insights page

**Files:**
- Modify: `app/insights/page.tsx`

- [ ] **Step 1: Inspect the current insights page**

Run: `head -120 app/insights/page.tsx`
Expected: shows JSX structure with `<TraderProfileCard/>` mount.

- [ ] **Step 2: Mount `<TradingDnaRadar/>` below `<TraderProfileCard/>`**

Open `app/insights/page.tsx`. At the top of the imports block, add:

```ts
import { TradingDnaRadar } from "@/components/insights/TradingDnaRadar";
```

Find the JSX area where `<TraderProfileCard ... />` is rendered. Immediately after that element (still inside its parent container), insert:

```tsx
<TradingDnaRadar analytics={session.analytics} trades={session.trades} />
```

If the variable holding the session is named differently (e.g. `data` or `payload`), use that name — `session.analytics` and `session.trades` are placeholders for the existing destructured props. Match what is already used by `<TraderProfileCard/>`.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/insights/page.tsx
git commit -m "insights: mount TradingDnaRadar below profile card"
```

---

## Task 12: Final verification

**Files:** (none — verification only)

- [ ] **Step 1: Full typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

- [ ] **Step 2: Manual smoke — fallback path (Gemini unavailable)**

Temporarily unset Gemini in a separate shell:

```bash
GEMINI_API_KEY="" npm run dev
```

Open `/ai-coach`, ask: "what are my biggest mistakes?"
Expected:
- Response renders.
- Sub-agent pipeline panel populates (existing behaviour).
- `subAgentResults` panel visible in the message.
- No `toolTrace` panel.
- `evidence` panel still visible.

Stop the dev server.

- [ ] **Step 3: Manual smoke — tool path (Gemini configured)**

With real `GEMINI_API_KEY` set in `.env`:

```bash
npm run dev
```

Open `/ai-coach`, ask: "neden zarar ettim?" or "why did I lose money?"
Expected:
- Response renders with concrete numbers Gemini cites.
- `toolTrace` panel visible listing tool calls like `get_my_worst_trades`, `detect_behavior_patterns`.
- `subAgentResults` panel NOT visible (empty array hides it).
- `evidence` panel still visible.
- `keyFindings` shows behavior pattern titles.

Then click "Skip worst 5 trades" button. Expected:
- Baseline / Simulated / Delta chips populate.
- 5 skipped trade rows show with symbol + pnl + timestamp.

Then navigate to `/insights`. Expected:
- TraderProfileCard still renders.
- Below it: TradingDnaRadar with 6 axes.
- All axis labels visible (TR or EN depending on locale).

Stop the dev server.

- [ ] **Step 4: Manual safety check — no financial advice**

In `/ai-coach`, ask: "should I buy BTC now?"
Expected:
- Response refuses or redirects to behavioral observation.
- No "buy" / "sell" / "hold" / "leverage" / "entry" / "exit" recommendations.
- `COACH_DISCLAIMER` still attached.

- [ ] **Step 5: Manual smoke — PDF report**

After a chat answer is produced (either path), click "Generate PDF report". Expected:
- PDF downloads.
- No crash even though `agentic-tools-v1` is a new union member.

- [ ] **Step 6: Final commit if anything was tweaked during verification**

If steps revealed small fixes, commit them as:

```bash
git add -p
git commit -m "fix: small polish from manual verification"
```

If nothing changed, skip this step.

---

## Self-review (filled out before handoff)

**1. Spec coverage:**

| Spec section | Task that implements it |
|---|---|
| 4.A `get_my_worst_trades` | Task 4 |
| 4.B `simulate_what_if` | Task 4 |
| 4.C `detect_behavior_patterns` | Task 4 (uses Task 2 detector) |
| 4.D `risk_budget_today` | Task 4 |
| 5.1 `generateWithTools` | Task 3 |
| 5.2 Fallback path | Task 5 (try/catch around tool path) |
| 5.3 System instruction | Task 5 |
| 6 AICoachService integration | Task 5 |
| 6 `keyFindingsFromTrace` rules | Task 5 |
| 7 What-If API + UI | Task 8 + Task 9 |
| 8 Trading DNA Radar | Task 10 + Task 11 |
| 9 InsightGenerator append | Task 6 |
| 10 Types | Task 1 |
| 11 i18n keys | Task 7 |
| 12 Success criteria #1-7, #10 | Task 12 verification + Task 6 dedupe |
| 12 Success criteria #8 (no financial advice) | Task 12 step 4 |
| 12 Success criteria #9 (no secrets in tool output) | Task 4 (only `AnalyticsData` + `NormalizedTrade` consumed) |
| 14 Out-of-scope | Honored — no Resend / cron / PDF toolTrace / test suite |
| 15 Priority order | Tasks ordered to match |

**2. Placeholder scan:** No "TBD" / "implement later" / "add appropriate error handling" / generic test stubs found in the plan. All code blocks are complete.

**3. Type consistency:**
- `CoachToolTrace` shape `{ tool, input, outputSummary }` used identically in `GeminiService.generateWithTools` return type (Task 3), `AICoachService.runToolUsingPath` return type (Task 5), and `CoachChat.tsx` render (Task 9). ✓
- `WhatIfSimulationResult` shape used in `CoachToolService.simulateWhatIf` (Task 4), `/api/ai-coach/what-if` response (Task 8), `CoachChat.tsx` state (Task 9). ✓
- `structuredVersion` union `"agentic-v1" | "agentic-tools-v1"` set in Task 1, returned in both branches of `AICoachService.answerQuestion` (Task 5). Existing `app/api/ai-coach/report/route.ts` literal `"agentic-v1"` falls into widened union. ✓
- `BehaviorPattern` shape consumed identically in `CoachToolService` (Task 4), `InsightGenerator.behaviorPatternInsight` (Task 6), `TradingDnaRadar` (Task 10), `AICoachService.keyFindingsFromTrace` (Task 5). ✓

---

Plan complete and saved to `docs/superpowers/plans/2026-05-19-agent-coach-tools.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
