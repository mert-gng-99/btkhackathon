"use client";

import { useEffect, useState } from "react";
import { Database, Loader2, Radar, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { SessionGate } from "@/components/session/SessionGate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useSessionData } from "@/hooks/useSessionData";
import { formatPercent } from "@/lib/utils/numbers";
import type { PublicTraderProfile } from "@/types";

interface SimilarResponse {
  current: PublicTraderProfile;
  traders: PublicTraderProfile[];
  storage: "database" | "memory";
}

export function TraderDiscovery() {
  const { session, loading, error } = useSessionData();
  const [current, setCurrent] = useState<PublicTraderProfile | null>(null);
  const [traders, setTraders] = useState<PublicTraderProfile[]>([]);
  const [storage, setStorage] = useState<"database" | "memory">("memory");
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    const activeSession = session;

    async function loadSimilar() {
      setRegistryLoading(true);
      setRegistryError(null);

      try {
        const response = await fetch(`/api/traders/similar?sessionId=${encodeURIComponent(activeSession.id)}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as SimilarResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load similar traders.");
        }
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
    if (!session) {
      return;
    }

    setTraders((items) =>
      items.map((item) => (item.anonymousId === targetAnonymousId ? { ...item, followedByCurrentUser: true } : item))
    );

    const response = await fetch("/api/traders/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        targetAnonymousId
      })
    });

    if (!response.ok) {
      setTraders((items) =>
        items.map((item) => (item.anonymousId === targetAnonymousId ? { ...item, followedByCurrentUser: false } : item))
      );
    }
  }

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">
                <UsersRound className="mr-1 h-3 w-3" aria-hidden="true" />
                Anonymous trader network
              </Badge>
              <Badge tone={storage === "database" ? "emerald" : "amber"}>
                <Database className="mr-1 h-3 w-3" aria-hidden="true" />
                {storage === "database" ? "database storage" : "memory fallback"}
              </Badge>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">Find traders like you</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Your public peer profile stores only anonymous ratios and behavioral labels. It does not store API keys, raw trades,
              order IDs, timestamps, exact balances, or secrets.
            </p>
          </div>

          <div className="border-t border-slate-800 bg-slate-900/60 p-6 md:p-8 lg:border-l lg:border-t-0">
            {current ? (
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
                <ShieldCheck className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                <p className="mt-4 text-xs uppercase tracking-wide text-cyan-200/80">Your anonymous profile</p>
                <p className="mt-2 text-xl font-semibold text-white">{current.displayName}</p>
                <p className="mt-2 text-sm text-slate-300">{current.traderType}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <Metric label="Success" value={current.successRate === null ? "n/a" : formatPercent(current.successRate)} />
                  <Metric label="Rapid" value={formatPercent(current.rapidTradeRatio)} />
                  <Metric label="Night" value={formatPercent(current.lateNightRatio)} />
                  <Metric label="Top symbol" value={formatPercent(current.topSymbolShare)} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Registering anonymous profile...
              </div>
            )}
          </div>
        </div>
      </section>

      {registryError ? <div className="rounded-md border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{registryError}</div> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {registryLoading ? (
          <Card className="lg:col-span-3">
            <CardContent className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-200" aria-hidden="true" />
              Searching for similar anonymous traders...
            </CardContent>
          </Card>
        ) : null}

        {!registryLoading && traders.length === 0 ? (
          <Card className="lg:col-span-3">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-white">No similar peers yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  Your anonymous profile is registered. More users need to analyze trades before this network becomes useful.
                </p>
              </div>
              <Badge tone="slate">privacy-first MVP</Badge>
            </CardContent>
          </Card>
        ) : null}

        {traders.map((trader) => (
          <Card key={trader.anonymousId} className="overflow-hidden">
            <CardHeader className="bg-slate-900/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone="cyan">
                    <Radar className="mr-1 h-3 w-3" aria-hidden="true" />
                    {trader.similarityScore ?? 0}% match
                  </Badge>
                  <h2 className="mt-3 text-lg font-semibold text-white">{trader.displayName}</h2>
                  <p className="mt-1 text-sm text-slate-400">{trader.traderType}</p>
                </div>
                <Button
                  type="button"
                  variant={trader.followedByCurrentUser ? "secondary" : "primary"}
                  onClick={() => follow(trader.anonymousId)}
                  disabled={trader.followedByCurrentUser}
                  className="shrink-0"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {trader.followedByCurrentUser ? "Following" : "Follow"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric label="Success" value={trader.successRate === null ? "n/a" : formatPercent(trader.successRate)} />
                <Metric label="Buy ratio" value={formatPercent(trader.buyRatio)} />
                <Metric label="Rapid" value={formatPercent(trader.rapidTradeRatio)} />
                <Metric label="Late night" value={formatPercent(trader.lateNightRatio)} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Top symbols</p>
                <div className="flex flex-wrap gap-2">
                  {trader.topSymbols.map((symbol) => (
                    <Badge key={symbol} tone="slate">
                      {symbol}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Behavior tags</p>
                <div className="flex flex-wrap gap-2">
                  {trader.behavioralTags.slice(0, 5).map((tag) => (
                    <Badge key={tag} tone="amber">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
