"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, BrainCircuit, ListFilter, LockKeyhole, Menu, ShieldCheck, UsersRound, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const navIcons = {
  connect: LockKeyhole,
  dashboard: BarChart3,
  trades: ListFilter,
  insights: ShieldCheck,
  aiCoach: BrainCircuit,
  traders: UsersRound
} as const;

const navOrder: Array<{ href: string; key: keyof typeof navIcons }> = [
  { href: "/connect", key: "connect" },
  { href: "/dashboard", key: "dashboard" },
  { href: "/trades", key: "trades" },
  { href: "/insights", key: "insights" },
  { href: "/ai-coach", key: "aiCoach" },
  { href: "/traders", key: "traders" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { locale, toggleLocale, dict } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <header>
        <div className="tl-topbar">
          <Link href="/" className="tl-brand" aria-label={dict.common.appName}>
            <span className="tl-brand-mark" aria-hidden="true" />
            <span>{dict.common.appName}</span>
            <span className="tl-brand-meta">{dict.common.version}</span>
          </Link>

          <nav className="tl-topnav" aria-label="Main">
            {navOrder.map(({ href, key }) => {
              const Icon = navIcons[key];
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={active ? "active" : ""}>
                  <Icon className="tl-topnav-icon" aria-hidden="true" />
                  {dict.nav[key]}
                </Link>
              );
            })}
          </nav>

          <div className="tl-top-actions">
            <button
              type="button"
              className="tl-lang-toggle"
              onClick={toggleLocale}
              aria-label={dict.language.toggleLabel}
              title={dict.language.toggleLabel}
            >
              <span className={locale === "en" ? "tl-lang-active" : ""}>{dict.language.short.en}</span>
              <span aria-hidden="true">·</span>
              <span className={locale === "tr" ? "tl-lang-active" : ""}>{dict.language.short.tr}</span>
            </button>

            <button
              type="button"
              className="tl-mobile-menu-btn"
              aria-label="Menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <nav className="tl-mobile-nav" aria-label="Mobile">
            {navOrder.map(({ href, key }) => {
              const Icon = navIcons[key];
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={active ? "active" : ""} onClick={() => setMobileOpen(false)}>
                  <Icon className="tl-topnav-icon" aria-hidden="true" />
                  {dict.nav[key]}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main className="tl-main">
        <div className="tl-grid-overlay" aria-hidden="true" />
        <div className="tl-content">{children}</div>
      </main>
    </div>
  );
}
