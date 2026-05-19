import { NextResponse } from "next/server";
import { binanceSyncJobs } from "@/lib/jobs/binanceSyncJobs";

// Pinned to fra1 because Binance blocks Vercel's default iad1 (US East).
export const runtime = "nodejs";
export const preferredRegion = "fra1";
// Each poll advances one batch of symbol scans. Hobby caps at 60s; one
// batch of 12 concurrent fetches finishes well inside that.
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const params = await context.params;
  const job = await binanceSyncJobs.advance(params.jobId);

  if (!job) {
    return NextResponse.json({ error: "Sync job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

