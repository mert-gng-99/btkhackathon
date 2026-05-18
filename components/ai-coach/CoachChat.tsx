"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
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
  UserRoundCog
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { SUGGESTED_COACH_QUESTIONS } from "@/lib/rag/ragTypes";
import type { AiCoachAnswer, AnalyticsData, TraderProfile } from "@/types";

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

const REPORT_STEPS = [
  "Collecting all coach answers and sub-agent findings...",
  "Gemini report writer is drafting the PDF summary...",
  "Strict validator agent is reviewing the draft...",
  "Applying validator feedback if needed...",
  "Rendering the final PDF..."
];

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
  const agents = new Set<AgentId>(["rag_researcher", "behavior_analyst"]);

  if (lower.includes("revenge") || lower.includes("emotion") || lower.includes("control") || lower.includes("mistake") || lower.includes("loss")) {
    agents.add("revenge_trading_agent");
  }
  if (lower.includes("pnl") || lower.includes("profit") || lower.includes("loss") || lower.includes("success") || lower.includes("performance")) {
    agents.add("pnl_quality_agent");
  }
  if (lower.includes("coin") || lower.includes("symbol") || lower.includes("asset") || lower.includes("concentration")) {
    agents.add("symbol_agent");
  }
  if (lower.includes("trader") || lower.includes("type") || lower.includes("profile") || lower.includes("pattern")) {
    agents.add("profile_analyst");
  }

  return [...agents].slice(0, 4);
}

export function CoachChat({ sessionId, analytics }: CoachChatProps) {
  const [question, setQuestion] = useState("");
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeAgents, setActiveAgents] = useState<AgentId[]>([]);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask about your behavior, fees, timing, overtrading, or symbol concentration. I will use your cached trader profile, RAG chunks, and sub-agent analysis."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStep, setReportStep] = useState(0);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const storageKey = `trader-profile:${sessionId}`;

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
        const response = await fetch(`/api/insights/trader-profile?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: "no-store"
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Trader profile request failed.");
        }
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
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!reportLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setReportStep((current) => Math.min(current + 1, REPORT_STEPS.length - 1));
    }, 2200);

    return () => window.clearInterval(interval);
  }, [reportLoading]);

  async function ask(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) {
      return;
    }

    setQuestion("");
    setLoading(true);
    setError(null);
    setReportMessage(null);
    setReportError(null);
    setActiveAgents(["orchestrator", ...predictedAgentsForQuestion(trimmed)]);
    setAgentStatus("Gemini orchestrator is planning sub-agent work...");
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    try {
      const response = await fetch("/api/ai-coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question: trimmed })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Coach request failed.");
      }

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

      const completedAgents = (payload.answer?.subAgentResults ?? [])
        .map((result: { agent: string }) => agentFromBackendName(result.agent))
        .filter((agent: AgentId | null): agent is AgentId => Boolean(agent));
      setAgentStatus(`Completed ${completedAgents.length || 1} sub-agent checks.`);
      setMessages((current) => [...current, { role: "assistant", content: payload.answer.answer, answer: payload.answer }]);
      window.setTimeout(() => {
        setActiveAgents([]);
        setAgentStatus(null);
      }, 1300);
    } catch (chatError: unknown) {
      setError(chatError instanceof Error ? chatError.message : "Coach request failed.");
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

    if (answers.length === 0 || reportLoading) {
      return;
    }

    setReportLoading(true);
    setReportStep(0);
    setReportMessage(null);
    setReportError(null);

    try {
      const response = await fetch("/api/ai-coach/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "PDF report generation failed.");
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
      setReportMessage("PDF report generated after validator review.");
    } catch (reportGenerationError: unknown) {
      setReportError(reportGenerationError instanceof Error ? reportGenerationError.message : "PDF report generation failed.");
    } finally {
      setReportLoading(false);
    }
  }

  const answerCount = messages.filter((message) => message.answer).length;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <aside className="space-y-5">
        <Card className="overflow-hidden border-cyan-400/20 bg-cyan-400/[0.04]">
          <CardHeader className="bg-slate-900/70">
            <div className="flex items-center gap-3">
              <UserRoundCog className="h-5 w-5 text-cyan-200" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-white">Trader model</h2>
                <p className="mt-1 text-xs text-slate-500">Shared with Insights and reused from the session cache.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="flex items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading trader profile...
              </div>
            ) : null}

            {profile ? (
              <>
                <div className="rounded-md border border-slate-800 bg-slate-950 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="cyan">
                      <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                      {profile.traderType}
                    </Badge>
                    <Badge tone={profile.confidence === "high" ? "emerald" : profile.confidence === "medium" ? "amber" : "slate"}>
                      {profile.confidence} confidence
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{profile.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.behavioralTags.slice(0, 8).map((tag) => (
                    <Badge key={tag} tone="slate">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="rounded-md border border-slate-800 bg-slate-950 p-3 text-sm leading-6 text-slate-400">
                No cached trader profile is available yet. The next coach answer can create one if Gemini is configured.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Agentic pipeline</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentStatus ? (
              <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100">
                {agentStatus}
              </div>
            ) : null}
            <PipelineStep
              active={activeAgents.includes("orchestrator")}
              icon={<Bot className="h-4 w-4" aria-hidden="true" />}
              title="Gemini orchestrator"
              detail="Plans the sub-agent work and merges structured outputs."
            />
            <PipelineStep
              active={activeAgents.includes("rag_researcher")}
              icon={<DatabaseZap className="h-4 w-4" aria-hidden="true" />}
              title="RAG researcher"
              detail="Retrieves relevant session chunks and uploaded materials."
            />
            <PipelineStep
              active={activeAgents.includes("revenge_trading_agent")}
              icon={<Flame className="h-4 w-4" aria-hidden="true" />}
              title="Revenge trading scan"
              detail="Looks for rapid follow-ups and post-loss escalation clues."
            />
            <PipelineStep
              active={activeAgents.includes("pnl_quality_agent")}
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
              title="PnL quality agent"
              detail="Checks whether success and PnL claims are well supported."
            />
            <PipelineStep
              active={activeAgents.includes("symbol_agent")}
              icon={<Layers3 className="h-4 w-4" aria-hidden="true" />}
              title="Symbol agent"
              detail="Reviews concentration, symbol switching, and dominant markets."
            />
          </CardContent>
        </Card>

        <RiskRadar analytics={analytics} />

        <Card className="border-amber-400/25 bg-amber-400/10">
          <CardContent className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
            <p className="text-sm leading-6 text-amber-100">
              The coach analyzes behavior only. It must not tell you to buy, sell, or hold any asset.
            </p>
          </CardContent>
        </Card>
      </aside>

      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-900/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-5 w-5 text-cyan-200" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-white">AI Trade Coach</h2>
                <p className="mt-1 text-sm text-slate-500">Structured Gemini agents grounded in analytics chunks and local RAG materials.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <MetricChip label="Trades" value={analytics.totalTrades.toLocaleString()} />
                <MetricChip label="Active days" value={analytics.activeDays.toLocaleString()} />
                <MetricChip label="PnL confidence" value={analytics.pnlEstimate.confidence} />
              </div>
              <Button type="button" variant="secondary" onClick={generatePdfReport} disabled={reportLoading || answerCount === 0}>
                {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
                Generate PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_COACH_QUESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => ask(item)}
                className="cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition-colors duration-200 hover:border-cyan-400/50 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyanData/40"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="h-[72vh] min-h-[620px] max-h-[860px] space-y-4 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[86%]" : "mr-auto max-w-[96%]"}>
                <div
                  className={`rounded-lg p-3 text-sm leading-6 ${
                    message.role === "user" ? "bg-amberTrust text-slate-950" : "border border-slate-800 bg-slate-900 text-slate-200"
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                </div>

                {message.answer?.keyFindings.length ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {message.answer.keyFindings.slice(0, 4).map((finding) => (
                      <div key={`${finding.title}-${finding.evidenceRef ?? ""}`} className="rounded-md border border-slate-800 bg-slate-900/80 p-3">
                        <Badge tone={finding.severity === "risk" ? "rose" : finding.severity === "warning" ? "amber" : "cyan"}>
                          {finding.severity}
                        </Badge>
                        <p className="mt-2 text-sm font-semibold text-white">{finding.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{finding.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.answer?.subAgentResults.length ? (
                  <div className="mt-3 rounded-md border border-violet-400/20 bg-violet-400/10 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-200">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Sub-agent trace
                    </div>
                    <div className="mt-3 grid gap-2">
                      {message.answer.subAgentResults.map((result) => (
                        <div key={result.id} className="rounded-md border border-slate-800 bg-slate-950/80 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="slate">{result.agent}</Badge>
                            <Badge tone={result.confidence === "high" ? "emerald" : result.confidence === "medium" ? "amber" : "slate"}>
                              {result.confidence}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-300">{result.result}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {message.answer?.evidence.length ? (
                  <div className="mt-3 grid gap-2">
                    {message.answer.evidence.slice(0, 4).map((item, evidenceIndex) => (
                      <div
                        key={`${message.role}-${index}-${item.sourceRef}-${item.title}-${evidenceIndex}`}
                        className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">{item.title}</p>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Gemini orchestrator is assigning sub-agents and retrieving evidence...
              </div>
            ) : null}
          </div>

          {error ? <div className="rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
          {reportLoading || reportMessage || reportError ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                reportError
                  ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
                  : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
              }`}
            >
              <div className="flex items-center gap-2">
                {reportLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : reportError ? (
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{reportLoading ? REPORT_STEPS[reportStep] : reportError ?? reportMessage}</span>
              </div>
            </div>
          ) : null}

          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              ask();
            }}
          >
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about mistakes, trader type, late hours, fees, discipline..."
              className="min-h-11 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition-colors duration-200 placeholder:text-slate-500 focus:border-cyanData focus:ring-2 focus:ring-cyanData/30"
            />
            <Button type="submit" disabled={loading || !question.trim()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Ask
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-white">{value}</p>
    </div>
  );
}

function PipelineStep({ icon, title, detail, active }: { icon: ReactNode; title: string; detail: string; active?: boolean }) {
  return (
    <div
      className={`flex gap-3 rounded-md border p-3 transition-all duration-300 ${
        active ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_24px_rgba(52,211,153,0.16)]" : "border-slate-800 bg-slate-900"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-300 ${
          active ? "animate-pulse border-emerald-300/50 bg-emerald-400/15 text-emerald-200" : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className={`text-sm font-semibold ${active ? "text-emerald-100" : "text-white"}`}>{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function RiskRadar({ analytics }: { analytics: AnalyticsData }) {
  const insights = analytics.generatedInsights.slice(0, 5);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-900/70">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-amber-200" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-white">Behavior risk radar</h2>
            <p className="mt-1 text-xs text-slate-500">Ranked deterministic signals before the coach adds context.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const tone = insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "cyan";
          return (
            <div key={insight.id} className="relative overflow-hidden rounded-md border border-slate-800 bg-slate-900/80 p-3">
              <div
                className={`absolute left-0 top-0 h-full w-1 ${
                  insight.severity === "risk" ? "bg-rose-300" : insight.severity === "warning" ? "bg-amber-300" : "bg-cyan-300"
                }`}
              />
              <div className="ml-2 flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone}>#{index + 1}</Badge>
                    <Badge tone="slate">{insight.category}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{insight.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">{insight.message}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {insight.evidence.length} refs
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
