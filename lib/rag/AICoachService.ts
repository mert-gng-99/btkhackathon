import { COACH_DISCLAIMER } from "@/lib/rag/ragTypes";
import { VectorStoreService } from "@/lib/rag/VectorStoreService";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import { GeminiService } from "@/lib/ai/GeminiService";
import { CoachToolService } from "@/lib/ai/CoachToolService";
import { BehaviorPatternDetector } from "@/lib/analytics/BehaviorPatternDetector";
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

type PlannedSubTask = {
  id: string;
  agent: string;
  objective: string;
};

type CoachPlan = {
  subTasks: PlannedSubTask[];
};

type SubAgentJson = {
  result?: string;
  findings?: string[];
  evidenceRefs?: string[];
  confidence?: "low" | "medium" | "high";
  status?: "completed" | "skipped";
};

type FinalCoachJson = {
  answer?: string;
  keyFindings?: CoachKeyFinding[];
};

const AGENT_NAMES = new Set([
  "rag_researcher",
  "behavior_analyst",
  "profile_analyst",
  "revenge_trading_agent",
  "pnl_quality_agent",
  "symbol_agent"
]);

function evidenceFromChunk(chunk: RagChunk): AiEvidence {
  return {
    title: `${chunk.sourceType.replace("_", " ")}: ${chunk.sourceRef}`,
    detail: chunk.content,
    sourceRef: chunk.sourceRef
  };
}

function clampList(items: unknown, limit: number): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit);
}

function confidence(value: unknown): "low" | "medium" | "high" {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function severity(value: unknown): "info" | "warning" | "risk" {
  return value === "risk" || value === "warning" || value === "info" ? value : "info";
}

export class AICoachService {
  constructor(
    private readonly vectorStore = new VectorStoreService(),
    private readonly gemini = new GeminiService()
  ) {}

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
        // fall through to existing sub-agent path
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
          return toolService.simulateWhatIf({
            skipTradeIds: ((call.args.skipTradeIds as string[]) ?? []).filter((id) => typeof id === "string")
          });
        case "detect_behavior_patterns":
          return toolService.detectBehaviorPatterns(
            call.args as { focus?: "revenge_trading" | "overtrading" | "fomo" | "averaging_down" | "all" }
          );
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

    const patterns: BehaviorPattern[] = BehaviorPatternDetector.detect(analytics, []);
    const sortedPatterns = [...patterns].sort((a, b) => b.score - a.score).slice(0, 3);
    for (const p of sortedPatterns) {
      if (p.score < 0.3) continue;
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
        detail: `pnl ${formatNumber(worst.pnl)} at ${worst.timestamp}`,
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

  private async planSubTasks(
    question: string,
    analytics: AnalyticsData,
    retrieved: RagChunk[],
    traderProfile?: TraderProfile
  ): Promise<CoachPlan> {
    const fallback = this.fallbackPlan(question, traderProfile);

    if (!this.gemini.isConfigured()) {
      return fallback;
    }

    try {
      const plan = await this.gemini.generateJson<CoachPlan>({
        systemInstruction: [
          "You are the Gemini orchestrator for a read-only trade analytics coach.",
          "Create a small sub-agent plan for answering the user's question.",
          "Return JSON only.",
          "Use only these agents: rag_researcher, behavior_analyst, profile_analyst, revenge_trading_agent, pnl_quality_agent, symbol_agent.",
          "Use at most 4 subTasks.",
          "Do not include financial advice tasks."
        ].join("\n"),
        prompt: JSON.stringify(
          {
            question,
            availableAgents: {
              rag_researcher: "Retrieves and summarizes user-specific RAG evidence chunks.",
              behavior_analyst: "Reviews aggregate metrics such as timing, fees, frequency, symbols, and realized PnL samples.",
              profile_analyst: "Uses the cached Gemini trader profile from Insights.",
              revenge_trading_agent: "Checks rapid follow-up trades, size pressure, and post-loss escalation clues without overclaiming.",
              pnl_quality_agent: "Assesses whether PnL evidence is reliable enough to support performance claims.",
              symbol_agent: "Reviews symbol concentration, excessive switching, and dominant traded assets."
            },
            cachedTraderProfileAvailable: Boolean(traderProfile),
            metricsPreview: this.analyticsSnapshot(analytics),
            retrievedRefs: retrieved.map((chunk) => chunk.sourceRef),
            outputShape: {
              subTasks: [
                {
                  id: "short_snake_case",
                  agent: "rag_researcher | behavior_analyst | profile_analyst | revenge_trading_agent | pnl_quality_agent | symbol_agent",
                  objective: "one concrete evidence-gathering objective"
                }
              ]
            }
          },
          null,
          2
        ),
        temperature: 0.05
      });

      return this.normalizePlan(plan, fallback, Boolean(traderProfile));
    } catch {
      return fallback;
    }
  }

  private normalizePlan(plan: CoachPlan | null | undefined, fallback: CoachPlan, hasTraderProfile: boolean): CoachPlan {
    const tasks = Array.isArray(plan?.subTasks) ? plan.subTasks : [];
    const normalized = tasks
      .filter(
        (task) =>
          task &&
          AGENT_NAMES.has(task.agent) &&
          typeof task.objective === "string" &&
          (task.agent !== "profile_analyst" || hasTraderProfile)
      )
      .map((task, index) => ({
        id: task.id?.replace(/[^a-z0-9_]/gi, "_").toLowerCase() || `${task.agent}_${index + 1}`,
        agent: task.agent,
        objective: task.objective.trim()
      }))
      .slice(0, 4);

    return normalized.length > 0 ? { subTasks: normalized } : fallback;
  }

  private fallbackPlan(question: string, traderProfile?: TraderProfile): CoachPlan {
    const lower = question.toLowerCase();
    const subTasks: PlannedSubTask[] = [
      {
        id: "rag_evidence",
        agent: "rag_researcher",
        objective: "Retrieve the most relevant session chunks and identify the strongest evidence for the answer."
      },
      {
        id: "behavior_metrics",
        agent: "behavior_analyst",
        objective: "Check trade frequency, fees, timing, symbols, and realized-PnL samples against the user's question."
      }
    ];

    if (
      lower.includes("revenge") ||
      lower.includes("emotion") ||
      lower.includes("control") ||
      lower.includes("mistake") ||
      lower.includes("overtrade") ||
      lower.includes("loss")
    ) {
      subTasks.push({
        id: "revenge_trading_scan",
        agent: "revenge_trading_agent",
        objective: "Check whether rapid follow-ups and available loss/PnL signals suggest possible revenge trading."
      });
    }

    if (
      lower.includes("pnl") ||
      lower.includes("profit") ||
      lower.includes("loss") ||
      lower.includes("success") ||
      lower.includes("performance") ||
      lower.includes("başarı")
    ) {
      subTasks.push({
        id: "pnl_quality_scan",
        agent: "pnl_quality_agent",
        objective: "Assess the reliability of available PnL and success-rate evidence before drawing conclusions."
      });
    }

    if (
      lower.includes("coin") ||
      lower.includes("symbol") ||
      lower.includes("asset") ||
      lower.includes("market") ||
      lower.includes("concentration")
    ) {
      subTasks.push({
        id: "symbol_concentration_scan",
        agent: "symbol_agent",
        objective: "Review symbol concentration, switching behavior, and dominant assets."
      });
    }

    if (
      traderProfile &&
      (lower.includes("trader") ||
        lower.includes("type") ||
        lower.includes("mistake") ||
        lower.includes("pattern") ||
        lower.includes("emotion") ||
        lower.includes("profile"))
    ) {
      subTasks.push({
        id: "profile_context",
        agent: "profile_analyst",
        objective: "Use the cached trader profile to connect the answer to the user's classified behavior pattern."
      });
    }

    return { subTasks: subTasks.slice(0, 4) };
  }

  private async runSubAgent(
    task: PlannedSubTask,
    question: string,
    analytics: AnalyticsData,
    retrieved: RagChunk[],
    traderProfile?: TraderProfile
  ): Promise<CoachSubAgentResult> {
    const deterministic = this.deterministicSubAgent(task, analytics, retrieved, traderProfile);

    if (!this.gemini.isConfigured()) {
      return deterministic;
    }

    try {
      const output = await this.gemini.generateJson<SubAgentJson>({
        systemInstruction: [
          `You are Gemini sub-agent: ${task.agent}.`,
          "Answer only your assigned objective.",
          "Use only the supplied user-specific context.",
          "Return JSON only.",
          "Do not give financial advice.",
          "Never recommend buy, sell, hold, leverage, entries, exits, or assets.",
          "If evidence is insufficient, say so and set confidence to low."
        ].join("\n"),
        prompt: JSON.stringify(
          {
            question,
            objective: task.objective,
            taskAgent: task.agent,
            analytics: this.analyticsSnapshot(analytics),
            cachedTraderProfile: traderProfile ?? null,
            retrievedContext: retrieved.map((chunk) => ({
              sourceType: chunk.sourceType,
              sourceRef: chunk.sourceRef,
              content: chunk.content
            })),
            outputShape: {
              status: "completed | skipped",
              result: "short paragraph grounded in the context",
              findings: ["specific finding with metric or evidence"],
              evidenceRefs: ["sourceRef values used"],
              confidence: "low | medium | high"
            }
          },
          null,
          2
        ),
        temperature: 0.1
      });

      return {
        id: task.id,
        agent: task.agent,
        objective: task.objective,
        status: output.status === "skipped" ? "skipped" : "completed",
        result: typeof output.result === "string" && output.result.trim() ? output.result.trim() : deterministic.result,
        findings: clampList(output.findings, 5),
        evidenceRefs: clampList(output.evidenceRefs, 6),
        confidence: confidence(output.confidence)
      };
    } catch {
      return deterministic;
    }
  }

  private deterministicSubAgent(
    task: PlannedSubTask,
    analytics: AnalyticsData,
    retrieved: RagChunk[],
    traderProfile?: TraderProfile
  ): CoachSubAgentResult {
    if (task.agent === "rag_researcher") {
      return {
        id: task.id,
        agent: task.agent,
        objective: task.objective,
        status: "completed",
        result: `Retrieved ${retrieved.length} session-specific chunks. The strongest evidence includes ${retrieved
          .slice(0, 3)
          .map((chunk) => chunk.sourceRef)
          .join(", ")}.`,
        findings: retrieved.slice(0, 4).map((chunk) => chunk.content),
        evidenceRefs: retrieved.slice(0, 6).map((chunk) => chunk.sourceRef),
        confidence: retrieved.length >= 4 ? "high" : "medium"
      };
    }

    if (task.agent === "profile_analyst" && traderProfile) {
      return {
        id: task.id,
        agent: task.agent,
        objective: task.objective,
        status: "completed",
        result: `Cached Insights profile classifies this user as ${traderProfile.traderType} with ${traderProfile.confidence} confidence.`,
        findings: [traderProfile.summary, ...traderProfile.risks.slice(0, 3)],
        evidenceRefs: traderProfile.evidence.slice(0, 5),
        confidence: traderProfile.confidence
      };
    }

    if (task.agent === "revenge_trading_agent") {
      const rapidRatio = analytics.totalTrades > 0 ? analytics.rapidTradeCount / analytics.totalTrades : 0;
      const worst = analytics.worstTrades.slice(0, 2);
      const samples = analytics.pnlEstimate.matchedSellTrades;
      const result =
        samples > 0
          ? `Possible revenge-trading review: ${analytics.rapidTradeCount} rapid follow-up trades (${formatPercent(
              rapidRatio
            )}) and ${samples} matched PnL samples are available. This can support a cautious behavioral check, but it is not proof of emotional trading.`
          : `Possible revenge-trading review: ${analytics.rapidTradeCount} rapid follow-up trades (${formatPercent(
              rapidRatio
            )}) were detected, but PnL samples are insufficient to prove post-loss escalation.`;

      return {
        id: task.id,
        agent: task.agent,
        objective: task.objective,
        status: "completed",
        result,
        findings: [
          `${analytics.rapidTradeCount} rapid follow-up trades out of ${analytics.totalTrades} total trades.`,
          `${analytics.pnlEstimate.matchedSellTrades} matched PnL samples with ${analytics.pnlEstimate.confidence} confidence.`,
          ...worst.map((trade) => `${trade.symbol} had an estimated/scored PnL of ${formatNumber(trade.pnl)} at ${trade.timestamp}.`)
        ],
        evidenceRefs: ["trade_cluster:timing", "trade_cluster:rapid-examples", "pnl-estimate"],
        confidence: analytics.pnlEstimate.confidence === "high" && rapidRatio > 0.15 ? "medium" : "low"
      };
    }

    if (task.agent === "pnl_quality_agent") {
      const scoredHours = analytics.hourlyBehavior.filter((hour) => hour.pnlSamples > 0);
      const totalSamples = scoredHours.reduce((sum, hour) => sum + hour.pnlSamples, 0);
      const winningSamples = scoredHours.reduce((sum, hour) => sum + hour.winningTrades, 0);
      const successRate = totalSamples > 0 ? winningSamples / totalSamples : null;

      return {
        id: task.id,
        agent: task.agent,
        objective: task.objective,
        status: "completed",
        result:
          successRate === null
            ? `PnL quality is ${analytics.pnlEstimate.confidence}. There are no scored hourly success samples, so performance conclusions should stay limited.`
            : `PnL quality is ${analytics.pnlEstimate.confidence}. Scored trades show a ${formatPercent(
                successRate
              )} success rate across ${totalSamples} PnL samples, so conclusions should reference this sample size.`,
        findings: [
          `PnL confidence: ${analytics.pnlEstimate.confidence}.`,
          `Matched sell trades: ${analytics.pnlEstimate.matchedSellTrades}.`,
          `Scored hourly PnL samples: ${totalSamples}.`,
          `Estimated realized PnL: ${formatNumber(analytics.pnlEstimate.realized)}.`
        ],
        evidenceRefs: ["pnl-estimate", ...analytics.bestTrades.slice(0, 2).map((trade) => trade.tradeId)],
        confidence: analytics.pnlEstimate.confidence === "none" ? "low" : analytics.pnlEstimate.confidence
      };
    }

    if (task.agent === "symbol_agent") {
      const top = analytics.symbolSummaries.slice(0, 5);
      const topVolume = top[0]?.volume ?? 0;
      const topShare = analytics.totalVolume > 0 ? topVolume / analytics.totalVolume : 0;

      return {
        id: task.id,
        agent: task.agent,
        objective: task.objective,
        status: "completed",
        result: `Symbol review: ${analytics.symbolSummaries.length} symbols were traded. The largest symbol share is ${formatPercent(
          topShare
        )}, led by ${top[0]?.symbol ?? "no symbol"}, which is useful for concentration and switching analysis.`,
        findings: top.map((symbol) => `${symbol.symbol}: ${symbol.trades} trades, ${formatNumber(symbol.volume)} volume.`),
        evidenceRefs: top.map((symbol) => symbol.symbol),
        confidence: top.length >= 3 ? "high" : "medium"
      };
    }

    return {
      id: task.id,
      agent: task.agent,
      objective: task.objective,
      status: "completed",
      result: [
        this.describeOvertrading(analytics),
        this.describeFees(analytics),
        this.describeTiming(analytics),
        this.describeSymbols(analytics)
      ].join(" "),
      findings: [
        `${analytics.totalTrades} trades across ${analytics.activeDays} active days.`,
        `${analytics.rapidTradeCount} rapid trades within 30 minutes of the previous trade.`,
        `${formatNumber(analytics.quoteFeeEstimate)} estimated quote-asset fees.`,
        `${analytics.lateNightTradeCount} late-night trades between 00:00 and 04:00 UTC.`
      ],
      evidenceRefs: analytics.generatedInsights.slice(0, 4).map((insight) => insight.id),
      confidence: analytics.pnlEstimate.confidence === "high" ? "high" : "medium"
    };
  }

  private async composeAnswer(
    question: string,
    analytics: AnalyticsData,
    retrieved: RagChunk[],
    subAgentResults: CoachSubAgentResult[],
    traderProfile?: TraderProfile
  ): Promise<{ answer: string; keyFindings: CoachKeyFinding[] }> {
    const deterministic = this.composeDeterministicAnswer(question, analytics, retrieved, subAgentResults, traderProfile);

    if (!this.gemini.isConfigured()) {
      return deterministic;
    }

    try {
      const final = await this.gemini.generateJson<FinalCoachJson>({
        systemInstruction: [
          "You are the Gemini main orchestrator for an AI Trade Coach.",
          "Use the sub-agent results to answer the user.",
          "Return JSON only.",
          "Do not give financial advice.",
          "Never recommend buy, sell, hold, leverage, entries, exits, or specific assets.",
          "Every claim must be grounded in provided evidence.",
          "If evidence is weak, state the limitation clearly."
        ].join("\n"),
        prompt: JSON.stringify(
          {
            question,
            cachedTraderProfile: traderProfile ?? null,
            analytics: this.analyticsSnapshot(analytics),
            subAgentResults,
            retrievedContext: retrieved.map((chunk) => ({
              sourceRef: chunk.sourceRef,
              content: chunk.content
            })),
            outputShape: {
              answer: "human-readable answer with concrete metrics and no financial advice",
              keyFindings: [
                {
                  title: "short label",
                  detail: "specific evidence-backed finding",
                  severity: "info | warning | risk",
                  evidenceRef: "optional sourceRef"
                }
              ]
            }
          },
          null,
          2
        ),
        temperature: 0.15
      });

      const answer = typeof final.answer === "string" && final.answer.trim() ? final.answer.trim() : deterministic.answer;
      const keyFindings = Array.isArray(final.keyFindings)
        ? final.keyFindings
            .filter((finding) => finding && typeof finding.title === "string" && typeof finding.detail === "string")
            .map((finding) => ({
              title: finding.title.trim(),
              detail: finding.detail.trim(),
              severity: severity(finding.severity),
              evidenceRef: typeof finding.evidenceRef === "string" ? finding.evidenceRef : undefined
            }))
            .slice(0, 5)
        : deterministic.keyFindings;

      return {
        answer,
        keyFindings: keyFindings.length > 0 ? keyFindings : deterministic.keyFindings
      };
    } catch {
      return deterministic;
    }
  }

  private composeDeterministicAnswer(
    question: string,
    analytics: AnalyticsData,
    retrieved: RagChunk[],
    subAgentResults: CoachSubAgentResult[],
    traderProfile?: TraderProfile
  ): { answer: string; keyFindings: CoachKeyFinding[] } {
    const lower = question.toLowerCase();
    const sections: string[] = [];

    if (traderProfile) {
      sections.push(
        `Your cached Insights profile labels you as "${traderProfile.traderType}" with ${traderProfile.confidence} confidence. ${traderProfile.summary}`
      );
    }

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
      sections.push(this.describeMistakes(analytics), this.describeSymbols(analytics), this.describeFees(analytics), this.describeTiming(analytics));
    }

    const answer = [
      "Based on your analyzed Binance history, here is the grounded read:",
      "",
      ...sections.filter(Boolean),
      "",
      "Agent work:",
      ...subAgentResults.map((result) => `- ${result.agent}: ${result.result}`),
      "",
      "Evidence used:",
      ...retrieved.slice(0, 4).map((chunk, index) => `${index + 1}. ${chunk.content}`)
    ].join("\n");

    return {
      answer,
      keyFindings: this.defaultKeyFindings(analytics, traderProfile)
    };
  }

  private analyticsSnapshot(analytics: AnalyticsData) {
    const scoredHours = analytics.hourlyBehavior.filter((hour) => hour.successRate !== null && hour.pnlSamples > 0);
    const busiestHour = [...analytics.hourlyBehavior].sort((a, b) => b.trades - a.trades)[0];
    const bestHour = [...scoredHours].sort((a, b) => (b.successRate ?? 0) - (a.successRate ?? 0) || b.realizedPnl - a.realizedPnl)[0];
    const weakestHour = [...scoredHours].sort((a, b) => (a.successRate ?? 0) - (b.successRate ?? 0) || a.realizedPnl - b.realizedPnl)[0];

    return {
      totalTrades: analytics.totalTrades,
      totalVolume: analytics.totalVolume,
      averageTradeSize: analytics.averageTradeSize,
      activeDays: analytics.activeDays,
      buySell: analytics.buySell,
      quoteFeeEstimate: analytics.quoteFeeEstimate,
      feesByAsset: analytics.feesByAsset.slice(0, 6),
      rapidTradeCount: analytics.rapidTradeCount,
      lateNightTradeCount: analytics.lateNightTradeCount,
      pnlEstimate: analytics.pnlEstimate,
      marketBreakdown: analytics.marketBreakdown,
      topSymbols: analytics.symbolSummaries.slice(0, 8),
      generatedInsights: analytics.generatedInsights.slice(0, 6),
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
        : null
    };
  }

  private defaultKeyFindings(analytics: AnalyticsData, traderProfile?: TraderProfile): CoachKeyFinding[] {
    const findings: CoachKeyFinding[] = analytics.generatedInsights.slice(0, 3).map((insight) => ({
      title: insight.title,
      detail: insight.message,
      severity: insight.severity,
      evidenceRef: insight.evidence[0]
    }));

    if (traderProfile) {
      findings.unshift({
        title: traderProfile.traderType,
        detail: traderProfile.summary,
        severity: traderProfile.risks.length > 0 ? "warning" : "info",
        evidenceRef: traderProfile.evidence[0]
      });
    }

    return findings.slice(0, 5);
  }

  private describeMistakes(analytics: AnalyticsData): string {
    const topInsights = analytics.generatedInsights.slice(0, 3);
    if (topInsights.length === 0) {
      return "I do not see strong rule-based mistakes in the current data, but this depends on the limited fields available from the exchange history.";
    }

    return topInsights.map((item, index) => `${index + 1}. ${item.title}: ${item.message}`).join("\n\n");
  }

  private describeOvertrading(analytics: AnalyticsData): string {
    const tradesPerDay = analytics.activeDays > 0 ? analytics.totalTrades / analytics.activeDays : analytics.totalTrades;
    const rapidRatio = analytics.totalTrades > 0 ? analytics.rapidTradeCount / analytics.totalTrades : 0;

    return `Overtrading check: you made ${analytics.totalTrades} trades across ${analytics.activeDays} active days, averaging ${formatNumber(
      tradesPerDay
    )} trades per active day. ${analytics.rapidTradeCount} trades happened within 30 minutes of the previous trade (${formatPercent(rapidRatio)}).`;
  }

  private describeFees(analytics: AnalyticsData): string {
    const feeRatio = analytics.totalVolume > 0 ? analytics.quoteFeeEstimate / analytics.totalVolume : 0;
    const feeBreakdown = analytics.feesByAsset.map((fee) => `${formatNumber(fee.amount)} ${fee.asset}`).join(", ");

    return `Fee impact: estimated quote-asset fees were ${formatNumber(analytics.quoteFeeEstimate)} against ${formatNumber(
      analytics.totalVolume
    )} analyzed volume (${formatPercent(feeRatio)}). Fee assets observed: ${feeBreakdown || "none"}.`;
  }

  private describeTiming(analytics: AnalyticsData): string {
    const lateNightRatio = analytics.totalTrades > 0 ? analytics.lateNightTradeCount / analytics.totalTrades : 0;
    const busiestHour = [...analytics.activityByHour].sort((a, b) => b.trades - a.trades)[0];

    return `Timing pattern: ${analytics.lateNightTradeCount} trades happened between 00:00 and 04:00 UTC (${formatPercent(
      lateNightRatio
    )}). Your busiest hour bucket was ${busiestHour?.label ?? "not available"} with ${busiestHour?.trades ?? 0} trades.`;
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
