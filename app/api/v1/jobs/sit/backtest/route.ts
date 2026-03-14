import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { runSitBacktest } from "@/lib/jobs/sit-backtest";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const token = request.headers.get("x-cron-key") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) return true;
  return token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError(401, "AUTH_REQUIRED", "Invalid cron token.");
  }

  const summary = await runSitBacktest();
  return NextResponse.json({ ok: true, summary });
}
