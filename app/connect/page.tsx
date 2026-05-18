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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import type { MarketType, SyncJob } from "@/types";

const COMMON_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"];
const QUOTE_ASSETS = ["USDT", "USDC", "FDUSD", "BTC", "ETH", "BNB", "TRY", "EUR", "TUSD", "BUSD"];

type ScanMode = "selected" | "quoteAssets" | "all";

const SCAN_MODES: Array<{
  id: ScanMode;
  title: string;
  detail: string;
  meta: string;
  icon: typeof Gauge;
}> = [
  {
    id: "all",
    title: "Full market scan",
    detail: "Scans every discovered Spot/Futures symbol. Slowest, maximum coverage.",
    meta: "Best for complete history",
    icon: Radar
  },
  {
    id: "quoteAssets",
    title: "Broad quote scan",
    detail: "Fast scan using active Futures symbols, priority pairs, and selected quote assets.",
    meta: "Fast balanced mode",
    icon: Layers3
  },
  {
    id: "selected",
    title: "Quick selected scan",
    detail: "Scans only the symbols you pick below. Fast, but can miss past trades.",
    meta: "Fastest",
    icon: Gauge
  }
];

export default function ConnectPage() {
  const router = useRouter();
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
    scanMode === "all"
      ? "Full market scan is running. This can take a few minutes because Binance requires symbol-by-symbol trade queries."
      : scanMode === "quoteAssets"
        ? "Broad quote scan is running across discovered Spot/Futures symbols."
        : "Selected symbols are being scanned.";
  const progressPercent = syncJob && syncJob.progress.totalSymbols > 0 ? Math.round((syncJob.progress.scannedSymbols / syncJob.progress.totalSymbols) * 100) : 0;

  function toggleSymbol(symbol: string) {
    setSelectedSymbols((current) => (current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol]));
  }

  function toggleQuoteAsset(asset: string) {
    setQuoteAssets((current) => (current.includes(asset) ? current.filter((item) => item !== asset) : [...current, asset]));
  }

  function toggleMarket(market: MarketType) {
    setIncludeMarkets((current) => (current.includes(market) ? current.filter((item) => item !== market) : [...current, market]));
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
      if (!response.ok) {
        throw new Error(payload.error ?? "Validation failed.");
      }
      if (!payload.validation.isReadOnly) {
        throw new Error(payload.validation.blockers.join(" "));
      }
      setWarnings(payload.validation.warnings ?? []);
      setStatus(`Read-only permission confirmed. Enabled permissions: ${payload.validation.permissions.join(", ") || "Reading"}.`);
    } catch (validateError: unknown) {
      setError(validateError instanceof Error ? validateError.message : "Validation failed.");
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
      if (!response.ok) {
        throw new Error(payload.error ?? "Sync failed.");
      }
      await pollJob(payload.jobId);
    } catch (syncError: unknown) {
      setError(syncError instanceof Error ? syncError.message : "Sync failed.");
    } finally {
      setLoading(false);
    }
  }

  async function pollJob(jobId: string) {
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const response = await fetch(`/api/binance/sync/jobs/${jobId}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not read sync progress.");
      }

      const job = payload.job as SyncJob;
      setSyncJob(job);
      setWarnings(job.warnings ?? []);
      setStatus(job.progress.message);

      if (job.status === "failed") {
        throw new Error(job.error ?? "Sync failed.");
      }

      if (job.status === "completed") {
        if (!job.sessionId) {
          throw new Error("Sync completed without a session.");
        }
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
      if (!response.ok) {
        throw new Error(payload.error ?? "Demo failed.");
      }
      window.localStorage.setItem("tradeAnalyticsSessionId", payload.sessionId);
      router.push("/dashboard");
    } catch (demoError: unknown) {
      setError(demoError instanceof Error ? demoError.message : "Demo failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <Badge tone="amber">Temporary session mode</Badge>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Connect Binance safely</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Use a read-only Binance key to scan Spot, USD-M Futures, and COIN-M Futures history. The app only calls GET history endpoints; it never sends orders, transfers, or account changes.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Secret storage", "Not stored", ShieldCheck],
              ["Write actions", "Not implemented", DatabaseZap],
              ["Coverage", scanMode === "all" ? "Full scan" : scanMode === "quoteAssets" ? "Broad scan" : "Selected", Radar]
            ].map(([label, value, Icon]) => (
              <div key={label as string} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">{label as string}</p>
                <p className="mt-1 text-sm font-semibold text-white">{value as string}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-white">Security rules enforced by this app</h2>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
              {[
                "The secret is submitted only to backend API routes.",
                "The MVP does not store API keys or secrets.",
                "The backend checks Binance API restrictions and requires reading-only access.",
                "No Binance order placement, withdrawal, transfer, or modifying endpoint exists in the codebase."
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-400/25 bg-amber-400/10">
            <CardContent className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
              <p className="text-sm leading-6 text-amber-100">
                Binance Spot and Futures trade-list endpoints require symbol-by-symbol scans. Progress is shown while the job runs; Futures history is limited by Binance endpoint windows.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-slate-900/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Analyze once without saving keys</h2>
              <p className="mt-1 text-sm text-slate-500">Broad scan is selected by default for speed. Full scan is available when you need exhaustive coverage.</p>
              </div>
              <KeyRound className="h-6 w-6 text-cyan-200" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Binance API key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" />
              <Input
                label="Binance API secret"
                type="password"
                value={apiSecret}
                onChange={(event) => setApiSecret(event.target.value)}
                autoComplete="off"
                hint="Never returned to the frontend after submission."
              />
            </div>

            <Input
              label="Lookback days"
              type="number"
              min={7}
              max={3650}
              value={lookbackDays}
              onChange={(event) => setLookbackDays(Number(event.target.value))}
              hint="Spot can scan long ranges. USD-M Futures user trade history is limited by Binance to the past 6 months."
            />

            <div>
              <p className="mb-3 text-sm font-medium text-slate-200">Markets to include</p>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["spot", "Spot", "Historical spot fills and fees"],
                  ["um_futures", "USD-M Futures", "USDT/USDC margined futures fills and realized PnL"],
                  ["coin_futures", "COIN-M Futures", "Coin-margined futures fills and realized PnL"]
                ].map(([id, label, detail]) => {
                  const selected = includeMarkets.includes(id as MarketType);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleMarket(id as MarketType)}
                      className={cn(
                        "cursor-pointer rounded-lg border p-4 text-left transition-colors duration-200",
                        selected
                          ? "border-amber-400/50 bg-amber-400/10 text-white"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white"
                      )}
                    >
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-slate-200">Scan coverage</p>
              <div className="grid gap-3 lg:grid-cols-3">
                {SCAN_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const selected = scanMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setScanMode(mode.id)}
                      className={cn(
                        "cursor-pointer rounded-lg border p-4 text-left transition-colors duration-200",
                        selected
                          ? "border-cyan-400/60 bg-cyan-400/10 text-white"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Icon className={cn("h-5 w-5", selected ? "text-cyan-200" : "text-slate-500")} aria-hidden="true" />
                        <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", selected ? "bg-cyan-400/15 text-cyan-100" : "bg-slate-900 text-slate-500")}>
                          {mode.meta}
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-semibold">{mode.title}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{mode.detail}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-200">Quote assets for broad scan</p>
                <div className="flex flex-wrap gap-2">
                  {QUOTE_ASSETS.map((asset) => {
                    const selected = quoteAssets.includes(asset);
                    return (
                      <button
                        key={asset}
                        type="button"
                        onClick={() => toggleQuoteAsset(asset)}
                        className={cn(
                          "cursor-pointer rounded-md border px-3 py-2 text-xs font-medium transition-colors duration-200",
                          selected
                            ? "border-amber-400/50 bg-amber-400/10 text-amber-100"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white"
                        )}
                      >
                        {asset}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-200">Priority symbols</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMBOLS.map((symbol) => {
                    const selected = selectedSymbols.includes(symbol);
                    return (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() => toggleSymbol(symbol)}
                        className={cn(
                          "cursor-pointer rounded-md border px-3 py-2 text-xs font-medium transition-colors duration-200",
                          selected
                            ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white"
                        )}
                      >
                        {symbol}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                <div className="flex items-start gap-3">
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{syncJob?.progress.message ?? loadingCopy}</p>
                    {syncJob ? (
                      <p className="mt-1 text-xs text-cyan-100/75">
                        {syncJob.progress.scannedSymbols}/{syncJob.progress.totalSymbols || "..."} symbols · {syncJob.progress.symbolsWithTrades} symbols with trades · {syncJob.progress.tradesFound} trades found
                        {syncJob.progress.currentSymbol ? ` · Current: ${syncJob.progress.currentSymbol}` : ""}
                      </p>
                    ) : null}
                  </div>
                  {syncJob ? <span className="numeric text-sm font-semibold">{progressPercent}%</span> : null}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            ) : null}
            {error ? <div className="rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
            {status && !loading ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {status}
              </div>
            ) : null}
            {warnings.map((warning) => (
              <div key={warning} className="rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                {warning}
              </div>
            ))}

            <div className="grid gap-3 sm:grid-cols-3">
              <Button type="button" variant="secondary" onClick={validateOnly} disabled={loading || !apiKey || !apiSecret}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                Validate
              </Button>
              <Button type="button" onClick={syncTrades} disabled={loading || !apiKey || !apiSecret || includeMarkets.length === 0 || (scanMode === "selected" && selectedSymbols.length === 0)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                Analyze
              </Button>
              <Button type="button" variant="ghost" onClick={loadDemo} disabled={loading}>
                <FlaskConical className="h-4 w-4" aria-hidden="true" />
                Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
