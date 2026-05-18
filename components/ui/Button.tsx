"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
}

export function Button({ className, variant = "primary", children, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-amberTrust text-slate-950 hover:bg-amber-300 focus:ring-amberTrust",
    secondary: "border border-slate-700 bg-slate-900/75 text-slate-100 hover:border-cyanData hover:text-cyan-100 focus:ring-cyanData",
    ghost: "text-slate-300 hover:bg-slate-800/80 hover:text-white focus:ring-slate-500",
    danger: "bg-roseRisk text-slate-950 hover:bg-rose-300 focus:ring-roseRisk"
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

