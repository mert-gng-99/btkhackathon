"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  FlaskConical,
  Gauge,
  KeyRound,
  Layers3,
  Loader2,
  Radar,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { ConnectKeyScene } from "@/components/scenes/ConnectKeyScene";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/i18n";
import type { MarketType, SyncJob } from "@/types";

const COMMON_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"];
const QUOTE_ASSETS = ["USDT", "USDC", "FDUSD", "BTC", "ETH", "BNB", "TRY", "EUR", "TUSD", "BUSD"];

type ScanMode = "selected" | "quoteAssets" | "all";

export default function ConnectPage() {
  const router = useRouter();
  const t = useT();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState(COMMON_SYMBOLS.slice(0, 5));
  const [quoteAssets, setQuoteAssets] = useState(QUOTE_ASSETS.slice(0, 8));
  const [scanMode, setScanMode] = useState<ScanMode>("quoteAssets");
  const [includeMarkets, setIncludeMarkets] = useState<MarketType[]>(["spot", "um_futures"]);
  const [lookbackDays, setLookbackDays] = useState(3650);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null);

  const startTime = useMemo(() => Date.now() - lookbackDays * 24 * 60 * 60 * 1000, [lookbackDays]);

  const loadingCopy =
    scanMode === "all" ? t.connect.form.loadingAll : scanMode === "quoteAssets" ? t.connect.form.loadingQuote : t.connect.form.loadingSelected;
  const progressPercent =
    syncJob && syncJob.progress.totalSymbols > 0
      ? Math.round((syncJob.progress.scannedSymbols / syncJob.progress.totalSymbols) * 100)
      : 0;

  const SCAN_MODES = [
    { id: "all" as const, ...t.connect.form.scanModes.all, icon: Radar },
    { id: "quoteAssets" as const, ...t.connect.form.scanModes.quote, icon: Layers3 },
    { id: "selected" as const, ...t.connect.form.scanModes.selected, icon: Gauge }
  ];

  function toggleSymbol(symbol: string) {
    setSelectedSymbols((current) =>
      current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol]
    );
  }

  function toggleQuoteAsset(asset: string) {
    setQuoteAssets((current) =>
      current.includes(asset) ? current.filter((item) => item !== asset) : [...current, asset]
    );
  }

  function toggleMarket(market: MarketType) {
    setIncludeMarkets((current) =>
      current.includes(market) ? current.filter((item) => item !== market) : [...current, market]
    );
  }

  async function validateOnly() {
    setLoading(true);
    setError(null);
    setStatus(null);
    setWarnings([]);
    try {
      const response = await fetch("/api/binance/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t.errors.validationFailed);
      if (!payload.validation.isReadOnly) throw new Error(payload.validation.blockers.join(" "));
      setWarnings(payload.validation.warnings ?? []);
      setStatus(t.connect.form.validated((payload.validation.permissions ?? []).join(", ")));
    } catch (validateError: unknown) {
      setError(validateError instanceof Error ? validateError.message : t.errors.validationFailed);
    } finally {
      setLoading(false);
    }
  }

  async function syncTrades() {
    setLoading(true);
    setError(null);
    setStatus(loadingCopy);
    setWarnings([]);
    setSyncJob(null);

    try {
      const response = await fetch("/api/binance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          scanMode,
          includeMarkets,
          quoteAssets,
          symbols: selectedSymbols,
          startTime
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t.errors.syncFailed);
      await pollJob(payload.jobId);
    } catch (syncError: unknown) {
      setError(syncError instanceof Error ? syncError.message : t.errors.syncFailed);
    } finally {
      setLoading(false);
    }
  }

  async function pollJob(jobId: string) {
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const response = await fetch(`/api/binance/sync/jobs/${jobId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t.errors.syncProgressRead);

      const job = payload.job as SyncJob;
      setSyncJob(job);
      setWarnings(job.warnings ?? []);
      setStatus(job.progress.message);

      if (job.status === "failed") throw new Error(job.error ?? t.errors.syncFailed);
      if (job.status === "completed") {
        if (!job.sessionId) throw new Error(t.errors.syncNoSession);
        window.localStorage.setItem("tradeAnalyticsSessionId", job.sessionId);
        setApiSecret("");
        router.push("/dashboard");
        return;
      }
    }
  }

  async function loadDemo() {
    setLoading(true);
    setError(null);
    setStatus(null);
    setWarnings([]);
    try {
      const response = await fetch("/api/demo/session", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? t.errors.demoFailed);
      window.localStorage.setItem("tradeAnalyticsSessionId", payload.sessionId);
      router.push("/dashboard");
    } catch (demoError: unknown) {
      setError(demoError instanceof Error ? demoError.message : t.errors.demoFailed);
    } finally {
      setLoading(false);
    }
  }

  const coverageValue =
    scanMode === "all" ? t.connect.summary.coverageAll : scanMode === "quoteAssets" ? t.connect.summary.coverageQuote : t.connect.summary.coverageSelected;

  return (
    <>
      <PageHero
        eyebrow={t.connect.badge}
        title={t.connect.title}
        sub={t.connect.intro}
        scene={<ConnectKeyScene />}
        sceneLabel={t.home.security.keyCard.loopName}
        sceneRight="00:04 / 00:08"
        eyebrowTone="green"
      />

      <section data-reveal className="tl-reveal grid gap-4 sm:grid-cols-3">
        {[
          { label: t.connect.summary.storage, value: t.connect.summary.storageValue, Icon: ShieldCheck },
          { label: t.connect.summary.writeActions, value: t.connect.summary.writeActionsValue, Icon: DatabaseZap },
          { label: t.connect.summary.coverage, value: coverageValue, Icon: Radar }
        ].map(({ label, value, Icon }) => (
          <div key={label} className="tl-card tl-card-pad" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span className="tl-tone-cyan" style={{ padding: 8, borderRadius: 10, border: "1px solid var(--tl-line-strong)" }}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div style={{ minWidth: 0 }}>
              <p className="tl-label-mono">{label}</p>
              <p style={{ marginTop: 4, fontSize: 15, fontWeight: 600, color: "var(--tl-ink)" }}>{value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <h2 className="tl-card-title">{t.connect.rulesTitle}</h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {t.connect.rules.map((item) => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <ShieldCheck className="h-4 w-4" style={{ marginTop: 3, color: "var(--tl-green)" }} aria-hidden="true" />
                    <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--tl-ink-2)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="tl-notice tl-notice-amber" role="status">
            <AlertTriangle className="h-5 w-5" style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{t.connect.warning}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 className="tl-card-title">{t.connect.form.heading}</h2>
                <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.connect.form.sub}</p>
              </div>
              <span className="tl-tone-cyan" style={{ padding: 8, borderRadius: 10, border: "1px solid var(--tl-line-strong)" }}>
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label={t.connect.form.apiKey} value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" />
                <Input
                  label={t.connect.form.apiSecret}
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  autoComplete="off"
                  hint={t.connect.form.apiSecretHint}
                />
              </div>

              <Input
                label={t.connect.form.lookback}
                type="number"
                min={7}
                max={3650}
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                hint={t.connect.form.lookbackHint}
              />

              <div>
                <p className="tl-label-mono" style={{ marginBottom: 10 }}>{t.connect.form.marketsLabel}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { id: "spot" as MarketType, label: t.connect.form.markets.spot, detail: t.connect.form.markets.spotDetail },
                    { id: "um_futures" as MarketType, label: t.connect.form.markets.umFutures, detail: t.connect.form.markets.umFuturesDetail },
                    { id: "coin_futures" as MarketType, label: t.connect.form.markets.coinFutures, detail: t.connect.form.markets.coinFuturesDetail }
                  ].map(({ id, label, detail }) => {
                    const selected = includeMarkets.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleMarket(id)}
                        className={cn("tl-select-card", selected && "is-active-amber")}
                      >
                        <p className="tl-select-card-title">{label}</p>
                        <p className="tl-select-card-detail">{detail}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="tl-label-mono" style={{ marginBottom: 10 }}>{t.connect.form.scanCoverage}</p>
                <div className="grid gap-3 lg:grid-cols-3">
                  {SCAN_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const selected = scanMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setScanMode(mode.id)}
                        className={cn("tl-select-card", selected && "is-active-cyan")}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <Icon className="h-5 w-5" style={{ color: selected ? "var(--tl-cyan)" : "var(--tl-ink-3)" }} aria-hidden="true" />
                          <span className="tl-select-card-meta">{mode.meta}</span>
                        </div>
                        <p className="tl-select-card-title" style={{ marginTop: 12 }}>{mode.title}</p>
                        <p className="tl-select-card-detail">{mode.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <p className="tl-label-mono" style={{ marginBottom: 8 }}>{t.connect.form.quoteAssetsLabel}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {QUOTE_ASSETS.map((asset) => {
                      const selected = quoteAssets.includes(asset);
                      return (
                        <button
                          key={asset}
                          type="button"
                          onClick={() => toggleQuoteAsset(asset)}
                          className={cn("tl-chip", selected && "tl-chip-amber")}
                          style={{ cursor: "pointer", padding: "6px 12px", fontSize: 12 }}
                        >
                          {asset}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="tl-label-mono" style={{ marginBottom: 8 }}>{t.connect.form.prioritySymbols}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {COMMON_SYMBOLS.map((symbol) => {
                      const selected = selectedSymbols.includes(symbol);
                      return (
                        <button
                          key={symbol}
                          type="button"
                          onClick={() => toggleSymbol(symbol)}
                          className={cn("tl-chip", selected && "tl-chip-cyan")}
                          style={{ cursor: "pointer", padding: "6px 12px", fontSize: 12 }}
                        >
                          {symbol}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="tl-notice tl-notice-cyan">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600 }}>{syncJob?.progress.message ?? loadingCopy}</p>
                    {syncJob ? (
                      <p style={{ marginTop: 4, fontSize: 12, color: "rgba(199, 244, 247, 0.75)" }}>
                        {t.connect.form.jobBadge(
                          syncJob.progress.scannedSymbols,
                          syncJob.progress.totalSymbols || "...",
                          syncJob.progress.symbolsWithTrades,
                          syncJob.progress.tradesFound,
                          syncJob.progress.currentSymbol ?? undefined
                        )}
                      </p>
                    ) : null}
                    <div className="tl-progress" style={{ marginTop: 12 }}>
                      <div className="tl-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  {syncJob ? <span className="tl-numeric" style={{ fontWeight: 600, fontSize: 14, color: "var(--tl-amber)" }}>{progressPercent}%</span> : null}
                </div>
              ) : null}

              {error ? <div className="tl-notice tl-notice-red">{error}</div> : null}
              {status && !loading ? (
                <div className="tl-notice tl-notice-green">
                  <CheckCircle2 className="h-4 w-4" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
                  <span>{status}</span>
                </div>
              ) : null}
              {warnings.map((warning) => (
                <div key={warning} className="tl-notice tl-notice-amber">
                  {warning}
                </div>
              ))}

              <div className="grid gap-3 sm:grid-cols-3">
                <Button variant="secondary" onClick={validateOnly} disabled={loading || !apiKey || !apiSecret}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                  {t.connect.form.validate}
                </Button>
                <Button
                  onClick={syncTrades}
                  disabled={
                    loading ||
                    !apiKey ||
                    !apiSecret ||
                    includeMarkets.length === 0 ||
                    (scanMode === "selected" && selectedSymbols.length === 0)
                  }
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  {t.connect.form.analyze}
                </Button>
                <Button variant="ghost" onClick={loadDemo} disabled={loading}>
                  <FlaskConical className="h-4 w-4" aria-hidden="true" />
                  {t.connect.form.demo}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
