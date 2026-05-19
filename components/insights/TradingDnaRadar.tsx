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
