"use client";

import { SessionGate } from "@/components/session/SessionGate";
import { TradeTable } from "@/components/trades/TradeTable";
import { Card, CardContent } from "@/components/ui/Card";
import { useSessionData } from "@/hooks/useSessionData";
import { useT } from "@/lib/i18n";

export default function TradesPage() {
  const { session, loading, error } = useSessionData();
  const t = useT();

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  return (
    <>
      <section className="tl-hero">
        <span className="tl-eyebrow tl-eyebrow-cyan"><span className="tl-pulse" />{t.trades.badge}</span>
        <h1 className="tl-display">{t.trades.title}</h1>
        <p className="tl-sub">{t.trades.intro}</p>
      </section>

      {session.trades.length === 0 ? (
        <Card>
          <CardContent>
            <p style={{ fontSize: 14, color: "var(--tl-ink-2)" }}>{t.trades.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <TradeTable trades={session.trades} sessionId={session.id} />
      )}
    </>
  );
}
