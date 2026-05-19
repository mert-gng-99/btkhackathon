"use client";

import { Lightbulb } from "lucide-react";
import { TraderProfileCard } from "@/components/insights/TraderProfileCard";
import { TradingDnaRadar } from "@/components/insights/TradingDnaRadar";
import { PageHero } from "@/components/layout/PageHero";
import { InsightRadarScene } from "@/components/scenes/InsightRadarScene";
import { SessionGate } from "@/components/session/SessionGate";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useSessionData } from "@/hooks/useSessionData";
import { useT } from "@/lib/i18n";

export default function InsightsPage() {
  const { session, loading, error } = useSessionData();
  const t = useT();

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  return (
    <>
      <PageHero
        eyebrow={t.insights.badge}
        title={t.insights.title}
        sub={t.insights.intro}
        scene={<InsightRadarScene />}
        sceneLabel={t.insights.sceneLabel}
        sceneRight={t.insights.signalsLabel(session.analytics.generatedInsights.length)}
      />

      <div data-reveal className="tl-reveal">
        <TraderProfileCard sessionId={session.id} />
      </div>

      <div data-reveal className="tl-reveal">
        <TradingDnaRadar analytics={session.analytics} trades={session.trades} />
      </div>

      <section data-reveal className="tl-reveal grid gap-4 lg:grid-cols-2">
        {session.analytics.generatedInsights.map((insight) => (
          <Card key={insight.id}>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ padding: 6, borderRadius: 8, border: "1px solid var(--tl-line-strong)", background: "var(--tl-amber-soft)", color: "var(--tl-amber)" }}>
                    <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="tl-card-title">{insight.title}</h2>
                </div>
                <Badge tone={insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "slate"}>{insight.severity}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--tl-ink-2)" }}>{insight.message}</p>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {insight.evidence.map((item) => (
                  <div key={item} className="tl-panel" style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--tl-ink-3)" }}>
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}
