"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n";
import type { TraderProfile } from "@/types";

interface TraderProfileCardProps {
  sessionId: string;
}

export function TraderProfileCard({ sessionId }: TraderProfileCardProps) {
  const t = useT();
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [configured, setConfigured] = useState(false);
  const [cached, setCached] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageKey = `trader-profile:${sessionId}`;

  async function loadProfile(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sessionId, ...(refresh ? { refresh: "1" } : {}) });
      const response = await fetch(`/api/insights/trader-profile?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Trader profile generation failed.");
      setConfigured(Boolean(payload.configured));
      setCached(Boolean(payload.cached));
      setGeneratedAt(typeof payload.generatedAt === "string" ? payload.generatedAt : null);
      setProfile(payload.profile);
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          configured: Boolean(payload.configured),
          cached: true,
          generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : null,
          profile: payload.profile
        })
      );
    } catch (profileError: unknown) {
      setError(profileError instanceof Error ? profileError.message : "Trader profile generation failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cachedProfile = sessionStorage.getItem(storageKey);
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile) as {
          configured?: boolean;
          cached?: boolean;
          generatedAt?: string | null;
          profile?: TraderProfile;
        };
        if (parsed.profile) {
          setConfigured(Boolean(parsed.configured));
          setCached(Boolean(parsed.cached));
          setGeneratedAt(parsed.generatedAt ?? null);
          setProfile(parsed.profile);
          setLoading(false);
          return;
        }
      } catch {
        sessionStorage.removeItem(storageKey);
      }
    }
    void loadProfile(false);
  }, [sessionId]);

  return (
    <Card tone="cyan">
      <CardHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="md:flex-row md:items-center md:justify-between">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(91, 224, 230, 0.32)", background: "var(--tl-cyan-soft)", color: "var(--tl-cyan)" }}>
              <BrainCircuit className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="tl-card-title">{t.insights.profile.title}</h2>
              <p className="tl-card-sub" style={{ marginTop: 4 }}>{t.insights.profile.sub}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => loadProfile(true)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {t.insights.profile.regenerate}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {loading ? (
            <div className="tl-notice tl-notice-cyan">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{t.insights.profile.generating}</span>
            </div>
          ) : null}

          {error ? <div className="tl-notice tl-notice-red">{error}</div> : null}

          {!configured && profile ? (
            <div className="tl-notice tl-notice-amber">
              <ShieldAlert className="h-5 w-5" style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>{t.insights.profile.configMissing}</span>
            </div>
          ) : null}

          {profile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="tl-panel tl-panel-strong">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Badge tone="cyan">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {profile.traderType}
                  </Badge>
                  <Badge tone={profile.confidence === "high" ? "emerald" : profile.confidence === "medium" ? "amber" : "slate"}>
                    {t.insights.profile.confidence[profile.confidence]}
                  </Badge>
                  {cached ? <Badge tone="slate">{t.insights.profile.cached}</Badge> : null}
                  {generatedAt ? <Badge tone="slate">{t.insights.profile.generated} {new Date(generatedAt).toLocaleString()}</Badge> : null}
                </div>
                <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "var(--tl-ink-2)" }}>{profile.summary}</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ProfileList title={t.insights.profile.sections.evidence} items={profile.evidence} tone="cyan" empty={t.insights.profile.empty} />
                <ProfileList title={t.insights.profile.sections.behavioralTags} items={profile.behavioralTags} tone="slate" empty={t.insights.profile.empty} />
                <ProfileList title={t.insights.profile.sections.strengths} items={profile.strengths} tone="emerald" empty={t.insights.profile.empty} />
                <ProfileList title={t.insights.profile.sections.risks} items={profile.risks} tone="rose" empty={t.insights.profile.empty} />
              </div>

              <div className="tl-panel tl-tone-amber">
                <p style={{ fontWeight: 600, color: "#FFE3AC", fontSize: 14 }}>{t.insights.profile.sections.reflection}</p>
                <div className="grid gap-2 md:grid-cols-2" style={{ marginTop: 10 }}>
                  {profile.reflectionQuestions.map((question) => (
                    <div
                      key={question}
                      className="tl-panel"
                      style={{
                        borderColor: "rgba(245, 181, 68, 0.25)",
                        background: "rgba(6, 10, 20, 0.45)",
                        color: "rgba(255, 240, 200, 0.92)",
                        fontSize: 13.5,
                        lineHeight: 1.6
                      }}
                    >
                      {question}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileList({
  title,
  items,
  tone,
  empty
}: {
  title: string;
  items: string[];
  tone: "cyan" | "emerald" | "rose" | "slate";
  empty: string;
}) {
  return (
    <div className="tl-panel">
      <Badge tone={tone}>{title}</Badge>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--tl-line)",
                background: "rgba(6, 10, 20, 0.5)",
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--tl-ink-2)"
              }}
            >
              {item}
            </div>
          ))
        ) : (
          <p style={{ fontSize: 13, color: "var(--tl-ink-3)" }}>{empty}</p>
        )}
      </div>
    </div>
  );
}
