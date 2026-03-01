import { fetchWhoopSignals } from "@/lib/integrations/whoop-client";

export async function syncWhoopSignals(supabase: any, userId: string): Promise<{ synced: number }> {
  const accountRes = await supabase
    .from("connected_accounts")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "whoop")
    .maybeSingle();

  if (accountRes.error) {
    throw new Error(accountRes.error.message);
  }

  const accessToken = (accountRes.data as { access_token?: string } | null)?.access_token;
  if (!accessToken) {
    return { synced: 0 };
  }

  const signals = await fetchWhoopSignals(accessToken);
  let synced = 0;

  for (const signal of signals) {
    const upsertRes = await supabase.from("connected_signals").upsert(
      {
        user_id: userId,
        provider: "whoop",
        signal_date: signal.signal_date,
        recovery_score: signal.recovery_score ?? null,
        strain_score: signal.strain_score ?? null,
        sleep_hours: signal.sleep_hours ?? null,
        resting_hr: signal.resting_hr ?? null,
        hrv: signal.hrv ?? null,
        raw_payload: signal.raw_payload ?? {},
      },
      { onConflict: "user_id,provider,signal_date" }
    );

    if (!upsertRes.error) {
      synced += 1;
    }
  }

  return { synced };
}
