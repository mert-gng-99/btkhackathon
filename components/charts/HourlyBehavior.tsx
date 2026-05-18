"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock3, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AnalyticsData, HourlyBehaviorPoint } from "@/types";

function chartTooltipStyle() {
  return {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#f8fafc"
  };
}

function successLabel(point?: HourlyBehaviorPoint): string {
  if (!point || point.successRate === null) {
    return "No scored trades";
  }
  return `${formatPercent(point.successRate)} success`;
}

export function HourlyBehavior({ analytics }: { analytics: AnalyticsData }) {
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
    <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Hourly activity and success rate</h2>
              <p className="mt-1 text-sm text-slate-500">Trade count by UTC hour compared with realized-PnL success rate.</p>
            </div>
            <Badge tone={scoredTradeCount > 0 ? "emerald" : "slate"}>{scoredTradeCount} scored Futures trades</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#1f2937" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} interval={1} />
                <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  contentStyle={chartTooltipStyle()}
                  formatter={(value, name) => {
                    if (name === "successPercent") {
                      return value === null ? "No scored trades" : `${formatNumber(Number(value))}%`;
                    }
                    return formatNumber(Number(value));
                  }}
                  labelFormatter={(label) => `${label} UTC`}
                />
                <Bar yAxisId="left" dataKey="trades" name="Trades" radius={[4, 4, 0, 0]}>
                  {chartData.map((point) => (
                    <Cell key={point.label} fill={point.pnlSamples > 0 ? "#22d3ee" : "#334155"} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="successPercent"
                  name="Success rate"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#f59e0b" }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Success rate uses trades where Binance returned realized PnL, primarily Futures fills. Spot trades without realized PnL are included in activity but not scored.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Time-of-day summary</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
              <Clock3 className="h-5 w-5 text-cyan-200" aria-hidden="true" />
              <p className="mt-3 text-xs uppercase tracking-wide text-cyan-100/70">Busiest hour</p>
              <p className="mt-1 text-lg font-semibold text-white">{busiest?.label ?? "N/A"} UTC</p>
              <p className="mt-1 text-sm text-cyan-100/80">{busiest?.trades ?? 0} trades · {formatNumber(busiest?.volume ?? 0)} volume</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
                <TrendingUp className="h-5 w-5 text-emerald-200" aria-hidden="true" />
                <p className="mt-3 text-xs uppercase tracking-wide text-emerald-100/70">Best scored hour</p>
                <p className="mt-1 text-lg font-semibold text-white">{bestHour?.label ?? "N/A"} UTC</p>
                <p className="mt-1 text-sm text-emerald-100/80">{successLabel(bestHour)} · PnL {formatNumber(bestHour?.realizedPnl ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-4">
                <TrendingDown className="h-5 w-5 text-rose-200" aria-hidden="true" />
                <p className="mt-3 text-xs uppercase tracking-wide text-rose-100/70">Weakest scored hour</p>
                <p className="mt-1 text-lg font-semibold text-white">{weakestHour?.label ?? "N/A"} UTC</p>
                <p className="mt-1 text-sm text-rose-100/80">{successLabel(weakestHour)} · PnL {formatNumber(weakestHour?.realizedPnl ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
