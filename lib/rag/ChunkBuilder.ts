import { readdir, readFile } from "fs/promises";
import path from "path";
import { inflateSync } from "zlib";
import { formatNumber, formatPercent } from "@/lib/utils/numbers";
import type { AnalyticsData, NormalizedTrade, RagChunk } from "@/types";

function chunkId(sessionId: string, sourceType: RagChunk["sourceType"], sourceRef: string): string {
  return `${sessionId}:${sourceType}:${sourceRef}`.replace(/\s+/g, "-");
}

export class ChunkBuilder {
  static buildSessionChunks(sessionId: string, analytics: AnalyticsData, trades: NormalizedTrade[]): RagChunk[] {
    const chunks: RagChunk[] = [];

    chunks.push({
      id: chunkId(sessionId, "analytics", "overview"),
      sessionId,
      sourceType: "analytics",
      sourceRef: "overview",
      content: `Session overview: ${analytics.totalTrades} Binance Spot trades, ${formatNumber(analytics.totalVolume)} quote volume, average trade size ${formatNumber(analytics.averageTradeSize)}, ${analytics.buySell.buys} buys and ${analytics.buySell.sells} sells. Estimated quote fees: ${formatNumber(analytics.quoteFeeEstimate)}. Active days: ${analytics.activeDays}.`,
      metadata: {
        totalTrades: analytics.totalTrades,
        totalVolume: analytics.totalVolume
      }
    });

    if (analytics.pnlEstimate.confidence !== "none") {
      chunks.push({
        id: chunkId(sessionId, "analytics", "pnl-estimate"),
        sessionId,
        sourceType: "analytics",
        sourceRef: "pnl-estimate",
        content: `Estimated realized PnL using FIFO is ${formatNumber(analytics.pnlEstimate.realized)} with ${analytics.pnlEstimate.confidence} confidence. Matched sell trades: ${analytics.pnlEstimate.matchedSellTrades}. Unmatched sell trades: ${analytics.pnlEstimate.unmatchedSellTrades}. This is not official Binance PnL.`,
        metadata: {
          realized: analytics.pnlEstimate.realized,
          confidence: analytics.pnlEstimate.confidence
        }
      });
    }

    for (const summary of analytics.symbolSummaries.slice(0, 10)) {
      chunks.push({
        id: chunkId(sessionId, "symbol", summary.symbol),
        sessionId,
        sourceType: "symbol",
        sourceRef: summary.symbol,
        content: `${summary.symbol}: ${summary.trades} trades, ${summary.buys} buys, ${summary.sells} sells, ${formatNumber(summary.volume)} quote volume, average trade size ${formatNumber(summary.averageTradeSize)}. First trade ${summary.firstTradeAt ?? "unknown"}, last trade ${summary.lastTradeAt ?? "unknown"}. Estimated realized PnL ${summary.realizedPnlEstimate ?? "not available"}.`,
        metadata: {
          symbol: summary.symbol,
          trades: summary.trades,
          volume: summary.volume
        }
      });
    }

    for (const period of analytics.activityByMonth.slice(-12)) {
      chunks.push({
        id: chunkId(sessionId, "period", period.label),
        sessionId,
        sourceType: "period",
        sourceRef: period.label,
        content: `In ${period.label}, the user made ${period.trades} trades with ${formatNumber(period.volume)} quote volume.`,
        metadata: {
          month: period.label,
          trades: period.trades,
          volume: period.volume
        }
      });
    }

    const lateNightRatio = analytics.totalTrades > 0 ? analytics.lateNightTradeCount / analytics.totalTrades : 0;
    chunks.push({
      id: chunkId(sessionId, "trade_cluster", "timing"),
      sessionId,
      sourceType: "trade_cluster",
      sourceRef: "timing",
      content: `Timing pattern: ${analytics.lateNightTradeCount} of ${analytics.totalTrades} trades happened between 00:00 and 04:00 UTC (${formatPercent(lateNightRatio)}). ${analytics.rapidTradeCount} trades happened within 30 minutes of the previous trade.`,
      metadata: {
        lateNightTradeCount: analytics.lateNightTradeCount,
        rapidTradeCount: analytics.rapidTradeCount
      }
    });

    for (const insight of analytics.generatedInsights) {
      chunks.push({
        id: chunkId(sessionId, "insight", insight.id),
        sessionId,
        sourceType: "insight",
        sourceRef: insight.id,
        content: `${insight.title}: ${insight.message} Evidence: ${insight.evidence.join("; ")}.`,
        metadata: {
          category: insight.category,
          severity: insight.severity
        }
      });
    }

    const rapidTrades = this.findRapidTradeExamples(trades);
    if (rapidTrades.length > 0) {
      chunks.push({
        id: chunkId(sessionId, "trade_cluster", "rapid-examples"),
        sessionId,
        sourceType: "trade_cluster",
        sourceRef: "rapid-examples",
        content: `Rapid trade examples: ${rapidTrades.join(" ")}`,
        metadata: {
          examples: rapidTrades.length
        }
      });
    }

    return chunks;
  }

  static async buildMaterialChunksFromFolder(sessionId: string): Promise<RagChunk[]> {
    const folder = path.join(process.cwd(), "rag-materials");
    const chunks: RagChunk[] = [];

    try {
      const files = await readdir(folder);
      for (const file of files) {
        const extension = path.extname(file).toLowerCase();
        if (![".md", ".txt", ".pdf"].includes(extension)) {
          continue;
        }

        const fullPath = path.join(folder, file);
        const content = extension === ".pdf" ? extractPdfText(await readFile(fullPath)) : await readFile(fullPath, "utf8");
        const sections = splitMaterialIntoSections(content).slice(0, extension === ".pdf" ? 35 : 20);

        sections.forEach((section, index) => {
          chunks.push({
            id: chunkId(sessionId, "material", `${file}-${index}`),
            sessionId,
            sourceType: "material",
            sourceRef: file,
            content: section.slice(0, 1800),
            metadata: {
              file,
              index,
              format: extension.replace(".", "")
            }
          });
        });
      }
    } catch {
      return [];
    }

    return chunks;
  }

  private static findRapidTradeExamples(trades: NormalizedTrade[]): string[] {
    const sorted = [...trades].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const examples: string[] = [];

    for (let index = 1; index < sorted.length && examples.length < 5; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const diffMinutes = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 60000;
      if (diffMinutes <= 30) {
        examples.push(
          `${previous.symbol} ${previous.side} at ${previous.timestamp}, followed ${Math.round(diffMinutes)} minutes later by ${current.symbol} ${current.side} at ${current.timestamp}.`
        );
      }
    }

    return examples;
  }
}

function splitMaterialIntoSections(content: string): string[] {
  const paragraphs = content
    .replace(/\r/g, "")
    .split(/\n\s*\n/g)
    .map((section) => normalizeExtractedText(section))
    .filter((section) => section.length > 40);

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  return normalizeExtractedText(content)
    .match(/.{1,1400}(?:\s|$)/g)
    ?.map((section) => section.trim())
    .filter((section) => section.length > 40) ?? [];
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const streams = extractPdfStreams(raw);
  const extracted: string[] = [];

  for (const stream of streams) {
    const inflated = stream.flateDecode ? inflatePdfStream(stream.content) : Buffer.from(stream.content, "latin1");
    if (!inflated) {
      continue;
    }

    extracted.push(extractTextOperators(inflated.toString("latin1")));
  }

  const text = normalizeExtractedText(extracted.join("\n\n"));

  if (text.length > 80) {
    return text;
  }

  return extractTextOperators(raw);
}

function extractPdfStreams(raw: string): Array<{ content: string; flateDecode: boolean }> {
  const streams: Array<{ content: string; flateDecode: boolean }> = [];
  const regex = /<<(.*?)>>\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw))) {
    streams.push({
      content: match[2],
      flateDecode: match[1].includes("/FlateDecode")
    });
  }

  return streams;
}

function inflatePdfStream(content: string): Buffer | null {
  const streamBuffer = Buffer.from(content, "latin1");

  try {
    return inflateSync(streamBuffer);
  } catch {
    const trimmed = trimPdfStreamBuffer(streamBuffer);
    try {
      return inflateSync(trimmed);
    } catch {
      return null;
    }
  }
}

function trimPdfStreamBuffer(buffer: Buffer): Buffer {
  let start = 0;
  let end = buffer.length;

  while (start < end && (buffer[start] === 0x0a || buffer[start] === 0x0d || buffer[start] === 0x20)) {
    start += 1;
  }

  while (end > start && (buffer[end - 1] === 0x0a || buffer[end - 1] === 0x0d || buffer[end - 1] === 0x20)) {
    end -= 1;
  }

  return buffer.subarray(start, end);
}

function extractTextOperators(content: string): string {
  const pieces: string[] = [];

  for (const match of content.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    pieces.push(decodePdfString(match[0].replace(/\s*Tj$/, "")));
  }

  for (const match of content.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    const arrayContent = match[1];
    const strings = [...arrayContent.matchAll(/\((?:\\.|[^\\)])*\)/g)].map((item) => decodePdfString(item[0]));
    if (strings.length > 0) {
      pieces.push(strings.join(""));
    }
  }

  for (const match of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
    pieces.push(decodePdfHexString(match[1]));
  }

  return normalizeExtractedText(pieces.join(" "));
}

function decodePdfString(value: string): string {
  const inner = value.startsWith("(") && value.endsWith(")") ? value.slice(1, -1) : value;
  return inner
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function decodePdfHexString(value: string): string {
  const hex = value.replace(/\s+/g, "");
  const bytes: number[] = [];

  for (let index = 0; index < hex.length - 1; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2), 16));
  }

  return Buffer.from(bytes).toString("utf8").replace(/\u0000/g, "");
}
