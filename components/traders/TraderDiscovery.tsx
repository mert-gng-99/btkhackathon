"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, Radar, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { SessionGate } from "@/components/session/SessionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useSessionData } from "@/hooks/useSessionData";
import { useT } from "@/lib/i18n";
import { formatPercent } from "@/lib/utils/numbers";
import type { PublicTraderProfile } from "@/types";

interface SimilarResponse {
  current: PublicTraderProfile;
  traders: PublicTraderProfile[];
  storage: "database" | "memory";
}

export function TraderDiscovery() {
  const { session, loading, error } = useSessionData();
  const t = useT();
  const [current, setCurrent] = useState<PublicTraderProfile | null>(null);
  const [traders, setTraders] = useState<PublicTraderProfile[]>([]);
  const [storage, setStorage] = useState<"database" | "memory">("memory");
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const activeSession = session;

    async function loadSimilar() {
      setRegistryLoading(true);
      setRegistryError(null);
      try {
        const response = await fetch(`/api/traders/similar?sessionId=${encodeURIComponent(activeSession.id)}`, { cache: "no-store" });
        const payload = (await response.json()) as SimilarResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Failed to load similar traders.");
        setCurrent(payload.current);
        setTraders(payload.traders);
        setStorage(payload.storage);
      } catch (registryLoadError: unknown) {
        setRegistryError(registryLoadError instanceof Error ? registryLoadError.message : "Failed to load similar traders.");
      } finally {
        setRegistryLoading(false);
      }
    }

    void loadSimilar();
  }, [session]);

  async function follow(targetAnonymousId: string) {
    if (!session) return;
    setTraders((items) => items.map((item) => (item.anonymousId === targetAnonymousId ? { ...item, followedByCurrentUser: true } : item)));
    const response = await fetch("/api/traders/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, targetAnonymousId })
    });
    if (!response.ok) {
      setTraders((items) => items.map((item) => (item.anonymousId === targetAnonymousId ? { ...item, followedByCurrentUser: false } : item)));
    }
  }

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  return (
    <>
      <section className="tl-card" style={{ overflow: "hidden" }}>
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Badge tone="cyan">
                <UsersRound className="h-3 w-3" aria-hidden="true" />
                {t.traders.badge}
              </Badge>
              <Badge tone={storage === "database" ? "emerald" : "amber"}>
                <Database className="h-3 w-3" aria-hidden="true" />
                {storage === "database" ? t.traders.storage.db : t.traders.storage.memory}
              </Badge>
            </div>
            <h1 className="tl-display" style={{ marginTop: 18, fontSize: "clamp(28px, 4vw, 48px)" }}>{t.traders.title}</h1>
            <p className="tl-sub" style={{ marginTop: 12 }}>{t.traders.intro}</p>
          </div>

          <div
            style={{ padding: 24, borderTop: "1px solid var(--tl-line)", background: "rgba(255, 255, 255, 0.018)" }}
            className="lg:border-l lg:border-t-0"
          >
            {current ? (
              <div className="tl-panel tl-tone-cyan">
                <ShieldCheck className="h-5 w-5" style={{ color: "var(--tl-cyan)" }} aria-hidden="true" />
                <p className="tl-label-mono" style={{ marginTop: 12, color: "rgba(91, 224, 230, 0.85)" }}>{t.traders.yourProfile}</p>
                <p style={{ marginTop: 6, fontSize: 19, fontWeight: 600, color: "var(--tl-ink)" }}>{current.displayName}</p>
                <p style={{ marginTop: 4, fontSize: 13, color: "var(--tl-ink-2)" }}>{current.traderType}</p>
                <div className="grid grid-cols-2 gap-2" style={{ marginTop: 14 }}>
                  <Metric label={t.traders.metrics.success} value={current.successRate === null ? "n/a" : formatPercent(current.successRate)} />
                  <Metric label={t.traders.metrics.rapid} value={formatPercent(current.rapidTradeRatio)} />
                  <Metric label={t.traders.metrics.night} value={formatPercent(current.lateNightRatio)} />
                  <Metric label={t.traders.metrics.topSymbol} value={formatPercent(current.topSymbolShare)} />
                </div>
              </div>
            ) : (
              <div className="tl-notice tl-notice-cyan">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>{t.traders.registering}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {registryError ? <div className="tl-notice tl-notice-red">{registryError}</div> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {registryLoading ? (
          <Card className="lg:col-span-3">
            <CardContent>
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--tl-ink-2)" }}>
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tl-cyan)" }} aria-hidden="true" />
                <span>{t.traders.searching}</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!registryLoading && traders.length === 0 ? (
          <Card className="lg:col-span-3">
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p style={{ fontWeight: 600, color: "var(--tl-ink)" }}>{t.traders.none.title}</p>
                  <p style={{ marginTop: 4, fontSize: 13, color: "var(--tl-ink-3)" }}>{t.traders.none.body}</p>
                </div>
                <Badge tone="slate">{t.traders.privacyTag}</Badge>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {traders.map((trader) => (
          <Card key={trader.anonymousId}>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <Badge tone="cyan">
                    <Radar className="h-3 w-3" aria-hidden="true" />
                    {t.traders.match(trader.similarityScore ?? 0)}
                  </Badge>
                  <h2 className="tl-subheading" style={{ marginTop: 10 }}>{trader.displayName}</h2>
                  <p style={{ marginTop: 4, fontSize: 13, color: "var(--tl-ink-3)" }}>{trader.traderType}</p>
                </div>
                <Button
                  variant={trader.followedByCurrentUser ? "secondary" : "primary"}
                  onClick={() => follow(trader.anonymousId)}
                  disabled={trader.followedByCurrentUser}
                  style={{ flexShrink: 0 }}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {trader.followedByCurrentUser ? t.traders.following : t.traders.follow}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label={t.traders.metrics.success} value={trader.successRate === null ? "n/a" : formatPercent(trader.successRate)} />
                  <Metric label={t.traders.metrics.buyRatio} value={formatPercent(trader.buyRatio)} />
                  <Metric label={t.traders.metrics.rapid} value={formatPercent(trader.rapidTradeRatio)} />
                  <Metric label={t.traders.metrics.lateNight} value={formatPercent(trader.lateNightRatio)} />
                </div>

                <div>
                  <p className="tl-label-mono" style={{ marginBottom: 8 }}>{t.traders.topSymbols}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {trader.topSymbols.map((symbol) => (
                      <Badge key={symbol} tone="slate">{symbol}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="tl-label-mono" style={{ marginBottom: 8 }}>{t.traders.behaviorTags}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {trader.behavioralTags.slice(0, 5).map((tag) => (
                      <Badge key={tag} tone="amber">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid var(--tl-line)",
        background: "rgba(6, 10, 20, 0.5)"
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--tl-ink-3)" }}>{label}</p>
      <p style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "var(--tl-ink)" }}>{value}</p>
    </div>
  );
}
