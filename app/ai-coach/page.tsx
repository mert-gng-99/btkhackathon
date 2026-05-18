"use client";

import { CoachChat } from "@/components/ai-coach/CoachChat";
import { PageHero } from "@/components/layout/PageHero";
import { CoachChatScene } from "@/components/scenes/CoachChatScene";
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
      <PageHero
        eyebrow={t.aiCoach.badge}
        title={t.aiCoach.title}
        sub={t.aiCoach.intro}
        scene={<CoachChatScene />}
        sceneLabel={t.home.coach.phone.loopName}
        sceneRight={t.home.coach.phone.loopSub}
        eyebrowTone="cyan"
      />

      <div data-reveal className="tl-reveal">
        <CoachChat sessionId={session.id} analytics={session.analytics} />
      </div>
    </>
  );
}
