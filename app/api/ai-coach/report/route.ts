import { NextResponse } from "next/server";
import { z } from "zod";
import { CoachPdfReportService } from "@/lib/ai/CoachPdfReportService";
import { TraderProfileService } from "@/lib/ai/TraderProfileService";
import { sessionStore } from "@/lib/db/sessionStore";
import { resolveSession } from "@/lib/db/sessionResolver";
import type { AiCoachAnswer } from "@/types";

const AnswerSchema = z.object({
  answer: z.string().optional(),
  keyFindings: z.array(z.unknown()).optional(),
  evidence: z.array(z.unknown()).optional(),
  subAgentResults: z.array(z.unknown()).optional(),
  traderProfile: z.unknown().optional(),
  disclaimer: z.string().optional(),
  structuredVersion: z.string().optional()
});

const BodySchema = z.object({
  sessionId: z.string().min(8),
  answers: z.array(AnswerSchema).min(1).max(12)
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId and at least one coach answer are required." }, { status: 400 });
  }

  const session = await resolveSession(parsed.data.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found or expired." }, { status: 404 });
  }

  let traderProfile = session.traderProfile;
  if (!traderProfile) {
    traderProfile = await new TraderProfileService().generate(session.analytics, session.trades);
    sessionStore.setTraderProfile(session.id, traderProfile);
  }

  const report = await new CoachPdfReportService().generate({
    analytics: session.analytics,
    traderProfile,
    coachAnswers: parsed.data.answers.map(normalizeCoachAnswer)
  });

  return new NextResponse(new Uint8Array(report.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.fileName}"`,
      "X-Validation-Summary": encodeURIComponent(report.validationSummary)
    }
  });
}

function normalizeCoachAnswer(answer: z.infer<typeof AnswerSchema>): AiCoachAnswer {
  return {
    answer: typeof answer.answer === "string" ? answer.answer : "",
    keyFindings: Array.isArray(answer.keyFindings) ? (answer.keyFindings as AiCoachAnswer["keyFindings"]) : [],
    evidence: Array.isArray(answer.evidence) ? (answer.evidence as AiCoachAnswer["evidence"]) : [],
    subAgentResults: Array.isArray(answer.subAgentResults) ? (answer.subAgentResults as AiCoachAnswer["subAgentResults"]) : [],
    traderProfile: answer.traderProfile as AiCoachAnswer["traderProfile"],
    disclaimer: typeof answer.disclaimer === "string" ? answer.disclaimer : "",
    retrievedChunks: [],
    structuredVersion: "agentic-v1"
  };
}
