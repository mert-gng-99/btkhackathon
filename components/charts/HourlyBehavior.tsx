"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock3, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AnalyticsData, HourlyBehaviorPoint } from "@/types";

function chartTooltipStyle() {
  return {
    background: "rgba(11, 18, 32, 0.96)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "10px",
    color: "#E7ECF3"
  };
}

const AXIS_COLOR = "#6B7589";

export function HourlyBehavior({ analytics }: { analytics: AnalyticsData }) {
  const t = useT();

  function successLabel(point?: HourlyBehaviorPoint): string {
    if (!point || point.successRate === null) return t.charts.noScored;
    return t.charts.successLabel(formatPercent(point.successRate));
  }

  const hourly = analytics.hourlyBehavior;
  const chartData = hourly.map((point) => ({
    ...point,
    successPercent: point.successRate === null ? null : Math.round(point.successRate * 100)
  }));
  const busiest = [...hourly].sort((a, b) => b.trades - a.trades)[0];
  const scoredHours = hourly.filter((point) => point.successRate !== null && point.pnlSamples >= 2);
  const bestHour = [...scoredHours].sort((a, b) => (b.successRate ?? 0) - (a.successRate ?? 0) || b.realizedPnl - a.realizedPnl)[0];
  const weakestHour = [...scoredHours].sort((a, b) => (a.successRate ?? 0) - (b.successRate ?? 0) || a.realizedPnl - b.realizedPnl)[0];
  const scoredTradeCount = hourly.reduce((sum, point) => sum + point.pnlSamples, 0);

  return (
    <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <CardHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="tl-card-title">{t.charts.hourlyTitle}</h2>
              <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.charts.hourlySub}</p>
            </div>
            <Badge tone={scoredTradeCount > 0 ? "emerald" : "slate"}>{t.charts.hourlyTradesScored(scoredTradeCount)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: AXIS_COLOR, fontSize: 11 }} interval={1} />
                <YAxis yAxisId="left" tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  contentStyle={chartTooltipStyle()}
                  formatter={(value, name) => {
                    if (name === "successPercent") {
                      return value === null ? t.charts.noScored : `${formatNumber(Number(value))}%`;
                    }
                    return formatNumber(Number(value));
                  }}
                  labelFormatter={(label) => `${label} ${t.charts.hourUtcSuffix}`}
                />
                <Bar yAxisId="left" dataKey="trades" radius={[4, 4, 0, 0]}>
                  {chartData.map((point) => (
                    <Cell key={point.label} fill={point.pnlSamples > 0 ? "#5BE0E6" : "#243044"} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="successPercent"
                  stroke="#F5B544"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#F5B544" }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, lineHeight: 1.55, color: "var(--tl-ink-3)" }}>{t.charts.hourlyFootnote}</p>
        </CardContent>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Card>
          <CardHeader>
            <h2 className="tl-card-title">{t.charts.busiestHour}</h2>
          </CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="tl-panel tl-tone-cyan">
                <Clock3 className="h-5 w-5" style={{ color: "#5BE0E6" }} aria-hidden="true" />
                <p className="tl-label-mono" style={{ marginTop: 10 }}>{t.charts.busiestHour}</p>
                <p style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: "var(--tl-ink)" }}>{busiest?.label ?? "N/A"} {t.charts.hourUtcSuffix}</p>
                <p style={{ marginTop: 4, fontSize: 13, color: "#C7F4F7" }}>
                  {busiest?.trades ?? 0} {t.symbolIntel.trades} · {formatNumber(busiest?.volume ?? 0)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="tl-panel tl-tone-green">
                  <TrendingUp className="h-5 w-5" style={{ color: "#5BD5A0" }} aria-hidden="true" />
                  <p className="tl-label-mono" style={{ marginTop: 10 }}>{t.charts.bestHour}</p>
                  <p style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: "var(--tl-ink)" }}>{bestHour?.label ?? "N/A"} {t.charts.hourUtcSuffix}</p>
                  <p style={{ marginTop: 4, fontSize: 13, color: "#C8F4DC" }}>
                    {successLabel(bestHour)} · {t.charts.pnl} {formatNumber(bestHour?.realizedPnl ?? 0)}
                  </p>
                </div>
                <div className="tl-panel tl-tone-red">
                  <TrendingDown className="h-5 w-5" style={{ color: "#FF6B6B" }} aria-hidden="true" />
                  <p className="tl-label-mono" style={{ marginTop: 10 }}>{t.charts.weakestHour}</p>
                  <p style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color: "var(--tl-ink)" }}>{weakestHour?.label ?? "N/A"} {t.charts.hourUtcSuffix}</p>
                  <p style={{ marginTop: 4, fontSize: 13, color: "#FFC7C7" }}>
                    {successLabel(weakestHour)} · {t.charts.pnl} {formatNumber(weakestHour?.realizedPnl ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
