"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FlaskConical, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const COMMON_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"];

export default function ConnectPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState(COMMON_SYMBOLS.slice(0, 5));
  const [lookbackDays, setLookbackDays] = useState(365);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const startTime = useMemo(() => Date.now() - lookbackDays * 24 * 60 * 60 * 1000, [lookbackDays]);

  function toggleSymbol(symbol: string) {
    setSelectedSymbols((current) => (current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol]));
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
      setStatus("Credentials are valid and no trading or withdrawal permission was detected.");
    } catch (validateError: unknown) {
      setError(validateError instanceof Error ? validateError.message : "Validation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function syncTrades() {
    setLoading(true);
    setError(null);
    setStatus(null);
    setWarnings([]);

    try {
      const response = await fetch("/api/binance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          symbols: selectedSymbols,
          startTime
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Sync failed.");
      }
      window.localStorage.setItem("tradeAnalyticsSessionId", payload.sessionId);
      setApiSecret("");
      setWarnings(payload.warnings ?? []);
      router.push("/dashboard");
    } catch (syncError: unknown) {
      setError(syncError instanceof Error ? syncError.message : "Sync failed.");
    } finally {
      setLoading(false);
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
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-5">
        <Badge tone="amber">Temporary session mode</Badge>
        <div>
          <h1 className="text-3xl font-semibold text-white">Connect Binance safely</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Create a Binance API key with read-only access. Disable trading, withdrawals, transfers, and any permission that can modify your account.
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-white">Security rules enforced by this app</h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
            {[
              "The secret is submitted only to backend API routes.",
              "The MVP does not store API keys or secrets.",
              "The backend rejects keys that appear to allow trading or withdrawals.",
              "The codebase contains no Binance order placement, withdrawal, transfer, or modifying endpoint."
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
              Never paste a Binance key with trading or withdrawal permissions. Delete and recreate the key if you are unsure.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Analyze once without saving keys</h2>
              <p className="mt-1 text-sm text-slate-500">Spot trades are fetched per selected symbol.</p>
            </div>
            <KeyRound className="h-5 w-5 text-cyan-200" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Input label="Binance API key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" />
          <Input
            label="Binance API secret"
            type="password"
            value={apiSecret}
            onChange={(event) => setApiSecret(event.target.value)}
            autoComplete="off"
            hint="This value is never sent back to the frontend after submission."
          />

          <Input
            label="Lookback days"
            type="number"
            min={7}
            max={3650}
            value={lookbackDays}
            onChange={(event) => setLookbackDays(Number(event.target.value))}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-200">Symbols to scan</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMBOLS.map((symbol) => {
                const selected = selectedSymbols.includes(symbol);
                return (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => toggleSymbol(symbol)}
                    className={`cursor-pointer rounded-md border px-3 py-2 text-xs font-medium transition-colors duration-200 ${
                      selected
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                        : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    {symbol}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div>
          ) : null}
          {status ? (
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
            <Button type="button" onClick={syncTrades} disabled={loading || !apiKey || !apiSecret || selectedSymbols.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
              Analyze
            </Button>
            <Button type="button" variant="ghost" onClick={loadDemo} disabled={loading}>
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
