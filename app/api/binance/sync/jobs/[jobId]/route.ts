import { NextResponse } from "next/server";
import { binanceSyncJobs } from "@/lib/jobs/binanceSyncJobs";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const params = await context.params;
  const job = binanceSyncJobs.get(params.jobId);

  if (!job) {
    return NextResponse.json({ error: "Sync job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}

