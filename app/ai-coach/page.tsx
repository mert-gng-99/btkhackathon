"use client";

import { CoachChat } from "@/components/ai-coach/CoachChat";
import { SessionGate } from "@/components/session/SessionGate";
import { Badge } from "@/components/ui/Badge";
import { useSessionData } from "@/hooks/useSessionData";

export default function AiCoachPage() {
  const { session, loading, error } = useSessionData();

  if (loading || error || !session) {
    return <SessionGate loading={loading} error={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge tone="cyan">Agentic Gemini RAG</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-white">AI Trade Coach</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Ask questions about your own analyzed trade history. The orchestrator reuses your cached trader profile, delegates to sub-agents,
          cites retrieved evidence, and avoids financial advice.
        </p>
      </div>
      <CoachChat sessionId={session.id} analytics={session.analytics} />
    </div>
  );
}
