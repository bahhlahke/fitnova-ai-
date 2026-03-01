import { NextResponse } from "next/server";
import { runReminderDispatch } from "@/lib/jobs/reminder-dispatch";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured) return true;

  const header = request.headers.get("x-cron-secret");
  if (header && header === configured) return true;

  const auth = request.headers.get("authorization");
  if (auth && auth === `Bearer ${configured}`) return true;

  return false;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runReminderDispatch();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("reminder_dispatch_unhandled", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, error: "Reminder dispatch failed." }, { status: 500 });
  }
}
