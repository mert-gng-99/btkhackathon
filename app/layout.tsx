import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { SessionProviderWrapper } from "@/components/auth/SessionProviderWrapper";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

const themeBootstrap = `(function(){try{var t=localStorage.getItem('tradeAnalyticsTheme');if(t==='sand'){document.documentElement.setAttribute('data-theme','sand');}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <SessionProviderWrapper>
          <I18nProvider defaultLocale="en">
            <ThemeProvider defaultTheme="cinematic">
              <AppShell>{children}</AppShell>
            </ThemeProvider>
          </I18nProvider>
        </SessionProviderWrapper>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
