"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, BrainCircuit, ListFilter, LockKeyhole, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/connect", label: "Connect", icon: LockKeyhole },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/trades", label: "Trades", icon: ListFilter },
  { href: "/insights", label: "Insights", icon: ShieldCheck },
  { href: "/ai-coach", label: "AI Coach", icon: BrainCircuit }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/82 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/" className="flex cursor-pointer items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-400/30 bg-amber-400/10">
              <ShieldCheck className="h-5 w-5 text-amber-300" aria-hidden="true" />
            </span>
              <span>
              <span className="block text-sm font-semibold text-white">ReadOnly Alpha</span>
              <span className="block text-xs text-slate-500">Spot & Futures analytics</span>
            </span>
          </Link>

          <nav className="flex gap-1 overflow-x-auto pb-1 lg:pb-0" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors duration-200 hover:bg-slate-800 hover:text-white",
                    active && "bg-slate-800 text-white"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
