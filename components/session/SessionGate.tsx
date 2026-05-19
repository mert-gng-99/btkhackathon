"use client";

import Link from "next/link";
import { Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useT } from "@/lib/i18n";

interface SessionGateProps {
  loading: boolean;
  error: string | null;
}

export function SessionGate({ loading, error }: SessionGateProps) {
  const t = useT();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--tl-ink-2)" }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tl-cyan)" }} aria-hidden="true" />
            <span>{t.sessionGate.loading}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p style={{ fontWeight: 600, color: "var(--tl-ink)" }}>{t.sessionGate.noSession}</p>
              <p style={{ marginTop: 4, fontSize: 13, color: "var(--tl-ink-3)" }}>{error}</p>
            </div>
            <Link href="/connect">
              <Button>
                <PlugZap className="h-4 w-4" aria-hidden="true" />
                {t.sessionGate.connectCta}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
