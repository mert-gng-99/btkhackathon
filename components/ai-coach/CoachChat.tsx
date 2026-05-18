"use client";

import { useState } from "react";
import { BrainCircuit, Loader2, Send, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { SUGGESTED_COACH_QUESTIONS } from "@/lib/rag/ragTypes";
import type { AiCoachAnswer, AnalyticsData } from "@/types";

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask about your behavior, fees, timing, overtrading, or symbol concentration. I will answer only from the analyzed session data."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setMessages((current) => [...current, { role: "assistant", content: payload.answer.answer, answer: payload.answer }]);
    } catch (chatError: unknown) {
      setError(chatError instanceof Error ? chatError.message : "Coach request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="space-y-5">
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
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-5 w-5 text-cyan-200" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-white">AI Trade Coach</h2>
              <p className="mt-1 text-sm text-slate-500">Grounded in analytics chunks and local RAG materials.</p>
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
                className="cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition-colors duration-200 hover:border-cyan-400/50 hover:text-cyan-100"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="max-h-[520px] space-y-4 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[85%]" : "mr-auto max-w-[92%]"}>
                <div className={`rounded-lg p-3 text-sm leading-6 ${message.role === "user" ? "bg-amberTrust text-slate-950" : "bg-slate-900 text-slate-200"}`}>
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                </div>
                {message.answer?.evidence.length ? (
                  <div className="mt-3 grid gap-2">
                    {message.answer.evidence.slice(0, 3).map((item) => (
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
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-200" aria-hidden="true" />
                Retrieving evidence...
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
              placeholder="Ask about overtrading, fees, timing, symbols..."
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
