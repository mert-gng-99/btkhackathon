"use client";

import { Lightbulb } from "lucide-react";
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
        <h1 className="mt-3 text-3xl font-semibold text-white">Insights</h1>
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
    </div>
  );
}
