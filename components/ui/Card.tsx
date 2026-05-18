import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: "default" | "cyan" | "amber" | "green" | "red" | "violet";
}

const toneRing: Record<NonNullable<CardProps["tone"]>, string> = {
  default: "",
  cyan: "ring-1 ring-[rgba(91,224,230,0.22)]",
  amber: "ring-1 ring-[rgba(245,181,68,0.25)]",
  green: "ring-1 ring-[rgba(91,213,160,0.25)]",
  red: "ring-1 ring-[rgba(255,107,107,0.28)]",
  violet: "ring-1 ring-[rgba(183,156,255,0.28)]"
};

export function Card({ className, children, tone = "default", ...props }: CardProps) {
  return (
    <div className={cn("tl-card", toneRing[tone], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("tl-card-header", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("tl-card-body", className)} {...props}>
      {children}
    </div>
  );
}
