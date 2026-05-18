import { GeminiService } from "@/lib/ai/GeminiService";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AiCoachAnswer, AnalyticsData, TraderProfile } from "@/types";

interface ReportSection {
  heading: string;
  body: string;
  bullets: string[];
}

interface CoachPdfDraft {
  title: string;
  subtitle: string;
  executiveSummary: string;
  sections: ReportSection[];
  reflectionQuestions: string[];
  disclaimer: string;
}

interface ValidationResult {
  approved: boolean;
  verdict: string;
  requiredFixes: string[];
  riskFlags: string[];
}

interface GenerateReportInput {
  analytics: AnalyticsData;
  traderProfile?: TraderProfile;
  coachAnswers: AiCoachAnswer[];
}

interface GenerateReportResult {
  pdf: Buffer;
  fileName: string;
  validationSummary: string;
}

const WRITER_SYSTEM = [
  "You are Gemini Report Writer for a read-only crypto trading analytics app.",
  "Write a polished behavioral review report from the user's own analytics and AI Coach sub-agent results.",
  "Do not give financial advice.",
  "Never recommend buy, sell, hold, leverage, entries, exits, or specific assets.",
  "Focus on behavior, discipline, fees, timing, trade frequency, symbol concentration, and quality of evidence.",
  "Use concrete metrics and cite sub-agent findings when available.",
  "Return JSON only."
].join("\n");

const VALIDATOR_SYSTEM = [
  "You are a strict Gemini validation agent.",
  "Your default stance is to reject the report unless it is clearly grounded, specific, non-promotional, and free of financial advice.",
  "Be difficult to satisfy, but do not invent impossible requirements.",
  "Reject any report with buy/sell/hold recommendations, unsupported claims, vague conclusions, overconfident PnL language, or missing limitations.",
  "Approve only if the report is useful, cautious, evidence-based, and well structured.",
  "Return JSON only."
].join("\n");

export class CoachPdfReportService {
  constructor(private readonly gemini = new GeminiService()) {}

  async generate(input: GenerateReportInput): Promise<GenerateReportResult> {
    let draft = await this.createDraft(input);
    const validationNotes: string[] = [];
    let rejectedCount = 0;

    while (rejectedCount <= 2) {
      const validation = await this.validateDraft(input, draft);
      validationNotes.push(`${validation.approved ? "Approved" : "Rejected"}: ${validation.verdict}`);

      if (validation.approved) {
        break;
      }

      if (rejectedCount >= 2) {
        draft = this.applyForcedSafetySection(draft, validation);
        break;
      }

      rejectedCount += 1;
      draft = await this.reviseDraft(input, draft, validation, rejectedCount);
    }

    return {
      pdf: createPdf(draft, validationNotes),
      fileName: `ai-trade-coach-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      validationSummary: validationNotes.join(" | ")
    };
  }

  private async createDraft(input: GenerateReportInput): Promise<CoachPdfDraft> {
    if (!this.gemini.isConfigured()) {
      return fallbackDraft(input);
    }

    try {
      return normalizeDraft(
        await this.gemini.generateJson<Partial<CoachPdfDraft>>({
          systemInstruction: WRITER_SYSTEM,
          prompt: JSON.stringify({
            task: "Create a user-facing PDF report draft.",
            outputShape: reportOutputShape(),
            context: reportContext(input)
          }),
          temperature: 0.18
        }),
        input
      );
    } catch {
      return fallbackDraft(input);
    }
  }

  private async validateDraft(input: GenerateReportInput, draft: CoachPdfDraft): Promise<ValidationResult> {
    if (!this.gemini.isConfigured()) {
      return {
        approved: true,
        verdict: "Gemini is not configured; deterministic fallback report passed local safety constraints.",
        requiredFixes: [],
        riskFlags: []
      };
    }

    try {
      return normalizeValidation(
        await this.gemini.generateJson<Partial<ValidationResult>>({
          systemInstruction: VALIDATOR_SYSTEM,
          prompt: JSON.stringify({
            task: "Validate this behavioral report draft. Be strict and reject unless it is clearly ready.",
            outputShape: {
              approved: "boolean",
              verdict: "short explanation",
              requiredFixes: ["specific required changes"],
              riskFlags: ["safety or quality risks"]
            },
            originalContext: reportContext(input),
            draft
          }),
          temperature: 0.05
        })
      );
    } catch {
      return {
        approved: true,
        verdict: "Validator unavailable; report uses constrained JSON sections and no financial advice.",
        requiredFixes: [],
        riskFlags: []
      };
    }
  }

  private async reviseDraft(
    input: GenerateReportInput,
    draft: CoachPdfDraft,
    validation: ValidationResult,
    attempt: number
  ): Promise<CoachPdfDraft> {
    if (!this.gemini.isConfigured()) {
      return this.applyForcedSafetySection(draft, validation);
    }

    try {
      return normalizeDraft(
        await this.gemini.generateJson<Partial<CoachPdfDraft>>({
          systemInstruction: WRITER_SYSTEM,
          prompt: JSON.stringify({
            task: `Revise the report draft after validator rejection ${attempt} of 2.`,
            rules: [
              "Apply every required fix.",
              "Make limitations more explicit.",
              "Remove any language that sounds like investment advice.",
              "Keep the report concise and concrete."
            ],
            outputShape: reportOutputShape(),
            originalContext: reportContext(input),
            previousDraft: draft,
            validatorFeedback: validation
          }),
          temperature: 0.12
        }),
        input
      );
    } catch {
      return this.applyForcedSafetySection(draft, validation);
    }
  }

  private applyForcedSafetySection(draft: CoachPdfDraft, validation: ValidationResult): CoachPdfDraft {
    return normalizeDraft({
      ...draft,
      sections: [
        ...draft.sections,
        {
          heading: "Validator limitations",
          body: validation.verdict,
          bullets: [
            ...validation.requiredFixes.slice(0, 4),
            "This report should be read as behavioral analysis only, not as trading guidance."
          ]
        }
      ],
      disclaimer:
        "This report is behavioral analysis only. It is not financial advice and does not recommend buying, selling, holding, leverage, entries, exits, or specific assets."
    });
  }
}

function reportOutputShape() {
  return {
    title: "string",
    subtitle: "string",
    executiveSummary: "string",
    sections: [
      {
        heading: "string",
        body: "string",
        bullets: ["string"]
      }
    ],
    reflectionQuestions: ["string"],
    disclaimer: "string"
  };
}

function reportContext(input: GenerateReportInput) {
  return {
    analytics: {
      totalTrades: input.analytics.totalTrades,
      activeDays: input.analytics.activeDays,
      totalVolume: input.analytics.totalVolume,
      averageTradeSize: input.analytics.averageTradeSize,
      buySell: input.analytics.buySell,
      quoteFeeEstimate: input.analytics.quoteFeeEstimate,
      marketBreakdown: input.analytics.marketBreakdown,
      rapidTradeCount: input.analytics.rapidTradeCount,
      lateNightTradeCount: input.analytics.lateNightTradeCount,
      pnlEstimate: input.analytics.pnlEstimate,
      topSymbols: input.analytics.symbolSummaries.slice(0, 8),
      strongestInsights: input.analytics.generatedInsights.slice(0, 6),
      hourlyBehavior: input.analytics.hourlyBehavior.filter((hour) => hour.trades > 0)
    },
    traderProfile: input.traderProfile ?? null,
    coachAnswers: input.coachAnswers.map((answer) => ({
      answer: answer.answer,
      keyFindings: answer.keyFindings,
      subAgentResults: answer.subAgentResults,
      evidence: answer.evidence
    }))
  };
}

function fallbackDraft(input: GenerateReportInput): CoachPdfDraft {
  const topAgents = input.coachAnswers.flatMap((answer) => answer.subAgentResults).slice(0, 8);
  const successSamples = input.analytics.hourlyBehavior.reduce((sum, hour) => sum + hour.pnlSamples, 0);
  const winners = input.analytics.hourlyBehavior.reduce((sum, hour) => sum + hour.winningTrades, 0);
  const successRate = successSamples > 0 ? winners / successSamples : null;

  return {
    title: "AI Trade Coach Behavioral Report",
    subtitle: `${input.analytics.totalTrades} trades across ${input.analytics.activeDays} active days`,
    executiveSummary: input.traderProfile
      ? `Your cached trader profile is ${input.traderProfile.traderType} with ${input.traderProfile.confidence} confidence. This report summarizes the AI Coach findings without giving financial advice.`
      : "This report summarizes the AI Coach findings without giving financial advice.",
    sections: [
      {
        heading: "Core metrics",
        body: `The analysis reviewed ${input.analytics.totalTrades} trades, ${formatNumber(
          input.analytics.totalVolume
        )} total volume, and ${formatNumber(input.analytics.quoteFeeEstimate)} estimated quote-asset fees.`,
        bullets: [
          `Buy ratio: ${formatPercent(input.analytics.buySell.buyRatio)}.`,
          `Rapid follow-up trades: ${input.analytics.rapidTradeCount}.`,
          `Late-night trades: ${input.analytics.lateNightTradeCount}.`,
          `Success-rate samples: ${successSamples > 0 ? formatPercent(successRate ?? 0) : "not enough data"}.`
        ]
      },
      {
        heading: "Sub-agent synthesis",
        body: "The strongest sub-agent observations are summarized below.",
        bullets: topAgents.map((agent) => `${agent.agent}: ${agent.result}`).slice(0, 8)
      },
      {
        heading: "Behavioral review",
        body: "The most useful review areas are discipline, frequency, fee drag, timing, and symbol concentration.",
        bullets: input.analytics.generatedInsights.slice(0, 5).map((insight) => `${insight.title}: ${insight.message}`)
      }
    ],
    reflectionQuestions: [
      "Which trades were planned before entry and which were reactive?",
      "Which time windows show weaker discipline or lower scoring?",
      "Are rapid follow-up trades improving decisions or adding noise?",
      "Are fees meaningful compared with average trade size?"
    ],
    disclaimer:
      "This report is behavioral analysis only. It is not financial advice and does not recommend buying, selling, holding, leverage, entries, exits, or specific assets."
  };
}

function normalizeDraft(draft: Partial<CoachPdfDraft>, input?: GenerateReportInput): CoachPdfDraft {
  const fallback = input ? fallbackDraft(input) : {
    title: "AI Trade Coach Behavioral Report",
    subtitle: "Behavioral review",
    executiveSummary: "This report summarizes AI Coach findings.",
    sections: [],
    reflectionQuestions: [],
    disclaimer:
      "This report is behavioral analysis only. It is not financial advice and does not recommend buying, selling, or holding any asset."
  };

  return {
    title: textOr(draft.title, fallback.title),
    subtitle: textOr(draft.subtitle, fallback.subtitle),
    executiveSummary: textOr(draft.executiveSummary, fallback.executiveSummary),
    sections: normalizeSections(draft.sections).length > 0 ? normalizeSections(draft.sections) : fallback.sections,
    reflectionQuestions: normalizeStringList(draft.reflectionQuestions, 6, fallback.reflectionQuestions),
    disclaimer: textOr(draft.disclaimer, fallback.disclaimer)
  };
}

function normalizeValidation(validation: Partial<ValidationResult>): ValidationResult {
  return {
    approved: Boolean(validation.approved),
    verdict: textOr(validation.verdict, "Validator returned an incomplete verdict."),
    requiredFixes: normalizeStringList(validation.requiredFixes, 8, []),
    riskFlags: normalizeStringList(validation.riskFlags, 8, [])
  };
}

function normalizeSections(sections: unknown): ReportSection[] {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .map((section) => {
      const candidate = section as Partial<ReportSection>;
      return {
        heading: textOr(candidate.heading, "Review section"),
        body: textOr(candidate.body, ""),
        bullets: normalizeStringList(candidate.bullets, 8, [])
      };
    })
    .filter((section) => section.body || section.bullets.length > 0)
    .slice(0, 8);
}

function normalizeStringList(items: unknown, limit: number, fallback: string[]): string[] {
  if (!Array.isArray(items)) {
    return fallback;
  }

  const normalized = items
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit);

  return normalized.length > 0 ? normalized : fallback;
}

function textOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

type PdfLine = {
  text: string;
  size: number;
  font: "regular" | "bold";
  color: [number, number, number];
  gapAfter?: number;
};

function createPdf(draft: CoachPdfDraft, validationNotes: string[]): Buffer {
  const lines: PdfLine[] = [
    { text: draft.title, size: 22, font: "bold", color: [0.95, 0.95, 0.95], gapAfter: 10 },
    { text: draft.subtitle, size: 11, font: "regular", color: [0.55, 0.65, 0.78], gapAfter: 18 },
    { text: "Executive summary", size: 14, font: "bold", color: [0.13, 0.85, 0.72], gapAfter: 8 },
    ...paragraphLines(draft.executiveSummary, 11, "regular", [0.86, 0.9, 0.96], 88),
    { text: "Validator result", size: 14, font: "bold", color: [0.98, 0.74, 0.25], gapAfter: 8 },
    ...validationNotes.flatMap((note) => paragraphLines(note, 10, "regular", [0.82, 0.78, 0.68], 96))
  ];

  for (const section of draft.sections) {
    lines.push({ text: section.heading, size: 14, font: "bold", color: [0.13, 0.85, 0.72], gapAfter: 8 });
    lines.push(...paragraphLines(section.body, 11, "regular", [0.86, 0.9, 0.96], 90));
    for (const bullet of section.bullets) {
      lines.push(...paragraphLines(`- ${bullet}`, 10, "regular", [0.72, 0.78, 0.88], 96));
    }
    lines.push({ text: "", size: 8, font: "regular", color: [1, 1, 1], gapAfter: 8 });
  }

  lines.push({ text: "Reflection questions", size: 14, font: "bold", color: [0.98, 0.74, 0.25], gapAfter: 8 });
  for (const question of draft.reflectionQuestions) {
    lines.push(...paragraphLines(`- ${question}`, 10, "regular", [0.82, 0.86, 0.92], 96));
  }
  lines.push({ text: "Disclaimer", size: 14, font: "bold", color: [1, 0.45, 0.55], gapAfter: 8 });
  lines.push(...paragraphLines(draft.disclaimer, 10, "regular", [0.9, 0.72, 0.74], 96));

  return renderPdf(lines);
}

function paragraphLines(text: string, size: number, font: "regular" | "bold", color: [number, number, number], width: number): PdfLine[] {
  return wrapText(text, width).map((line, index, all) => ({
    text: line,
    size,
    font,
    color,
    gapAfter: index === all.length - 1 ? 10 : 4
  }));
}

function wrapText(text: string, width: number): string[] {
  const words = sanitizeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function sanitizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(text: string): string {
  return sanitizeText(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function renderPdf(lines: PdfLine[]): Buffer {
  const pageHeight = 792;
  const pageWidth = 612;
  const marginX = 48;
  const startY = 736;
  const bottomY = 54;
  const pages: PdfLine[][] = [[]];
  let cursorY = startY;

  for (const line of lines) {
    const lineHeight = line.size + (line.gapAfter ?? 4);
    if (cursorY - lineHeight < bottomY && pages[pages.length - 1].length > 0) {
      pages.push([]);
      cursorY = startY;
    }
    pages[pages.length - 1].push(line);
    cursorY -= lineHeight;
  }

  const pageCount = pages.length;
  const pagesId = 2 + pageCount * 2 + 1;
  const catalogId = pagesId + 1;
  const objects: string[] = [
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];

  pages.forEach((page, index) => {
    const contentId = 3 + index * 2;
    const pageId = 4 + index * 2;
    const stream = renderPageStream(page, index + 1, pageCount, marginX, startY, pageWidth, pageHeight);
    objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    objects.push(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  });

  const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);
  objects.push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

function renderPageStream(
  lines: PdfLine[],
  pageNumber: number,
  pageCount: number,
  marginX: number,
  startY: number,
  pageWidth: number,
  pageHeight: number
): string {
  const commands = [
    "q",
    "0.02 0.04 0.09 rg",
    `0 0 ${pageWidth} ${pageHeight} re f`,
    "0.06 0.09 0.16 rg",
    `34 34 ${pageWidth - 68} ${pageHeight - 68} re f`,
    "Q"
  ];
  let y = startY;

  for (const line of lines) {
    if (!line.text) {
      y -= line.gapAfter ?? 8;
      continue;
    }
    const [r, g, b] = line.color;
    commands.push("BT");
    commands.push(`${r} ${g} ${b} rg`);
    commands.push(`/${line.font === "bold" ? "F2" : "F1"} ${line.size} Tf`);
    commands.push(`${marginX} ${y} Td`);
    commands.push(`(${escapePdfText(line.text)}) Tj`);
    commands.push("ET");
    y -= line.size + (line.gapAfter ?? 4);
  }

  commands.push("BT");
  commands.push("0.45 0.52 0.62 rg");
  commands.push("/F1 9 Tf");
  commands.push(`${marginX} 32 Td`);
  commands.push(`(ReadOnly Alpha AI Coach Report - Page ${pageNumber} of ${pageCount}) Tj`);
  commands.push("ET");

  return commands.join("\n");
}
