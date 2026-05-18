"use client";

import { FileText, Lightbulb, ShieldAlert } from "lucide-react";
import { TraderProfileCard } from "@/components/insights/TraderProfileCard";
import { SessionGate } from "@/components/session/SessionGate";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useSessionData } from "@/hooks/useSessionData";

export default function InsightsPage() {
  const { session, loading, error } = useSessionData();

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge tone="amber">Deterministic and evidence-backed</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-white">Insights and reports</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Gemini generates the trader profile from your metrics. Rule-based insight cards remain deterministic and evidence-backed.
        </p>
      </div>

      <TraderProfileCard sessionId={session.id} />

      <section className="grid gap-4 lg:grid-cols-2">
        {session.analytics.generatedInsights.map((insight) => (
          <Card key={insight.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-200" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-white">{insight.title}</h2>
                </div>
                <Badge tone={insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "slate"}>{insight.severity}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-300">{insight.message}</p>
              <div className="mt-4 space-y-2">
                {insight.evidence.map((item) => (
                  <div key={item} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-amber-400/25 bg-amber-400/10">
        <CardContent className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
          <p className="text-sm leading-6 text-amber-100">
            These reports are behavioral reviews only. They do not tell you what to buy, sell, or hold.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        {session.reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-white">{report.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-300">{report.summary}</p>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Metrics</p>
                <div className="space-y-2">
                  {report.metrics.map((item) => (
                    <div key={item} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reflection</p>
                <ul className="space-y-2 text-xs leading-5 text-slate-400">
                  {report.reflectionQuestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
