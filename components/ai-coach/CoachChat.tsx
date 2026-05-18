"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bot, BrainCircuit, CheckCircle2, DatabaseZap, Loader2, Send, ShieldAlert, Sparkles, UserRoundCog } from "lucide-react";
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

export function CoachChat({ sessionId, analytics }: CoachChatProps) {
  const [question, setQuestion] = useState("");
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask about your behavior, fees, timing, overtrading, or symbol concentration. I will use your cached trader profile, RAG chunks, and sub-agent analysis."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function ask(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) {
      return;
    }

    setQuestion("");
    setLoading(true);
    setError(null);
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

      setMessages((current) => [...current, { role: "assistant", content: payload.answer.answer, answer: payload.answer }]);
    } catch (chatError: unknown) {
      setError(chatError instanceof Error ? chatError.message : "Coach request failed.");
    } finally {
      setLoading(false);
    }
  }

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
            <PipelineStep icon={<Bot className="h-4 w-4" aria-hidden="true" />} title="Gemini orchestrator" detail="Plans the sub-agent work and merges structured outputs." />
            <PipelineStep icon={<DatabaseZap className="h-4 w-4" aria-hidden="true" />} title="RAG researcher" detail="Retrieves relevant session chunks and uploaded materials." />
            <PipelineStep icon={<BrainCircuit className="h-4 w-4" aria-hidden="true" />} title="Behavior analysts" detail="Check fees, timing, frequency, symbols, and trader profile evidence." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Top detected mistakes</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.generatedInsights.slice(0, 5).map((insight) => (
              <div key={insight.id} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                <Badge tone={insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "slate"}>{insight.category}</Badge>
                <p className="mt-2 text-sm font-medium text-white">{insight.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{insight.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>

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
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <MetricChip label="Trades" value={analytics.totalTrades.toLocaleString()} />
              <MetricChip label="Active days" value={analytics.activeDays.toLocaleString()} />
              <MetricChip label="PnL confidence" value={analytics.pnlEstimate.confidence} />
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

          <div className="max-h-[660px] space-y-4 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-4">
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
                    {message.answer.evidence.slice(0, 4).map((item) => (
                      <div key={`${item.sourceRef}-${item.title}`} className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3">
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

function PipelineStep({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-slate-800 bg-slate-900 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
