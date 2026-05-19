import { NextResponse } from "next/server";
import { z } from "zod";
import { BinanceApiError, BinanceService } from "@/lib/binance/BinanceService";
import { safeErrorMessage } from "@/lib/security/redact";

// Binance blocks Vercel's default US East IPs ("Service unavailable from a
// restricted location"). Pin all Binance-touching routes — and the polling
// route that shares in-memory job state — to Frankfurt.
export const runtime = "nodejs";
export const preferredRegion = "fra1";

const BodySchema = z.object({
  apiKey: z.string().min(10),
  apiSecret: z.string().min(10)
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "API key and secret are required." }, { status: 400 });
  }

  try {
    const service = new BinanceService(parsed.data.apiKey, parsed.data.apiSecret);
    const validation = await service.validateCredentials();

    return NextResponse.json({
      ok: true,
      validation
    });
  } catch (error) {
    const status = error instanceof BinanceApiError ? error.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error: status === 401 ? "Invalid Binance API key or secret." : safeErrorMessage(error)
      },
      { status: status === 401 ? 401 : 400 }
    );
  }
}

