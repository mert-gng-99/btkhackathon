"use client";

import { Activity, Banknote, Clock3, ListChecks, Scale, TrendingUp } from "lucide-react";
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap";
import { AnalyticsCharts } from "@/components/charts/AnalyticsCharts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SymbolIntelligence } from "@/components/dashboard/SymbolIntelligence";
import { SessionGate } from "@/components/session/SessionGate";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useSessionData } from "@/hooks/useSessionData";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";

export default function DashboardPage() {
  const { session, loading, error } = useSessionData();

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  const analytics = session.analytics;
  const lateNightRatio = analytics.totalTrades > 0 ? analytics.lateNightTradeCount / analytics.totalTrades : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge tone="cyan">Session expires {new Date(session.expiresAt).toLocaleString()}</Badge>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Trading command center</h1>
          <p className="mt-2 text-sm text-slate-400">Temporary Binance Spot analysis with no stored API secret.</p>
        </div>
        <Badge tone={analytics.pnlEstimate.confidence === "none" ? "slate" : "amber"}>
          PnL confidence: {analytics.pnlEstimate.confidence}
        </Badge>
      </div>

      {session.warnings.map((warning) => (
        <Card key={warning} className="border-amber-400/25 bg-amber-400/10">
          <CardContent className="text-sm text-amber-100">{warning}</CardContent>
        </Card>
      ))}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total trades" value={formatNumber(analytics.totalTrades)} detail={`${analytics.activeDays} active days`} icon={<ListChecks className="h-4 w-4" />} />
        <MetricCard label="Total volume" value={`${formatNumber(analytics.totalVolume)} USDT`} detail={`Avg ${formatNumber(analytics.averageTradeSize)}`} icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="Quote fees" value={formatNumber(analytics.quoteFeeEstimate)} detail={analytics.feesByAsset.map((fee) => `${formatNumber(fee.amount)} ${fee.asset}`).join(", ")} icon={<Banknote className="h-4 w-4" />} />
        <MetricCard label="Buy ratio" value={formatPercent(analytics.buySell.buyRatio)} detail={`${analytics.buySell.buys} buys / ${analytics.buySell.sells} sells`} icon={<Scale className="h-4 w-4" />} />
      </section>

      <Card className="overflow-hidden border-cyan-400/20">
        <CardContent className="grid gap-5 p-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6">
            <Badge tone="cyan">Behavior snapshot</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-white">Your activity is concentrated across {analytics.symbolSummaries.length} symbols.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              This view combines symbol coverage, timing pressure, fee drag, and estimated PnL confidence into a review surface for post-trade discipline.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Rapid follow-ups</p>
                <p className="numeric mt-2 text-2xl font-semibold text-white">{analytics.rapidTradeCount}</p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Late-night ratio</p>
                <p className="numeric mt-2 text-2xl font-semibold text-white">{formatPercent(lateNightRatio)}</p>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Est. realized PnL</p>
                <p className="numeric mt-2 text-2xl font-semibold text-white">{formatNumber(analytics.pnlEstimate.realized)}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 bg-slate-950/80 p-6 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top insights</p>
            <div className="mt-4 space-y-3">
              {analytics.generatedInsights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                  <Badge tone={insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "slate"}>{insight.severity}</Badge>
                  <p className="mt-2 text-sm font-semibold text-white">{insight.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Behavior flags</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-slate-300">
                <Activity className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                Rapid follow-ups
              </span>
              <span className="numeric text-sm font-semibold text-white">{analytics.rapidTradeCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-slate-300">
                <Clock3 className="h-4 w-4 text-amber-200" aria-hidden="true" />
                Late-night trades
              </span>
              <span className="numeric text-sm font-semibold text-white">{formatPercent(lateNightRatio)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Top deterministic insights</h2>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {analytics.generatedInsights.slice(0, 4).map((insight) => (
              <div key={insight.id} className="rounded-md border border-slate-800 bg-slate-900 p-4">
                <Badge tone={insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "slate"}>{insight.category}</Badge>
                <h3 className="mt-3 text-sm font-semibold text-white">{insight.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{insight.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <SymbolIntelligence analytics={analytics} trades={session.trades} />
      <AnalyticsCharts analytics={analytics} />
      <ActivityHeatmap analytics={analytics} />
    </div>
  );
}
