-- SIT replay queue + reconciliation run ledger

create table if not exists public.wearable_webhook_replay_queue (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.wearable_reconciliation_runs (
  run_id uuid primary key default gen_random_uuid(),
  providers_seen text[] not null default '{}',
  signals_last_24h integer not null default 0,
  pending_replays integer not null default 0,
  processed_replays integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_wearable_replay_status_received on public.wearable_webhook_replay_queue(status, received_at asc);
create index if not exists idx_wearable_reconciliation_created on public.wearable_reconciliation_runs(created_at desc);

alter table public.wearable_webhook_replay_queue enable row level security;
alter table public.wearable_reconciliation_runs enable row level security;

drop policy if exists "Service can manage wearable replay queue" on public.wearable_webhook_replay_queue;
create policy "Service can manage wearable replay queue"
  on public.wearable_webhook_replay_queue for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service can manage wearable reconciliation runs" on public.wearable_reconciliation_runs;
create policy "Service can manage wearable reconciliation runs"
  on public.wearable_reconciliation_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
