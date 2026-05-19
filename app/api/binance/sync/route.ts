import { NextResponse } from "next/server";
import { z } from "zod";
import { binanceSyncJobs } from "@/lib/jobs/binanceSyncJobs";

// Binance restricts US IPs (Vercel iad1). Frankfurt works.
export const runtime = "nodejs";
export const preferredRegion = "fra1";
// Hobby plan caps at 60s. Validation + symbol discovery must finish in this
// window; the actual symbol scanning is done incrementally by the polling
// endpoint (one batch per /api/binance/sync/jobs/[id] GET).
export const maxDuration = 60;

const BodySchema = z.object({
  apiKey: z.string().min(10),
  apiSecret: z.string().min(10),
  symbols: z.array(z.string().min(3)).max(50).optional(),
  quoteAssets: z.array(z.string().min(2)).max(20).optional(),
  scanMode: z.enum(["selected", "quoteAssets", "all"]).optional(),
  includeMarkets: z.array(z.enum(["spot", "um_futures", "coin_futures"])).min(1).optional(),
  startTime: z.number().int().positive().optional(),
  endTime: z.number().int().positive().optional()
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync request." }, { status: 400 });
  }

  const job = await binanceSyncJobs.start(parsed.data);

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    job
  });
}

