import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: ReactNode;
  tone?: "amber" | "cyan" | "emerald" | "rose" | "slate" | "violet";
  className?: string;
}

const toneClass: Record<NonNullable<BadgeProps["tone"]>, string> = {
  amber: "tl-chip tl-chip-amber",
  cyan: "tl-chip tl-chip-cyan",
  emerald: "tl-chip tl-chip-green",
  rose: "tl-chip tl-chip-red",
  slate: "tl-chip",
  violet: "tl-chip tl-chip-violet"
};

export function Badge({ children, tone = "slate", className }: BadgeProps) {
  return <span className={cn(toneClass[tone], className)}>{children}</span>;
}
