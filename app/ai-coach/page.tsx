"use client";

import { CoachChat } from "@/components/ai-coach/CoachChat";
import { SessionGate } from "@/components/session/SessionGate";
import { useSessionData } from "@/hooks/useSessionData";
import { useT } from "@/lib/i18n";

export default function AiCoachPage() {
  const { session, loading, error } = useSessionData();
  const t = useT();

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  return (
    <>
      <section className="tl-hero">
        <span className="tl-eyebrow tl-eyebrow-cyan"><span className="tl-pulse" />{t.aiCoach.badge}</span>
        <h1 className="tl-display">{t.aiCoach.title}</h1>
        <p className="tl-sub">{t.aiCoach.intro}</p>
      </section>

      <CoachChat sessionId={session.id} analytics={session.analytics} />
    </>
  );
}
