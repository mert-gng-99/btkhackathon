"use client";

import { PageHero } from "@/components/layout/PageHero";
import { TradeFlowScene } from "@/components/scenes/TradeFlowScene";
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
      <PageHero
        eyebrow={t.trades.badge}
        title={t.trades.title}
        sub={t.trades.intro}
        scene={<TradeFlowScene />}
        sceneLabel="trade-flow.loop"
        sceneRight={`${session.trades.length} ${t.symbolIntel.trades}`}
        eyebrowTone="cyan"
      />

      {session.trades.length === 0 ? (
        <Card data-reveal className="tl-reveal">
          <CardContent>
            <p style={{ fontSize: 14, color: "var(--tl-ink-2)" }}>{t.trades.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div data-reveal className="tl-reveal">
          <TradeTable trades={session.trades} sessionId={session.id} />
        </div>
      )}
    </>
  );
}
