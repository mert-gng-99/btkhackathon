import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "cyan" | "amber" | "emerald" | "rose" | "slate";
}

export function MetricCard({ label, value, detail, icon, tone = "cyan" }: MetricCardProps) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    slate: "border-slate-700 bg-slate-900 text-slate-300"
  };

  return (
    <Card className="transition-colors duration-200 hover:border-slate-700">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="numeric mt-2 text-2xl font-semibold text-white">{value}</p>
            {detail ? <p className="mt-1 truncate text-sm text-slate-400">{detail}</p> : null}
          </div>
          {icon ? <div className={cn("shrink-0 rounded-md border p-2", tones[tone])}>{icon}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
