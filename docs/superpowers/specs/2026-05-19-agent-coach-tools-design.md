# Agent Coach 2.0 — Gemini Tool-Using AI Coach + What-If + Trading DNA

**Status:** Draft for review
**Date:** 2026-05-19
**Owner:** Mert
**Sprint scope:** Hackathon BTK 2026 — Paket A
**Out of scope (roadmap only):** Resend e-mail, cron jobs, weekly summary

---

## 1. Why

Mevcut AI Coach pipeline (planSubTasks → runSubAgent → composeAnswer) iyi çalışıyor ama jüriye sunulduğunda "Gemini sadece metin üretiyor" görüntüsü veriyor. Hackathon değerlendirme kriterlerinde **AI/Agent kullanımı (15)** ve **yenilikçilik (15)** puanlarını maksimize etmek için Coach'u **gerçek araçlar çağıran** bir agent'a dönüştürüyoruz.

Kullanıcı "geçen ay neden battım?" / "neden zarar ettim?" tipi sorduğunda Coach:
1. En kötü trade'leri bulur (tool çağrısı).
2. "Bu trade'leri yapmasaydım nasıl olurdu" simülasyonu çalıştırır (tool çağrısı).
3. Davranışsal pattern'ları çıkarır (tool çağrısı).
4. Davranışsal risk hijyeni döner (tool çağrısı, finansal tavsiye DEĞİL).
5. Cevabını **toolTrace** (hangi tool, hangi input, hangi output özeti) ile birlikte verir.

Bonus UI yüzeyi: **What-If butonu** (Coach chat içinde) + **Trading DNA radar** (Insights sayfasında).

---

## 2. Non-negotiable Constraints

| Kural | Sebep |
|---|---|
| Mevcut demo akışı (chat → answer + evidence + keyFindings + subAgentResults + retrievedChunks) **bozulmayacak** | Jüri demosunda bilinen path bu |
| `AiCoachAnswer` shape backward-compatible kalacak — yeni alanlar yalnız `optional` | `app/api/ai-coach/report/route.ts` ve `CoachPdfReportService` zaten bu shape'i kullanıyor |
| RAG citation (evidence + retrievedChunks) UI'da **görünmeye devam edecek** | Bu, "AI nereyi nereye baktı"yı gösteren mevcut güçlü demo özelliği |
| Sub-agent pipeline (`planSubTasks/runSubAgent/composeAnswer`) **silinmeyecek** | Tool path başarısızsa deterministic fallback aynen devam edecek |
| Financial advice yasak: buy/sell/hold/leverage/entry/exit/asset recommendation, hatta "öner" lafı bile | Coach'un mevcut sözleşmesi (`COACH_DISCLAIMER`) |
| Tool sonuçları **sadece** kullanıcının session trade verisinden ve mevcut anonim peer özetlerinden gelir | Veri sınırı garantisi |
| API key, secret, ham Binance key response'a **kesinlikle** konmayacak | Güvenlik modeli |
| Type değişiklikleri **mevcut alanları zorunlu hale getirmez** | Backward-compat |
| Native Gemini function calling **denenir**; başarısız olursa deterministic backend orchestration fallback | Demo deterministik olsun, ama agent gözükmeli |

---

## 3. Architecture

### 3.1 Component map

```
                                        ┌─ Gemini Function Calling ──────────────┐
                                        │  generateWithTools (NEW)               │
                                        │  - Max 4 round                         │
                                        │  - Tool call -> executor -> response   │
                                        └────────────────────────────────────────┘
                                                        ▲
                                                        │ (uses)
app/api/ai-coach/chat/route.ts ──► AICoachService.answerQuestion
                                          │
                                          │  if Gemini configured: try tool path
                                          ├────────────┐
                                          │            ▼
                                          │   CoachToolService (NEW)
                                          │     - get_my_worst_trades
                                          │     - simulate_what_if
                                          │     - detect_behavior_patterns
                                          │     - risk_budget_today
                                          │
                                          │  fallback: existing sub-agent path
                                          ▼
                                  AiCoachAnswer { ..., toolTrace? }


app/api/ai-coach/what-if/route.ts (NEW) ──► CoachToolService.simulate_what_if


app/insights/page.tsx ──► <TraderProfileCard/>
                       │
                       └──► <TradingDnaRadar/> (NEW, uses BehaviorPatternDetector)

lib/analytics/InsightGenerator (UNCHANGED rules)
   └── appends BehaviorPatternDetector top 2-3 patterns (NEW helper)
```

### 3.2 New files

| File | Purpose |
|---|---|
| `lib/ai/CoachToolService.ts` | Tool executor (4 tools). Pure functions over `AnalyticsData` + trades. |
| `lib/analytics/BehaviorPatternDetector.ts` | Pattern detection helper (revenge / overtrading / fomo / averaging-down). Re-used by tool C and InsightGenerator append. |
| `app/api/ai-coach/what-if/route.ts` | POST endpoint for "Skip worst N trades" UI button. |
| `components/insights/TradingDnaRadar.tsx` | Recharts radar with 6 axes. |
| `docs/superpowers/specs/2026-05-19-agent-coach-tools-design.md` | This document. |

### 3.3 Modified files (surgical)

| File | Change |
|---|---|
| `lib/ai/GeminiService.ts` | **Add** `generateWithTools<T>` method. Existing `generateText`/`generateJson` untouched. |
| `lib/rag/AICoachService.ts` | `answerQuestion` first tries tool-using path; on failure or unconfigured Gemini, falls back to existing sub-agent path verbatim. Add `toolTrace` to returned answer. |
| `types/index.ts` | Append optional: `BehaviorPattern`, `CoachToolTrace`, `WhatIfSimulationResult`, `AnalyticsData.behaviorPatterns?`, `AiCoachAnswer.toolTrace?`. Widen `structuredVersion` to `"agentic-v1" \| "agentic-tools-v1"`. |
| `lib/analytics/InsightGenerator.ts` | After existing rules: append top 2-3 behavior pattern insights, **skipping duplicates** (e.g. if "Possible overtrading" already present, do not add overtrading pattern). |
| `lib/analytics/AnalyticsService.ts` | Compute `behaviorPatterns` via `BehaviorPatternDetector` and attach (optional field). |
| `components/ai-coach/CoachChat.tsx` | Add a small "What-if" panel inside chat card. Render `toolTrace` (if present) below `subAgentResults` block in the same visual language. |
| `app/insights/page.tsx` | Mount `<TradingDnaRadar/>` below `<TraderProfileCard/>`. |
| `lib/i18n/dictionaries/en.ts` + `tr.ts` | New keys: `aiCoach.chat.whatIf.*`, `aiCoach.chat.toolTrace`, `insights.dna.*`. |

---

## 4. Tool Schemas

All four tools take session-specific inputs and return JSON. **No external IO** — all data from `AnalyticsData` (already in session). All tool outputs carry `confidence` and **never** include buy/sell recommendations.

### Tool A — `get_my_worst_trades`

```ts
// Input
{ period?: "7d" | "30d" | "all"; limit?: number }

// Output
{
  period: "7d" | "30d" | "all";        // resolved period actually used
  trades: Array<{
    tradeId: string;
    symbol: string;
    timestamp: string;                  // ISO
    pnl: number;                        // negative for losses
    side?: "BUY" | "SELL";
    qty?: number;
    confidence: "low" | "medium" | "high";  // == pnlEstimate.confidence
  }>;
  pnlConfidence: "none" | "low" | "medium" | "high";
}
```

- Data source: `analytics.worstTrades` (already sorted ascending by pnl). Each entry has `{symbol, tradeId, timestamp, side, pnl, quantity}`.
- `limit`: default 5, max 10 (clamped).
- `period`: filter on `timestamp >= now - 7d|30d`. If filtered result is empty AND requested period was `"7d"` or `"30d"`, **gracefully degrade** to `"all"` and return resolved period in output. If still empty, return `trades: []`.
- `confidence` per-trade inherits `analytics.pnlEstimate.confidence`. Per-trade is the same value (we do not have per-trade confidence yet) — this keeps Gemini honest about evidence quality.
- No `price` field (current `EstimatedTradePnl` does not store price). Intentional omission — explicit in spec.

### Tool B — `simulate_what_if`

```ts
// Input
{ skipTradeIds: string[] }

// Output
{
  baselinePnl: number;       // == analytics.pnlEstimate.realized
  simulatedPnl: number;
  delta: number;             // simulatedPnl - baselinePnl
  skippedTrades: Array<{ tradeId; symbol; timestamp; pnl }>;
  ignoredIds: string[];      // input ids that did not match a known trade
  confidence: "none" | "low" | "medium" | "high";  // == baseline confidence
}
```

- Formula: `simulatedPnl = baselinePnl - Σ pnl(skipped)`.
- Resolve `tradeId`s against `analytics.worstTrades` ∪ `analytics.bestTrades`. Unknown ids go to `ignoredIds`.
- This is **subtractive math**, not portfolio simulation — confidence stays equal to baseline confidence.
- If `baselineConfidence === "none"`: still compute, but the **executor** marks output with a warning string in `confidence: "none"` and tool message tells Gemini to caveat the answer.

### Tool C — `detect_behavior_patterns`

```ts
// Input
{ focus?: "revenge_trading" | "overtrading" | "fomo" | "averaging_down" | "all" }

// Output
{
  patterns: Array<{
    id: "revenge_trading" | "overtrading" | "fomo" | "averaging_down";
    label: string;          // human-readable, EN
    score: number;          // 0..1
    confidence: "low" | "medium" | "high";
    severity: "info" | "warning" | "risk";
    evidence: string[];     // 2-4 concrete data points with numbers
  }>;
}
```

Detection rules — implemented in `BehaviorPatternDetector`:

| Pattern | Score formula | Confidence rule |
|---|---|---|
| `revenge_trading` | `0.5 · rapidRatio + 0.5 · postLossEscalationShare`. Where `postLossEscalationShare` = trades whose previous trade had pnl<0 AND occurred within 15-60 min before / total scored sells. Use `worstTrades[]` timestamps as proxy. If no scored PnL, use `rapidRatio` only and cap at 0.5. | `high` if `pnlEstimate.confidence === "high"` AND `worstTrades.length >= 5`; `medium` if confidence `medium`; else `low`. |
| `overtrading` | `clamp(tradesPerActiveDay / 30, 0, 1) · 0.5 + clamp(rapidRatio / 0.5, 0, 1) · 0.5`. | `high` if `activeDays >= 7`; `medium` if `>= 3`; else `low`. |
| `fomo` | Conservative: count consecutive same-symbol BUY trades within 15 min where the second is larger in quoteQuantity. `score = clamp(count / 10, 0, 1)`. **Without price data we never claim FOMO with score > 0.6.** | Always cap at `medium`. If `count == 0`, return `score: 0, confidence: "low"`. |
| `averaging_down` | Same symbol, ≥3 consecutive BUYs within 24h with increasing cumulative quantity AND no SELL between. `score = clamp(longestStreak / 6, 0, 1)`. | `high` if streak ≥ 5; `medium` if ≥ 3; else `low`. |

- `severity`: `risk` if score ≥ 0.7, `warning` if ≥ 0.4, else `info`.
- `focus`: filter output to that single pattern (still returns array).
- `evidence`: hard-coded short factual strings, e.g. `"42 rapid follow-up trades within 30 min of previous"`, `"longest BTC averaging streak: 4 buys in 9h"`.

### Tool D — `risk_budget_today`

```ts
// Input
{}

// Output
{
  riskLevel: "low" | "elevated" | "high";   // BEHAVIORAL risk, not financial
  reasons: string[];                          // 1-3 short data-backed reasons
  guardrails: string[];                       // 1-3 hygiene suggestions (no asset)
  confidence: "low" | "medium" | "high";
}
```

- This is **behavioral hygiene**, not financial advice. Examples allowed:
  - "Bugün rapid follow-up oranı yüksek — kararları 5 dk bekleterek gözden geçirin."
  - "Son 7 günde late-night trade yoğunluğu arttı — 00:00-04:00 saatlerinde işlem yapmayı sınırlayın."
- Examples forbidden: any specific asset, "buy", "sell", "hold", leverage advice, position size in money, stop-loss prices.
- Rule of thumb mapping:
  - `riskLevel = "high"` if (`rapidRatio > 0.3` OR `lateNightRatio > 0.3` OR any pattern with `score > 0.7`).
  - `riskLevel = "elevated"` if any pattern `score > 0.4` OR `rapidRatio > 0.15`.
  - else `"low"`.
- `confidence`: `high` if ≥ 50 trades + scored PnL, `medium` if ≥ 15 trades, else `low`.

---

## 5. Gemini Tool Calling

### 5.1 New method

```ts
// lib/ai/GeminiService.ts
async generateWithTools<TFinal>(opts: {
  systemInstruction: string;
  prompt: string;
  tools: Array<{
    name: string;
    description: string;
    parameters: object;      // JSON Schema
  }>;
  executor: (call: { name: string; args: unknown }) => Promise<unknown>;
  maxRounds?: number;        // default 4
  temperature?: number;
}): Promise<{
  finalText: string;
  trace: Array<{ tool: string; input: unknown; outputSummary: string }>;
}>;
```

- Sends Gemini `tools: [{ functionDeclarations: [...] }]`.
- Loop:
  1. Send conversation.
  2. If response is `functionCall` part → call `executor(call)` → append `functionResponse` → continue.
  3. If response is `text` → done.
  4. After `maxRounds` (default 4) → done with whatever text Gemini last gave.
- `trace` accumulates each tool call with a **summary**, NOT the raw output (raw outputs may contain detail we want to keep server-side only). Summary format: `"get_my_worst_trades(30d, limit=5) → 5 trades, worst pnl: -218.42"`.

### 5.2 Fallback path (Gemini not configured OR throws)

`AICoachService.answerQuestion` will:

```
if (!gemini.isConfigured()) → existing sub-agent path
try {
  toolResult = await this.runWithTools(...)
  if (toolResult.finalText is empty) → existing path
  build answer from toolResult.finalText, attach toolTrace
} catch {
  → existing sub-agent path (no toolTrace)
}
```

If `generateWithTools` is implementable but Gemini returns garbage, we still keep the sub-agent path warm.

### 5.3 System instruction additions

```
You are the Gemini AI Trade Coach for a read-only Binance analytics dashboard.
Use the provided tools BEFORE answering when the user's question involves:
  losses, worst trades, what-if simulations, revenge trading, overtrading,
  FOMO, averaging-down, risk budget, behavioral patterns.
Never recommend buy, sell, hold, leverage, entries, exits, or specific assets.
Tool results are factual session data. Quote concrete numbers from them.
If a tool reports low confidence, say so in the answer.
```

---

## 6. AICoachService Integration

```ts
async answerQuestion(question, analytics, chunks, traderProfile): Promise<AiCoachAnswer> {
  const retrieved = this.vectorStore.retrieve(question, chunks, 8);

  if (analytics.totalTrades === 0 || retrieved.length === 0) {
    /* unchanged early return */
  }

  // Try tool path first
  let toolPath: { finalText: string; trace: CoachToolTrace[] } | null = null;
  if (this.gemini.isConfigured()) {
    try {
      toolPath = await this.runToolUsingPath(question, analytics, retrieved, traderProfile);
    } catch {
      toolPath = null;
    }
  }

  if (toolPath && toolPath.finalText.trim().length > 0) {
    // Still run a lightweight sub-agent compose pass to fill keyFindings,
    // OR derive keyFindings deterministically from toolTrace.
    // (Decision: derive deterministically from toolTrace — keeps fallback identical to today.)
    return {
      answer: toolPath.finalText,
      keyFindings: this.keyFindingsFromTrace(toolPath.trace, analytics),
      evidence: retrieved.slice(0, 5).map(evidenceFromChunk),
      retrievedChunks: retrieved,
      subAgentResults: [],                  // tool path replaces sub-agents
      toolTrace: toolPath.trace,
      traderProfile,
      disclaimer: COACH_DISCLAIMER,
      structuredVersion: "agentic-tools-v1"
    };
  }

  // Fallback — exactly the current code path
  const plan = await this.planSubTasks(...);
  /* ... unchanged ... */
}
```

**Important:** When tool path succeeds, `subAgentResults` is `[]` and `structuredVersion === "agentic-tools-v1"`. The UI must handle both:
- "agentic-v1" → render `subAgentResults` block (existing behaviour).
- "agentic-tools-v1" → render `toolTrace` block instead.

Both versions still render `evidence` and `keyFindings` blocks. Today's UI is already conditional on `message.answer?.subAgentResults.length` (`CoachChat.tsx:480`) — empty array makes the sub-agent panel disappear automatically.

**`keyFindingsFromTrace` derivation rule:**

1. If `toolTrace` contains a `detect_behavior_patterns` call: map up to 3 highest-score patterns to `CoachKeyFinding` (title = pattern label, detail = first 2 evidence strings joined, severity from pattern severity, evidenceRef = pattern id).
2. If `toolTrace` contains `get_my_worst_trades` AND no `detect_behavior_patterns`: produce 1 finding summarizing worst-trade count and worst-symbol concentration.
3. Always append a "PnL confidence" finding when `analytics.pnlEstimate.confidence` is `low` or `none`, so users see the limitation.
4. Cap at 5 findings total. If empty after these rules, fall back to `this.defaultKeyFindings(analytics, traderProfile)` (existing method).

---

## 7. What-If API + UI

### 7.1 API

`POST /api/ai-coach/what-if`

```ts
// Input
{ sessionId: string; skipTradeIds?: string[] }

// Output: same shape as Tool B (simulate_what_if).
// If skipTradeIds is missing or empty → default to analytics.worstTrades.slice(0,5).map(t => t.tradeId).
```

Validation: zod schema mirroring chat route. Session lookup via `resolveSession`.

### 7.2 UI

Inside `components/ai-coach/CoachChat.tsx` chat card, **above** the chat box (alongside the SUGGESTED_COACH_QUESTIONS chips):

- A compact panel: title "What-if simulator" / TR "Ya yapmasaydım?"
- Single button: "Skip worst 5 trades" / TR "En kötü 5 trade'i atla"
- On click → POST → render inline:
  - Baseline PnL
  - Simulated PnL
  - Delta (color: green if positive)
  - List of 5 skipped trades (symbol + timestamp + pnl), compact rows
- No big layout refactor. Reuse existing `tl-panel`, `Badge`, `Button`, MetricChip styling.

---

## 8. Trading DNA Radar

`components/insights/TradingDnaRadar.tsx`

- Library: `recharts` (already a dep) — `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`, `Radar`.
- 6 axes: Revenge, Overtrading, FOMO, Averaging Down, Timing Risk, Fee Drag.
- Score sources:
  - Revenge / Overtrading / FOMO / Averaging Down → from `BehaviorPatternDetector` (the same helper used by tool C).
  - Timing Risk → `analytics.lateNightTradeCount / max(1, analytics.totalTrades)`.
  - Fee Drag → `analytics.quoteFeeEstimate / max(1, analytics.totalVolume)` normalized via `clamp(value / 0.005, 0, 1)` (0.5% = full).
- All scores in `[0, 1]`. Axis labels EN + TR via i18n.
- Empty state: if `totalTrades === 0`, render a small panel with "Not enough data" copy — do NOT crash.
- Mount in `app/insights/page.tsx` directly below `<TraderProfileCard/>`. Reuse existing `<Card>` shell.

---

## 9. InsightGenerator append

After existing `InsightGenerator.generate(...)` produces its rules-based array:

```ts
const dedupeCategories = new Set(insights.map(i => i.category));
const patterns = BehaviorPatternDetector.detect(analytics, trades);
for (const p of patterns.sort((a,b) => b.score - a.score).slice(0, 3)) {
  // Skip if a similar rule already fired
  if (p.id === "overtrading" && insights.some(i => i.title.toLowerCase().includes("overtrading"))) continue;
  if (p.id === "revenge_trading" && insights.some(i => i.title.toLowerCase().includes("revenge"))) continue;
  // averaging_down / fomo are new categories — always allowed
  insights.push(behaviorInsight(p));
}
```

`behaviorInsight(p)` maps to existing `GeneratedInsight` shape with category `"discipline"`.

---

## 10. Types — backward compatible deltas

```ts
// types/index.ts (NEW exports)

export interface BehaviorPattern {
  id: "revenge_trading" | "overtrading" | "fomo" | "averaging_down";
  label: string;
  score: number;            // 0..1
  confidence: "low" | "medium" | "high";
  severity: "info" | "warning" | "risk";
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

// CHANGES (additive only)
export interface AnalyticsData {
  /* ...existing fields unchanged... */
  behaviorPatterns?: BehaviorPattern[];
}

export interface AiCoachAnswer {
  /* ...existing fields unchanged... */
  toolTrace?: CoachToolTrace[];
  structuredVersion: "agentic-v1" | "agentic-tools-v1";  // widened
}
```

`app/api/ai-coach/report/route.ts` `normalizeCoachAnswer` keeps `"agentic-v1"` — falls into widened union, no change needed.

---

## 11. i18n keys

Add to both `en.ts` and `tr.ts` (mirroring existing shape under `aiCoach`):

```ts
aiCoach: {
  // ...existing...
  chat: {
    // ...existing...
    whatIf: {
      title: "What-if simulator" / "Ya yapmasaydım?"
      skipWorst5: "Skip worst 5 trades" / "En kötü 5 trade'i atla"
      baseline: "Current PnL" / "Mevcut PnL"
      simulated: "Without skipped" / "Atlandıktan sonra"
      delta: "Difference" / "Fark"
      empty: "No worst trades available yet." / "Henüz analiz edilecek en kötü trade yok."
    },
    toolTrace: "Tools Coach used" / "Koç'un kullandığı araçlar"
  }
},
insights: {
  // ...existing...
  dna: {
    title: "Trading DNA"
    subtitle: "Six behavioral axes from your own session." / "Senin oturumundan altı davranış ekseni."
    axes: {
      revenge: "Revenge" / "İntikam"
      overtrading: "Overtrading" / "Aşırı işlem"
      fomo: "FOMO" / "FOMO"
      averaging: "Averaging Down" / "Ortalama düşürme"
      timing: "Timing Risk" / "Zamanlama riski"
      feeDrag: "Fee Drag" / "Komisyon yükü"
    },
    empty: "Not enough trade data yet." / "Henüz yeterli işlem verisi yok."
  }
}
```

---

## 12. Success Criteria (Karpathy goal-driven)

| # | Criterion | Verify by |
|---|---|---|
| 1 | `npm run typecheck` passes | Run command, must exit 0 |
| 2 | `npm run build` passes | Run command, must exit 0 |
| 3 | When Gemini key is **not** configured, `/api/ai-coach/chat` still returns the existing sub-agent answer with `structuredVersion === "agentic-v1"` | Manual: temporarily unset `GEMINI_API_KEY`, hit endpoint with demo session |
| 4 | When Gemini key **is** configured AND tool calling succeeds, response has `toolTrace: [...]`, `structuredVersion === "agentic-tools-v1"`, `subAgentResults: []` | Manual: ask "neden zarar ettim?", inspect JSON response |
| 5 | `/api/ai-coach/what-if` with empty body returns simulation against `worstTrades.slice(0,5)` | Manual: curl, inspect baselinePnl/simulatedPnl/delta |
| 6 | Trading DNA radar renders on `/insights` with all 6 axes when `totalTrades > 0`; renders empty state when 0 | Manual: open `/insights` with demo and empty sessions |
| 7 | PDF report (`/api/ai-coach/report`) still works for both `agentic-v1` and `agentic-tools-v1` answers | Manual: generate PDF after chat |
| 8 | Coach **never** outputs buy/sell/hold/leverage/entry/exit/asset recommendation | Manual: ask "should I buy BTC?" — must refuse + behavioral redirect |
| 9 | No raw API keys / secrets / Binance keys anywhere in tool output OR response | Code review of `CoachToolService` — only `analytics` and trader profile in scope |
| 10 | InsightGenerator does NOT add duplicate "overtrading" / "revenge" insights | Manual: inspect `analytics.generatedInsights` |

---

## 13. Risks & open questions

| Risk | Mitigation |
|---|---|
| Gemini function calling API quota / latency in demo | Hard 4-round cap + try/catch → fallback to sub-agent path. Demo always works. |
| Tool trace bloat in PDF | `CoachPdfReportService` not extended in this sprint — PDF stays on existing fields. `toolTrace` is optional so it just goes unused. |
| `worstTrades` may be `<5` for thin demo data | What-if button disables itself if `analytics.worstTrades.length === 0`. API gracefully returns empty `skippedTrades`. |
| FOMO detection without price data is weak | Hard-cap confidence at `medium` and score at 0.6 in the algorithm itself. Documented. |
| Behavior patterns may misfire for very small sessions (<10 trades) | `BehaviorPatternDetector` returns confidence `low` and score gating; radar shows them anyway but UI uses low-confidence styling (slate badge). |

**Open question for reviewer:** Should `toolTrace` be visible in the PDF too, or stay UI-only? Spec defaults to **UI-only** this sprint. Confirm or override.

---

## 14. Out of scope (roadmap, not this sprint)

- Resend / email weekly summary
- Cron jobs / Vercel cron
- Notification push (Telegram bot)
- Multi-modal (chart screenshot) coach
- Editing `CoachPdfReportService` to include `toolTrace`
- Demo onboarding tour
- Test suite (vitest / playwright)
- Per-trade PnL confidence (currently uses session-level confidence)

---

## 15. Implementation priority order

When writing-plans generates tasks, this is the order:

1. `lib/ai/GeminiService.ts` — `generateWithTools` (foundation)
2. `lib/analytics/BehaviorPatternDetector.ts` — pattern logic (reused twice)
3. `lib/ai/CoachToolService.ts` — 4 tool executors
4. `types/index.ts` — additive types + widened union
5. `lib/rag/AICoachService.ts` — wire tool path with fallback
6. `app/api/ai-coach/what-if/route.ts`
7. `components/ai-coach/CoachChat.tsx` — what-if panel + toolTrace render
8. `components/insights/TradingDnaRadar.tsx`
9. `app/insights/page.tsx` — mount radar
10. `lib/analytics/AnalyticsService.ts` + `InsightGenerator.ts` — attach + append
11. `lib/i18n/dictionaries/{en,tr}.ts` — keys
12. `npm run typecheck` then `npm run build`
13. Manual verification per success criteria

Stop here. No Resend, no cron, no PDF tooltrace.
