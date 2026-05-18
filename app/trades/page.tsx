"use client";

import { SessionGate } from "@/components/session/SessionGate";
import { TradeTable } from "@/components/trades/TradeTable";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useSessionData } from "@/hooks/useSessionData";

export default function TradesPage() {
  const { session, loading, error } = useSessionData();

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge tone="cyan">Normalized Binance Spot fills</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-white">Trade list</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Search, filter, sort, and export every trade fetched for this temporary session.
        </p>
      </div>
      {session.trades.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-slate-400">No trades were found for the selected symbols and lookback period.</CardContent>
        </Card>
      ) : (
        <TradeTable trades={session.trades} sessionId={session.id} />
      )}
    </div>
  );
}

