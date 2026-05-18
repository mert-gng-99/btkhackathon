"use client";

import { ArrowDownRight, ArrowUpRight, Coins, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils/dates";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AnalyticsData, NormalizedTrade } from "@/types";

interface SymbolIntelligenceProps {
  analytics: AnalyticsData;
  trades: NormalizedTrade[];
}

export function SymbolIntelligence({ analytics, trades }: SymbolIntelligenceProps) {
  const latestTrades = [...trades].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Symbol intelligence</h2>
              <p className="mt-1 text-sm text-slate-500">Where activity, volume, and estimated PnL are concentrated.</p>
            </div>
            <Coins className="h-5 w-5 text-cyan-200" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.symbolSummaries.slice(0, 8).map((symbol, index) => {
              const share = analytics.totalVolume > 0 ? symbol.volume / analytics.totalVolume : 0;
              return (
                <div key={symbol.symbol} className="rounded-lg border border-slate-800 bg-slate-900/75 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-sm font-semibold text-cyan-100">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{symbol.symbol}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {symbol.trades} trades · {symbol.buys} buys · {symbol.sells} sells
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="numeric text-sm font-semibold text-white">{formatNumber(symbol.volume)} quote volume</p>
                      <p className="mt-1 text-xs text-slate-500">Avg {formatNumber(symbol.averageTradeSize)}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-300" style={{ width: `${Math.min(100, share * 100)}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="slate">{formatPercent(share)} of volume</Badge>
                    {typeof symbol.realizedPnlEstimate === "number" ? (
                      <Badge tone={symbol.realizedPnlEstimate >= 0 ? "emerald" : "rose"}>
                        Est. PnL {formatNumber(symbol.realizedPnlEstimate)}
                      </Badge>
                    ) : null}
                    {symbol.lastTradeAt ? <Badge tone="cyan">Last {formatDateTime(symbol.lastTradeAt)}</Badge> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <TimerReset className="h-5 w-5 text-amber-200" aria-hidden="true" />
              <h2 className="text-base font-semibold text-white">Latest trade flow</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900 px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-md p-2 ${trade.side === "BUY" ? "bg-emerald-400/10 text-emerald-200" : "bg-rose-400/10 text-rose-200"}`}>
                    {trade.side === "BUY" ? <ArrowDownRight className="h-4 w-4" aria-hidden="true" /> : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{trade.symbol}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(trade.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="numeric text-sm font-semibold text-white">{formatNumber(trade.quoteQuantity)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(trade.fee, { maximumFractionDigits: 6 })} {trade.feeAsset}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Estimated best / worst sells</h2>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[...analytics.bestTrades.slice(0, 2), ...analytics.worstTrades.slice(0, 2)].map((trade) => (
              <div key={`${trade.tradeId}-${trade.pnl}`} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{trade.symbol}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(trade.timestamp)}</p>
                </div>
                <Badge tone={trade.pnl >= 0 ? "emerald" : "rose"}>{formatNumber(trade.pnl)}</Badge>
              </div>
            ))}
            {analytics.bestTrades.length === 0 && analytics.worstTrades.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">Not enough matched buy/sell history to estimate trade-level PnL.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

