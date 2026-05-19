"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

interface LoginCardProps {
  action: (formData: FormData) => Promise<void>;
  callbackUrl: string;
}

export function LoginCard({ action, callbackUrl }: LoginCardProps) {
  const t = useT();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  async function tryDemo() {
    setDemoLoading(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/demo/session", { method: "POST" });
      const payload = await res.json();
      if (!res.ok || !payload?.sessionId) {
        throw new Error(payload?.error ?? t.auth.demo.failed);
      }
      try {
        window.localStorage.setItem("tradeAnalyticsSessionId", payload.sessionId);
      } catch {
        // localStorage unavailable; cookie still gates middleware
      }
      router.push(callbackUrl || "/dashboard");
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : t.auth.demo.failed);
      setDemoLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
      <h1 className="text-2xl font-semibold text-white">{t.auth.welcome.title}</h1>
      <p className="mt-2 text-sm text-white/70">{t.auth.welcome.sub}</p>

      <form action={action} className="mt-6">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="h-5 w-5"
            aria-hidden
          >
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.2 4 9.4 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.1c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.3 39.6 16 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.1C39.3 36.4 44 30.8 44 24c0-1.2-.1-2.3-.4-3.5z"
            />
          </svg>
          {t.auth.welcome.continueWithGoogle}
        </button>
      </form>

      <div
        className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-white/40"
        aria-hidden
      >
        <span className="h-px flex-1 bg-white/10" />
        {t.auth.demo.divider}
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={tryDemo}
        disabled={demoLoading}
        className="inline-flex w-full flex-col items-center justify-center gap-0.5 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{demoLoading ? t.auth.demo.loading : t.auth.demo.tryDemo}</span>
        {!demoLoading && (
          <span className="text-[11px] font-normal text-white/50">{t.auth.demo.tryDemoSub}</span>
        )}
      </button>

      {demoError && (
        <p className="mt-3 text-center text-xs text-rose-300" role="alert">
          {demoError}
        </p>
      )}

      <p className="mt-6 text-center text-xs text-white/50">{t.auth.welcome.consent}</p>
    </div>
  );
}
