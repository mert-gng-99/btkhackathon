import { NextResponse } from "next/server";
import { z } from "zod";
import { BinanceApiError, BinanceService } from "@/lib/binance/BinanceService";
import { TradeNormalizer } from "@/lib/binance/TradeNormalizer";
import { sessionStore } from "@/lib/db/sessionStore";
import { defaultStartTime } from "@/lib/utils/dates";
import { safeErrorMessage } from "@/lib/security/redact";
import type { NormalizedTrade } from "@/types";

const BodySchema = z.object({
  apiKey: z.string().min(10),
  apiSecret: z.string().min(10),
  symbols: z.array(z.string().min(3)).max(30).optional(),
  startTime: z.number().int().positive().optional(),
  endTime: z.number().int().positive().optional()
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync request." }, { status: 400 });
  }

  try {
    const service = new BinanceService(parsed.data.apiKey, parsed.data.apiSecret);
    const validation = await service.validateCredentials();

    if (!validation.isReadOnly) {
      return NextResponse.json(
        {
          error: "This Binance API key is not read-only.",
          validation
        },
        { status: 403 }
      );
    }

    const symbols = parsed.data.symbols?.length ? parsed.data.symbols : BinanceService.getDefaultSymbols();
    const results = await service.fetchTradesForSymbols(symbols, {
      startTime: parsed.data.startTime ?? defaultStartTime(),
      endTime: parsed.data.endTime,
      maxPages: Number(process.env.BINANCE_MAX_PAGES_PER_SYMBOL ?? "5")
    });

    const warnings = [
      ...validation.warnings,
      ...results.map((result) => result.warning).filter((warning): warning is string => Boolean(warning))
    ];
    const normalized: NormalizedTrade[] = results.flatMap((result) =>
      TradeNormalizer.fromBinanceSpot("pending", result.symbol, result.trades)
    );
    const session = normalized.length > 0 ? sessionStore.createFromTrades(normalized, warnings) : sessionStore.createEmpty(warnings);

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      analytics: session.analytics,
      warnings: session.warnings,
      fetchedSymbols: results.map((result) => ({
        symbol: result.symbol,
        trades: result.trades.length,
        warning: result.warning
      }))
    });
  } catch (error) {
    const status = error instanceof BinanceApiError ? error.status : 500;
    const message =
      status === 418 || status === 429
        ? "Binance rate limit was reached. Wait a moment and retry with fewer symbols."
        : status === 401
          ? "Invalid Binance API key or secret."
          : safeErrorMessage(error);

    return NextResponse.json({ error: message }, { status: status === 500 ? 500 : 400 });
  }
}

