"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { TraderProfile } from "@/types";

interface TraderProfileCardProps {
  sessionId: string;
}

export function TraderProfileCard({ sessionId }: TraderProfileCardProps) {
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
      const params = new URLSearchParams({
        sessionId,
        ...(refresh ? { refresh: "1" } : {})
      });
      const response = await fetch(`/api/insights/trader-profile?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Trader profile generation failed.");
      }
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
    <Card className="overflow-hidden border-cyan-400/20">
      <CardHeader className="bg-slate-900/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-cyan-400/25 bg-cyan-400/10 p-2 text-cyan-200">
              <BrainCircuit className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Gemini trader profile</h2>
              <p className="mt-1 text-sm text-slate-500">Behavioral trader type analysis grounded in your metrics.</p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => loadProfile(true)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center gap-3 rounded-md border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Gemini is reviewing your trade behavior...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div>
        ) : null}

        {!configured && profile ? (
          <div className="flex gap-3 rounded-md border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Add `GEMINI_API_KEY` to `.env`, restart the dev server, and regenerate this profile.</span>
          </div>
        ) : null}

        {profile ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cyan">
                  <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                  {profile.traderType}
                </Badge>
                <Badge tone={profile.confidence === "high" ? "emerald" : profile.confidence === "medium" ? "amber" : "slate"}>
                  {profile.confidence} confidence
                </Badge>
                {cached ? <Badge tone="slate">cached session profile</Badge> : null}
                {generatedAt ? <Badge tone="slate">generated {new Date(generatedAt).toLocaleString()}</Badge> : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{profile.summary}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ProfileList title="Evidence" items={profile.evidence} tone="cyan" />
              <ProfileList title="Behavioral tags" items={profile.behavioralTags} tone="slate" />
              <ProfileList title="Strengths" items={profile.strengths} tone="emerald" />
              <ProfileList title="Risks to review" items={profile.risks} tone="rose" />
            </div>

            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="text-sm font-semibold text-amber-100">Reflection questions</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {profile.reflectionQuestions.map((question) => (
                  <div key={question} className="rounded-md border border-amber-400/20 bg-slate-950/70 px-3 py-2 text-sm leading-6 text-amber-50/90">
                    {question}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProfileList({ title, items, tone }: { title: string; items: string[]; tone: "cyan" | "emerald" | "rose" | "slate" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/75 p-4">
      <Badge tone={tone}>{title}</Badge>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item} className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-300">
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No items generated.</p>
        )}
      </div>
    </div>
  );
}
