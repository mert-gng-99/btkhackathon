"use client";

import { Activity, Banknote, CalendarClock, CheckCircle2, Clock3, Layers3, ListChecks, Scale, TrendingUp, WalletCards } from "lucide-react";
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap";
import { AnalyticsCharts } from "@/components/charts/AnalyticsCharts";
import { HourlyBehavior } from "@/components/charts/HourlyBehavior";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SymbolIntelligence } from "@/components/dashboard/SymbolIntelligence";
import { SessionGate } from "@/components/session/SessionGate";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useSessionData } from "@/hooks/useSessionData";
import { useT } from "@/lib/i18n";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";

export default function DashboardPage() {
  const { session, loading, error } = useSessionData();
  const t = useT();

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  const analytics = session.analytics;
  const lateNightRatio = analytics.totalTrades > 0 ? analytics.lateNightTradeCount / analytics.totalTrades : 0;
  const markets = analytics.marketBreakdown;
  const marketLabel = {
    spot: t.market.spot,
    um_futures: t.market.um,
    coin_futures: t.market.coin
  };

  return (
    <>
      <section className="tl-card" style={{ overflow: "hidden" }}>
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Badge tone="emerald">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                {t.dashboard.ready}
              </Badge>
              <Badge tone="cyan">
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
                {t.dashboard.expires} {new Date(session.expiresAt).toLocaleString()}
              </Badge>
            </div>
            <h1 className="tl-display" style={{ marginTop: 18, fontSize: "clamp(28px, 4vw, 48px)" }}>{t.dashboard.title}</h1>
            <p className="tl-sub" style={{ marginTop: 12 }}>{t.dashboard.intro}</p>
            <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {markets.length > 0 ? (
                markets.map((market) => (
                  <span key={market.marketType} className="tl-chip">
                    {marketLabel[market.marketType]} · {t.dashboard.marketTrades(formatNumber(market.trades))}
                  </span>
                ))
              ) : (
                <span className="tl-chip">{t.dashboard.noMarket}</span>
              )}
            </div>
          </div>

          <div
            style={{
              padding: 24,
              borderTop: "1px solid var(--tl-line)",
              background: "rgba(255, 255, 255, 0.018)"
            }}
            className="lg:border-l lg:border-t-0"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="tl-panel">
                <WalletCards className="h-5 w-5" style={{ color: "var(--tl-amber)" }} aria-hidden="true" />
                <p className="tl-label-mono" style={{ marginTop: 12 }}>{t.dashboard.totalVolume}</p>
                <p className="tl-numeric" style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: "var(--tl-ink)" }}>{formatNumber(analytics.totalVolume)}</p>
              </div>
              <div className="tl-panel">
                <Layers3 className="h-5 w-5" style={{ color: "var(--tl-cyan)" }} aria-hidden="true" />
                <p className="tl-label-mono" style={{ marginTop: 12 }}>{t.dashboard.symbols}</p>
                <p className="tl-numeric" style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: "var(--tl-ink)" }}>{analytics.symbolSummaries.length}</p>
              </div>
              <div className="tl-panel tl-tone-amber" style={{ gridColumn: "span 2" }}>
                <p className="tl-label-mono" style={{ color: "rgba(245, 181, 68, 0.85)" }}>{t.dashboard.pnlConfidence}</p>
                <p style={{ marginTop: 4, fontSize: 17, fontWeight: 600, color: "#FFE3AC" }}>{analytics.pnlEstimate.confidence}</p>
                <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: "rgba(255, 227, 172, 0.78)" }}>{t.dashboard.pnlNote}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          tone="emerald"
          label={t.dashboard.metrics.totalTrades}
          value={formatNumber(analytics.totalTrades)}
          detail={t.dashboard.metrics.activeDays(formatNumber(analytics.activeDays))}
          icon={<ListChecks className="h-4 w-4" />}
        />
        <MetricCard
          tone="cyan"
          label={t.dashboard.metrics.volumeQuote}
          value={`${formatNumber(analytics.totalVolume)} USDT`}
          detail={t.dashboard.metrics.avg(formatNumber(analytics.averageTradeSize))}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          tone="amber"
          label={t.dashboard.metrics.fees}
          value={formatNumber(analytics.quoteFeeEstimate)}
          detail={analytics.feesByAsset.map((fee) => `${formatNumber(fee.amount)} ${fee.asset}`).join(", ")}
          icon={<Banknote className="h-4 w-4" />}
        />
        <MetricCard
          tone="rose"
          label={t.dashboard.metrics.buyRatio}
          value={formatPercent(analytics.buySell.buyRatio)}
          detail={t.dashboard.metrics.buysSells(formatNumber(analytics.buySell.buys), formatNumber(analytics.buySell.sells))}
          icon={<Scale className="h-4 w-4" />}
        />
      </section>

      <Card tone="cyan">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div style={{ padding: 24 }}>
            <Badge tone="cyan">{t.dashboard.behavior.eyebrow}</Badge>
            <h2 className="tl-heading" style={{ marginTop: 14 }}>{t.dashboard.behavior.title(analytics.symbolSummaries.length)}</h2>
            <p className="tl-sub" style={{ marginTop: 10 }}>{t.dashboard.behavior.body}</p>
            <div className="grid gap-3 sm:grid-cols-3" style={{ marginTop: 22 }}>
              <div className="tl-panel">
                <p className="tl-label-mono">{t.dashboard.behavior.rapidFollowUps}</p>
                <p className="tl-numeric" style={{ marginTop: 6, fontSize: 22, fontWeight: 600, color: "var(--tl-ink)" }}>{analytics.rapidTradeCount}</p>
              </div>
              <div className="tl-panel">
                <p className="tl-label-mono">{t.dashboard.behavior.lateNightRatio}</p>
                <p className="tl-numeric" style={{ marginTop: 6, fontSize: 22, fontWeight: 600, color: "var(--tl-ink)" }}>{formatPercent(lateNightRatio)}</p>
              </div>
              <div className="tl-panel">
                <p className="tl-label-mono">{t.dashboard.behavior.estPnl}</p>
                <p className="tl-numeric" style={{ marginTop: 6, fontSize: 22, fontWeight: 600, color: "var(--tl-ink)" }}>{formatNumber(analytics.pnlEstimate.realized)}</p>
              </div>
            </div>
          </div>
          <div
            style={{
              padding: 24,
              borderTop: "1px solid var(--tl-line)",
              background: "rgba(0, 0, 0, 0.22)"
            }}
            className="lg:border-l lg:border-t-0"
          >
            <p className="tl-label-mono">{t.dashboard.behavior.topInsights}</p>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {analytics.generatedInsights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="tl-panel">
                  <Badge tone={insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "slate"}>
                    {t.dashboard.severity[insight.severity] ?? insight.severity}
                  </Badge>
                  <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "var(--tl-ink)" }}>{insight.title}</p>
                  <p
                    style={{
                      marginTop: 4,
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "var(--tl-ink-3)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {insight.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="tl-card-title">{t.dashboard.flags.title}</h2>
          </CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--tl-ink-2)" }}>
                  <Activity className="h-4 w-4" style={{ color: "var(--tl-cyan)" }} aria-hidden="true" />
                  {t.dashboard.flags.rapid}
                </span>
                <span className="tl-numeric" style={{ fontSize: 14, fontWeight: 600, color: "var(--tl-ink)" }}>{analytics.rapidTradeCount}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--tl-ink-2)" }}>
                  <Clock3 className="h-4 w-4" style={{ color: "var(--tl-amber)" }} aria-hidden="true" />
                  {t.dashboard.flags.lateNight}
                </span>
                <span className="tl-numeric" style={{ fontSize: 14, fontWeight: 600, color: "var(--tl-ink)" }}>{formatPercent(lateNightRatio)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="tl-card-title">{t.dashboard.deterministic}</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {analytics.generatedInsights.slice(0, 4).map((insight) => (
                <div key={insight.id} className="tl-panel">
                  <Badge tone={insight.severity === "risk" ? "rose" : insight.severity === "warning" ? "amber" : "slate"}>{insight.category}</Badge>
                  <h3 style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: "var(--tl-ink)" }}>{insight.title}</h3>
                  <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55, color: "var(--tl-ink-2)" }}>{insight.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <SymbolIntelligence analytics={analytics} trades={session.trades} />
      <HourlyBehavior analytics={analytics} />
      <AnalyticsCharts analytics={analytics} />
      <ActivityHeatmap analytics={analytics} />
    </>
  );
}
