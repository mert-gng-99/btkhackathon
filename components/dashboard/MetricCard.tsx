import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
}

export function MetricCard({ label, value, detail, icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="numeric mt-2 text-2xl font-semibold text-white">{value}</p>
            {detail ? <p className="mt-1 text-sm text-slate-400">{detail}</p> : null}
          </div>
          {icon ? <div className="rounded-md border border-slate-800 bg-slate-900 p-2 text-cyan-200">{icon}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

