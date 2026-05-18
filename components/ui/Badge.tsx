import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: ReactNode;
  tone?: "amber" | "cyan" | "emerald" | "rose" | "slate";
  className?: string;
}

export function Badge({ children, tone = "slate", className }: BadgeProps) {
  const tones = {
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    slate: "border-slate-700 bg-slate-900 text-slate-300"
  };

  return <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

