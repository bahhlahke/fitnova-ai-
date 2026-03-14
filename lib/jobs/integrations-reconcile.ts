import { persistOpenWearablesPayload, type OpenWearablesPayload } from "@/lib/integrations/open-wearables";
import { createAdminClient } from "@/lib/supabase/admin";

export type IntegrationReconcileSummary = {
  providers_seen: string[];
  signals_last_24h: number;
  pending_replays: number;
  processed_replays: number;
  failed_replays: number;
  generated_at: string;
};

export async function runIntegrationsReconciliation(): Promise<IntegrationReconcileSummary> {
  const supabase = createAdminClient();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const signalsRes = await supabase
    .from("connected_signals")
    .select("provider, signal_date")
    .gte("signal_date", yesterday)
    .limit(5000);

  const signals = signalsRes.data ?? [];
  const providers = Array.from(new Set(signals.map((row: any) => row.provider).filter(Boolean)));

  let pendingReplays = 0;
  let processedReplays = 0;
  let failedReplays = 0;

  const pendingRes = await supabase
    .from("wearable_webhook_replay_queue")
    .select("id, payload")
    .eq("status", "pending")
    .limit(50);

  if (!pendingRes.error) {
    const pending = pendingRes.data ?? [];
    pendingReplays = pending.length;
    for (const item of pending) {
      try {
        await persistOpenWearablesPayload(supabase as any, item.payload as OpenWearablesPayload);
        const updateRes = await supabase
          .from("wearable_webhook_replay_queue")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", item.id);
        if (!updateRes.error) {
          processedReplays += 1;
        }
      } catch (error) {
        failedReplays += 1;
        await supabase
          .from("wearable_webhook_replay_queue")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "unknown",
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }
    }
  }

  await supabase.from("wearable_reconciliation_runs").insert({
    providers_seen: providers,
    signals_last_24h: signals.length,
    pending_replays: pendingReplays,
    processed_replays: processedReplays,
    failed_replays: failedReplays,
    created_at: new Date().toISOString(),
  });

  return {
    providers_seen: providers,
    signals_last_24h: signals.length,
    pending_replays: pendingReplays,
    processed_replays: processedReplays,
    failed_replays: failedReplays,
    generated_at: new Date().toISOString(),
  };
}
