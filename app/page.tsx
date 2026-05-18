import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, DatabaseZap, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

const features = [
  {
    title: "Read-only by design",
    description: "The backend validates Binance permissions and implements no trading, withdrawal, transfer, or account-modifying endpoints.",
    icon: ShieldCheck
  },
  {
    title: "Temporary session analysis",
    description: "Secrets are used only server-side for sync and are discarded. The MVP stores trades under a short-lived session.",
    icon: LockKeyhole
  },
  {
    title: "Behavior analytics",
    description: "Trade frequency, fees, timing, symbol concentration, buy/sell split, and estimated Spot PnL are summarized.",
    icon: BarChart3
  },
  {
    title: "Grounded AI coach",
    description: "The assistant answers from retrieved trade summaries, analytics chunks, and later your local RAG materials.",
    icon: BrainCircuit
  }
];

export default function LandingPage() {
  return (
    <div className="space-y-12">
      <section className="grid gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-6">
          <Badge tone="amber">Binance Spot read-only analytics</Badge>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Secure trade behavior analytics for crypto traders.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Connect a read-only Binance API key, fetch Spot trade history, and review your behavior with metrics, charts, evidence-backed insights, and a grounded AI trade coach.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/connect"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-amberTrust px-5 py-3 text-sm font-semibold text-slate-950 transition-colors duration-200 hover:bg-amber-300"
            >
              Analyze my trades
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/ai-coach"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-100 transition-colors duration-200 hover:border-cyanData hover:text-cyan-100"
            >
              View AI Coach
              <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-400">Example dashboard</p>
                <p className="mt-1 text-2xl font-semibold text-white">144 trades analyzed</p>
              </div>
              <Badge tone="emerald">No trading access</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Volume", "92.4K"],
                ["Fees", "81.7"],
                ["Rapid trades", "41"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="numeric mt-2 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="h-48 rounded-md border border-slate-800 bg-slate-900 p-4">
              <div className="flex h-full items-end gap-2">
                {[26, 42, 34, 64, 52, 88, 58, 74, 40, 68, 93, 61].map((height, index) => (
                  <div key={index} className="flex flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-cyan-500 to-amber-300"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-amber-400/20 bg-amber-400/10 p-4">
                <KeyRound className="h-5 w-5 text-amber-200" aria-hidden="true" />
                <p className="mt-3 text-sm text-amber-100">Use a Binance key with read-only permissions only.</p>
              </div>
              <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-4">
                <DatabaseZap className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                <p className="mt-3 text-sm text-cyan-100">RAG chunks cite symbols, periods, fees, and trade patterns.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardContent>
                <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                <h2 className="mt-4 text-base font-semibold text-white">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

