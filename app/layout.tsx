import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { I18nProvider } from "@/lib/i18n";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "2BMTRADE — See how you really trade",
  description:
    "Safe, read-only Binance trade view with a smart AI coach. Spot, USD-M Futures, and COIN-M Futures."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrainsMono.variable}`}>
      <body>
        <I18nProvider defaultLocale="en">
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
