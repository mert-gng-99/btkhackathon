"use client";

import { useEffect, useState } from "react";
import type { StoredSession } from "@/types";

interface SessionState {
  session: StoredSession | null;
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  refresh: () => void;
}

export function useSessionData(): SessionState {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const id = window.localStorage.getItem("tradeAnalyticsSessionId");
    setSessionId(id);

    if (!id) {
      setLoading(false);
      setError("No analysis session found. Connect a read-only Binance key or load demo data.");
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/analytics/session/${id}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load session.");
        }
        setSession(payload.session);
      })
      .catch((fetchError: unknown) => {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load session.");
      })
      .finally(() => setLoading(false));
  }, [version]);

  return {
    session,
    loading,
    error,
    sessionId,
    refresh: () => setVersion((value) => value + 1)
  };
}

