"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n";
import { SUGGESTED_COACH_QUESTIONS } from "@/lib/rag/ragTypes";
import type { AiCoachAnswer, AnalyticsData, TraderProfile, WhatIfSimulationResult } from "@/types";
import { PdfReportProgress } from "./PdfReportProgress";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  answer?: AiCoachAnswer;
}

interface CoachChatProps {
  sessionId: string;
  analytics: AnalyticsData;
}

type AgentId =
  | "orchestrator"
  | "rag_researcher"
  | "behavior_analyst"
  | "profile_analyst"
  | "revenge_trading_agent"
  | "pnl_quality_agent"
  | "symbol_agent";

function agentFromBackendName(agent: string): AgentId | null {
  if (
    agent === "rag_researcher" ||
    agent === "behavior_analyst" ||
    agent === "profile_analyst" ||
    agent === "revenge_trading_agent" ||
    agent === "pnl_quality_agent" ||
    agent === "symbol_agent"
  ) {
    return agent;
  }
  return null;
}

function predictedAgentsForQuestion(question: string): AgentId[] {
  const lower = question.toLowerCase();
  const has = (keywords: string[]) => keywords.some((k) => lower.includes(k));
  const agents = new Set<AgentId>(["rag_researcher", "behavior_analyst"]);
  if (has(["revenge", "emotion", "control", "mistake", "loss", "intikam", "duygu", "hata", "zarar", "kayıp", "batım", "battım"])) {
    agents.add("revenge_trading_agent");
  }
  if (has(["pnl", "profit", "loss", "success", "performance", "başarı", "performans", "kar", "kâr", "karlı", "kârlı", "kazanç"])) {
    agents.add("pnl_quality_agent");
  }
  if (has(["coin", "symbol", "asset", "concentration", "sembol", "varlık", "piyasa", "yoğunluk", "btc", "eth"])) {
    agents.add("symbol_agent");
  }
  if (has(["trader", "type", "profile", "pattern", "tip", "tür", "alışkanlık", "davranış", "gelişim", "gelişmek", "daha iyi", "iyileştir"])) {
    agents.add("profile_analyst");
  }
  return [...agents].slice(0, 4);
}

export function CoachChat({ sessionId, analytics }: CoachChatProps) {
  const t = useT();
  const REPORT_STEPS = t.aiCoach.chat.reportSteps;
  const [question, setQuestion] = useState("");
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeAgents, setActiveAgents] = useState<AgentId[]>([]);
  const [completedAgents, setCompletedAgents] = useState<AgentId[]>([]);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: t.aiCoach.chat.welcome }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStep, setReportStep] = useState(0);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfSimulationResult | null>(null);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);
  const storageKey = `trader-profile:${sessionId}`;

  // Refresh welcome message when locale changes
  useEffect(() => {
    setMessages((current) => {
      if (current.length > 0 && current[0].role === "assistant" && !current[0].answer) {
        const [, ...rest] = current;
        return [{ role: "assistant", content: t.aiCoach.chat.welcome }, ...rest];
      }
      return current;
    });
  }, [t.aiCoach.chat.welcome]);

  useEffect(() => {
    let cancelled = false;
    const cachedProfile = sessionStorage.getItem(storageKey);
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile) as { profile?: TraderProfile };
        if (parsed.profile) {
          setProfile(parsed.profile);
          setProfileLoading(false);
          return;
        }
      } catch {
        sessionStorage.removeItem(storageKey);
      }
    }

    async function loadProfile() {
      setProfileLoading(true);
      try {
        const response = await fetch(`/api/insights/trader-profile?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? t.errors.profileRequestFailed);
        if (!cancelled) {
          setProfile(payload.profile);
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              configured: Boolean(payload.configured),
              cached: true,
              generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : null,
              profile: payload.profile
            })
          );
        }
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!reportLoading) return;
    const interval = window.setInterval(() => {
      setReportStep((current) => Math.min(current + 1, REPORT_STEPS.length - 1));
    }, 2200);
    return () => window.clearInterval(interval);
  }, [reportLoading, REPORT_STEPS.length]);

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

  async function ask(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;

    setQuestion("");
    setLoading(true);
    setError(null);
    setReportMessage(null);
    setReportError(null);
    setCompletedAgents([]);
    setActiveAgents(["orchestrator", ...predictedAgentsForQuestion(trimmed)]);
    setAgentStatus(t.aiCoach.sidebar.planning);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    try {
      const response = await fetch("/api/ai-coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question: trimmed })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t.errors.coachRequestFailed);

      if (payload.answer?.traderProfile) {
        setProfile(payload.answer.traderProfile);
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            configured: true,
            cached: true,
            generatedAt: new Date().toISOString(),
            profile: payload.answer.traderProfile
          })
        );
      }

      const completed = (payload.answer?.subAgentResults ?? [])
        .map((result: { agent: string }) => agentFromBackendName(result.agent))
        .filter((agent: AgentId | null): agent is AgentId => Boolean(agent));
      const uniqueCompleted = [...new Set<AgentId>(["orchestrator", ...completed])];
      setCompletedAgents(uniqueCompleted);
      setActiveAgents([]);
      setAgentStatus(t.aiCoach.sidebar.completed(completed.length));
      setMessages((current) => [...current, { role: "assistant", content: payload.answer.answer, answer: payload.answer }]);
    } catch (chatError: unknown) {
      setError(chatError instanceof Error ? chatError.message : t.errors.coachRequestFailed);
      setActiveAgents([]);
      setAgentStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function generatePdfReport() {
    const answers = messages
      .map((message) => message.answer)
      .filter((answer): answer is AiCoachAnswer => Boolean(answer))
      .map((answer) => ({
        answer: answer.answer,
        keyFindings: answer.keyFindings,
        evidence: answer.evidence,
        subAgentResults: answer.subAgentResults,
        traderProfile: answer.traderProfile,
        disclaimer: answer.disclaimer,
        structuredVersion: answer.structuredVersion
      }));

    if (answers.length === 0 || reportLoading) return;

    setReportLoading(true);
    setReportStep(0);
    setReportMessage(null);
    setReportError(null);

    try {
      const response = await fetch("/api/ai-coach/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? t.errors.pdfGenerationFailed);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ai-trade-coach-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setReportStep(REPORT_STEPS.length - 1);
      setReportMessage(t.aiCoach.chat.pdfDone);
    } catch (reportGenerationError: unknown) {
      setReportError(reportGenerationError instanceof Error ? reportGenerationError.message : t.errors.pdfGenerationFailed);
    } finally {
      setReportLoading(false);
    }
  }

  const answerCount = messages.filter((message) => message.answer).length;
  const steps = t.aiCoach.sidebar.pipelineSteps;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
      <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card tone="cyan">
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ padding: 8, borderRadius: 10, border: "1px solid var(--tl-line-strong)", background: "var(--tl-cyan-soft)", color: "var(--tl-cyan)" }}>
                <UserRoundCog className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="tl-card-title">{t.aiCoach.sidebar.traderModel}</h2>
                <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.aiCoach.sidebar.traderModelSub}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {profileLoading ? (
                <div className="tl-notice tl-notice-cyan">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{t.aiCoach.sidebar.loadingProfile}</span>
                </div>
              ) : null}
              {profile ? (
                <>
                  <div className="tl-panel">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <Badge tone="cyan">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        {profile.traderType}
                      </Badge>
                      <Badge tone={profile.confidence === "high" ? "emerald" : profile.confidence === "medium" ? "amber" : "slate"}>
                        {t.insights.profile.confidence[profile.confidence]}
                      </Badge>
                    </div>
                    <p style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.6, color: "var(--tl-ink-2)" }}>{profile.summary}</p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {profile.behavioralTags.slice(0, 8).map((tag) => (
                      <Badge key={tag} tone="slate">{tag}</Badge>
                    ))}
                  </div>
                </>
              ) : !profileLoading ? (
                <p className="tl-panel" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--tl-ink-3)" }}>{t.aiCoach.sidebar.noProfile}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="tl-card-title">{t.aiCoach.sidebar.pipeline}</h2>
          </CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {agentStatus ? <div className="tl-notice tl-notice-green" style={{ fontSize: 12.5 }}>{agentStatus}</div> : null}
              <PipelineStep
                active={activeAgents.includes("orchestrator")}
                completed={completedAgents.includes("orchestrator")}
                icon={<Bot className="h-4 w-4" aria-hidden="true" />}
                title={steps.orchestrator.title}
                detail={steps.orchestrator.detail}
                usedLabel={t.aiCoach.sidebar.pipelineUsedBadge}
              />
              <PipelineStep
                active={activeAgents.includes("rag_researcher")}
                completed={completedAgents.includes("rag_researcher")}
                icon={<DatabaseZap className="h-4 w-4" aria-hidden="true" />}
                title={steps.rag.title}
                detail={steps.rag.detail}
                usedLabel={t.aiCoach.sidebar.pipelineUsedBadge}
              />
              <PipelineStep
                active={activeAgents.includes("behavior_analyst")}
                completed={completedAgents.includes("behavior_analyst")}
                icon={<BrainCircuit className="h-4 w-4" aria-hidden="true" />}
                title={steps.behavior.title}
                detail={steps.behavior.detail}
                usedLabel={t.aiCoach.sidebar.pipelineUsedBadge}
              />
              <PipelineStep
                active={activeAgents.includes("profile_analyst")}
                completed={completedAgents.includes("profile_analyst")}
                icon={<UserRoundCog className="h-4 w-4" aria-hidden="true" />}
                title={steps.profile.title}
                detail={steps.profile.detail}
                usedLabel={t.aiCoach.sidebar.pipelineUsedBadge}
              />
              <PipelineStep
                active={activeAgents.includes("revenge_trading_agent")}
                completed={completedAgents.includes("revenge_trading_agent")}
                icon={<Flame className="h-4 w-4" aria-hidden="true" />}
                title={steps.revenge.title}
                detail={steps.revenge.detail}
                usedLabel={t.aiCoach.sidebar.pipelineUsedBadge}
              />
              <PipelineStep
                active={activeAgents.includes("pnl_quality_agent")}
                completed={completedAgents.includes("pnl_quality_agent")}
                icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
                title={steps.pnl.title}
                detail={steps.pnl.detail}
                usedLabel={t.aiCoach.sidebar.pipelineUsedBadge}
              />
              <PipelineStep
                active={activeAgents.includes("symbol_agent")}
                completed={completedAgents.includes("symbol_agent")}
                icon={<Layers3 className="h-4 w-4" aria-hidden="true" />}
                title={steps.symbol.title}
                detail={steps.symbol.detail}
                usedLabel={t.aiCoach.sidebar.pipelineUsedBadge}
              />
            </div>
          </CardContent>
        </Card>

        <RiskRadar analytics={analytics} />

        <div className="tl-notice tl-notice-amber">
          <ShieldAlert className="h-5 w-5" style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>{t.aiCoach.sidebar.safety}</span>
        </div>
      </aside>

      <Card>
        <CardHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="lg:flex-row lg:items-center lg:justify-between">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ padding: 8, borderRadius: 10, border: "1px solid var(--tl-line-strong)", background: "var(--tl-cyan-soft)", color: "var(--tl-cyan)" }}>
                <BrainCircuit className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="tl-card-title">{t.aiCoach.chat.title}</h2>
                <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.aiCoach.chat.sub}</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="lg:items-end">
              <div className="grid grid-cols-3 gap-2">
                <MetricChip label={t.aiCoach.chat.stats.trades} value={analytics.totalTrades.toLocaleString()} />
                <MetricChip label={t.aiCoach.chat.stats.activeDays} value={analytics.activeDays.toLocaleString()} />
                <MetricChip label={t.aiCoach.chat.stats.pnlConf} value={analytics.pnlEstimate.confidence} />
              </div>
              <Button variant="secondary" onClick={generatePdfReport} disabled={reportLoading || answerCount === 0}>
                {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
                {reportLoading ? t.aiCoach.chat.pdfMaking : t.aiCoach.chat.pdf}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUGGESTED_COACH_QUESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => ask(item)}
                className="tl-chip"
                style={{ cursor: "pointer", padding: "8px 12px", fontSize: 12, fontFamily: "inherit" }}
              >
                {item}
              </button>
            ))}
          </div>

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
                {analytics.worstTrades.length === 0 ? (
                  <p style={{ marginTop: 2, fontSize: 11.5, color: "var(--tl-ink-3)" }}>{t.aiCoach.chat.whatIf.empty}</p>
                ) : null}
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
                {whatIfResult.skippedTrades.map((trade) => (
                  <div
                    key={trade.tradeId}
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
                    <span>{trade.symbol}</span>
                    <span style={{ color: trade.pnl < 0 ? "var(--tl-red)" : "var(--tl-green)" }}>{trade.pnl.toFixed(2)}</span>
                    <span style={{ color: "var(--tl-ink-3)", fontSize: 11 }}>{trade.timestamp.slice(0, 16).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {whatIfError ? <div className="tl-notice tl-notice-red">{whatIfError}</div> : null}
          </div>

          <div
            className="mt-4 sm:mt-5"
            style={{
              minHeight: "min(60vh, 540px)",
              maxHeight: "min(72vh, 820px)",
              height: "clamp(420px, 60vh, 820px)",
              overflowY: "auto",
              padding: 16,
              borderRadius: 14,
              border: "1px solid var(--tl-line)",
              background: "color-mix(in srgb, var(--tl-bg-0) 55%, transparent)",
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: message.role === "user" ? "min(92%, 560px)" : "100%",
                  width: message.role === "user" ? "auto" : "100%"
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    background: message.role === "user" ? "var(--tl-amber)" : "rgba(255, 255, 255, 0.04)",
                    color: message.role === "user" ? "#1a1106" : "var(--tl-ink)",
                    border: message.role === "user" ? "1px solid var(--tl-amber)" : "1px solid var(--tl-line)"
                  }}
                >
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{message.content}</pre>
                </div>

                {message.answer?.keyFindings.length ? (
                  <div className="grid gap-2 md:grid-cols-2" style={{ marginTop: 10 }}>
                    {message.answer.keyFindings.slice(0, 4).map((finding) => (
                      <div key={`${finding.title}-${finding.evidenceRef ?? ""}`} className="tl-panel">
                        <Badge tone={finding.severity === "risk" ? "rose" : finding.severity === "warning" ? "amber" : "cyan"}>{finding.severity}</Badge>
                        <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "var(--tl-ink)" }}>{finding.title}</p>
                        <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55, color: "var(--tl-ink-3)" }}>{finding.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.answer?.subAgentResults.length ? (
                  <div className="tl-panel tl-tone-violet" style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#E0D3FF" }}>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      {t.aiCoach.chat.subAgentTrace}
                    </div>
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {message.answer.subAgentResults.map((result) => (
                        <div key={result.id} className="tl-panel" style={{ background: "rgba(6, 10, 20, 0.55)" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            <Badge tone="slate">{result.agent}</Badge>
                            <Badge tone={result.confidence === "high" ? "emerald" : result.confidence === "medium" ? "amber" : "slate"}>{result.confidence}</Badge>
                          </div>
                          <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55, color: "var(--tl-ink-2)" }}>{result.result}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

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

                {message.answer?.evidence.length ? (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {message.answer.evidence.slice(0, 4).map((item, evidenceIndex) => (
                      <div key={`${message.role}-${index}-${item.sourceRef}-${item.title}-${evidenceIndex}`} className="tl-panel tl-tone-cyan">
                        <p className="tl-label-mono" style={{ color: "rgba(91, 224, 230, 0.9)" }}>{item.title}</p>
                        <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: "var(--tl-ink-3)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="tl-notice tl-notice-cyan">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>{t.aiCoach.chat.thinking}</span>
              </div>
            ) : null}
          </div>

          {error ? <div className="tl-notice tl-notice-red" style={{ marginTop: 14 }}>{error}</div> : null}
          {reportLoading || reportMessage || reportError ? (
            <PdfReportProgress
              step={reportStep}
              loading={reportLoading}
              doneMessage={reportMessage}
              error={reportError}
            />
          ) : null}

          <form
            style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}
            className="sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              ask();
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t.aiCoach.chat.placeholder}
              className="tl-input"
              style={{ flex: 1 }}
            />
            <Button type="submit" disabled={loading || !question.trim()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {t.aiCoach.chat.send}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid var(--tl-line)",
        background: "rgba(6, 10, 20, 0.55)",
        textAlign: "center"
      }}
    >
      <p className="tl-label-mono" style={{ fontSize: 10 }}>{label}</p>
      <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: "var(--tl-ink)" }}>{value}</p>
    </div>
  );
}

function PipelineStep({
  icon,
  title,
  detail,
  active,
  completed,
  usedLabel
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  active?: boolean;
  completed?: boolean;
  usedLabel: string;
}) {
  const highlighted = active || completed;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${highlighted ? "rgba(91, 213, 160, 0.42)" : "var(--tl-line)"}`,
        background: highlighted ? "rgba(91, 213, 160, 0.08)" : "var(--tl-panel-2)",
        boxShadow: highlighted ? "0 0 24px rgba(91, 213, 160, 0.14)" : "none",
        transition: "all 0.3s ease"
      }}
    >
      <div
        style={{
          display: "flex",
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: 9,
          border: `1px solid ${active ? "rgba(91, 213, 160, 0.55)" : completed ? "rgba(91, 213, 160, 0.45)" : "rgba(91, 224, 230, 0.25)"}`,
          background: active ? "rgba(91, 213, 160, 0.15)" : completed ? "rgba(91, 213, 160, 0.15)" : "rgba(91, 224, 230, 0.1)",
          color: highlighted ? "var(--tl-green)" : "var(--tl-cyan)",
          animation: active ? "tl-pulse 2s infinite" : undefined
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: highlighted ? "#C8F4DC" : "var(--tl-ink)", margin: 0 }}>{title}</p>
          {completed ? (
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 6,
                border: "1px solid rgba(91, 213, 160, 0.32)",
                background: "rgba(91, 213, 160, 0.12)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--tl-green)"
              }}
            >
              {usedLabel}
            </span>
          ) : null}
        </div>
        <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: "var(--tl-ink-3)" }}>{detail}</p>
      </div>
    </div>
  );
}

function RiskRadar({ analytics }: { analytics: AnalyticsData }) {
  const t = useT();
  const insights = analytics.generatedInsights.slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ padding: 8, borderRadius: 10, border: "1px solid var(--tl-line-strong)", background: "var(--tl-amber-soft)", color: "var(--tl-amber)" }}>
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="tl-card-title">{t.aiCoach.sidebar.radarTitle}</h2>
            <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.aiCoach.sidebar.radarSub}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((insight, index) => {
            const tone = insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "cyan";
            return (
              <div key={insight.id} className="tl-panel" style={{ position: "relative", overflow: "hidden", paddingLeft: 14 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 3,
                    height: "100%",
                    background: insight.severity === "risk" ? "var(--tl-red)" : insight.severity === "warning" ? "var(--tl-amber)" : "var(--tl-cyan)"
                  }}
                />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                      <Badge tone={tone}>#{index + 1}</Badge>
                      <Badge tone="slate">{insight.category}</Badge>
                    </div>
                    <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "var(--tl-ink)" }}>{insight.title}</p>
                    <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55, color: "var(--tl-ink-3)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{insight.message}</p>
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--tl-line)",
                      background: "rgba(6, 10, 20, 0.6)",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--tl-ink-3)"
                    }}
                  >
                    {t.aiCoach.sidebar.radarRefs(insight.evidence.length)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
