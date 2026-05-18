"use client";

import { ArrowDownRight, ArrowUpRight, Coins, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils/dates";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AnalyticsData, NormalizedTrade } from "@/types";

interface SymbolIntelligenceProps {
  analytics: AnalyticsData;
  trades: NormalizedTrade[];
}

export function SymbolIntelligence({ analytics, trades }: SymbolIntelligenceProps) {
  const t = useT();
  const latestTrades = [...trades].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Card>
        <CardHeader>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 className="tl-card-title">{t.symbolIntel.title}</h2>
              <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.symbolIntel.sub}</p>
            </div>
            <Coins className="h-5 w-5" style={{ color: "var(--tl-cyan)" }} aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analytics.symbolSummaries.slice(0, 8).map((symbol, index) => {
              const share = analytics.totalVolume > 0 ? symbol.volume / analytics.totalVolume : 0;
              return (
                <div key={symbol.symbol} className="tl-panel">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="sm:flex-row sm:items-center sm:justify-between">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          height: 38,
                          width: 38,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 10,
                          border: "1px solid var(--tl-line-strong)",
                          background: "rgba(91, 224, 230, 0.08)",
                          color: "var(--tl-cyan)",
                          fontWeight: 600,
                          fontSize: 13
                        }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: "var(--tl-ink)" }}>{symbol.symbol}</p>
                        <p style={{ marginTop: 2, fontSize: 12, color: "var(--tl-ink-3)" }}>
                          {symbol.trades} {t.symbolIntel.trades} · {symbol.buys} {t.symbolIntel.buys} · {symbol.sells} {t.symbolIntel.sells}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "left" }} className="sm:text-right">
                      <p className="tl-numeric" style={{ fontSize: 14, fontWeight: 600, color: "var(--tl-ink)" }}>
                        {formatNumber(symbol.volume)} {t.symbolIntel.quoteVolume}
                      </p>
                      <p style={{ marginTop: 2, fontSize: 12, color: "var(--tl-ink-3)" }}>{t.symbolIntel.avg(formatNumber(symbol.averageTradeSize))}</p>
                    </div>
                  </div>
                  <div className="tl-progress" style={{ marginTop: 12 }}>
                    <div className="tl-progress-fill" style={{ width: `${Math.min(100, share * 100)}%` }} />
                  </div>
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge tone="slate">{t.symbolIntel.shareOf(formatPercent(share))}</Badge>
                    {typeof symbol.realizedPnlEstimate === "number" ? (
                      <Badge tone={symbol.realizedPnlEstimate >= 0 ? "emerald" : "rose"}>{t.symbolIntel.estPnl(formatNumber(symbol.realizedPnlEstimate))}</Badge>
                    ) : null}
                    {symbol.lastTradeAt ? <Badge tone="cyan">{t.symbolIntel.last(formatDateTime(symbol.lastTradeAt))}</Badge> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TimerReset className="h-5 w-5" style={{ color: "var(--tl-amber)" }} aria-hidden="true" />
              <h2 className="tl-card-title">{t.symbolIntel.latestTitle}</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {latestTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="tl-panel"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        padding: 6,
                        borderRadius: 8,
                        border: "1px solid var(--tl-line-strong)",
                        background: trade.side === "BUY" ? "rgba(91, 213, 160, 0.12)" : "rgba(255, 107, 107, 0.12)",
                        color: trade.side === "BUY" ? "var(--tl-green)" : "var(--tl-red)"
                      }}
                    >
                      {trade.side === "BUY" ? <ArrowDownRight className="h-4 w-4" aria-hidden="true" /> : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tl-ink)" }}>{trade.symbol}</p>
                      <p style={{ marginTop: 2, fontSize: 11, color: "var(--tl-ink-3)" }}>{formatDateTime(trade.timestamp)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="tl-numeric" style={{ fontSize: 13, fontWeight: 600, color: "var(--tl-ink)" }}>{formatNumber(trade.quoteQuantity)}</p>
                    <p style={{ marginTop: 2, fontSize: 11, color: "var(--tl-ink-3)" }}>
                      {formatNumber(trade.fee, { maximumFractionDigits: 6 })} {trade.feeAsset}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="tl-card-title">{t.symbolIntel.bestWorstTitle}</h2>
          </CardHeader>
          <CardContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...analytics.bestTrades.slice(0, 2), ...analytics.worstTrades.slice(0, 2)].map((trade) => (
                <div
                  key={`${trade.tradeId}-${trade.pnl}`}
                  className="tl-panel"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px" }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tl-ink)" }}>{trade.symbol}</p>
                    <p style={{ marginTop: 2, fontSize: 11, color: "var(--tl-ink-3)" }}>{formatDateTime(trade.timestamp)}</p>
                  </div>
                  <Badge tone={trade.pnl >= 0 ? "emerald" : "rose"}>{formatNumber(trade.pnl)}</Badge>
                </div>
              ))}
              {analytics.bestTrades.length === 0 && analytics.worstTrades.length === 0 ? (
                <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--tl-ink-3)" }}>{t.symbolIntel.bestWorstEmpty}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
