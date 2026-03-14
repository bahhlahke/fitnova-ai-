-- Migration: plan_adaptation_from_log
-- Adds a table to store plan adaptation events triggered by workout/nutrition logs.
-- This enables observability and replay of how logged data influenced the weekly plan.

create table if not exists plan_adaptation_events (
  event_id        uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  log_date        date not null,
  log_type        text not null check (log_type in ('workout', 'nutrition')),
  deviation_type  text,                    -- on_plan | harder | easier | different_type
  updated_days    text[] default '{}',     -- date_local strings for days that were modified
  adaptation_summary text,
  created_at      timestamptz not null default now()
);

create index if not exists plan_adaptation_events_user_date
  on plan_adaptation_events(user_id, log_date desc);

-- Row-level security: users can only see their own events
alter table plan_adaptation_events enable row level security;

create policy "Users can read own adaptation events"
  on plan_adaptation_events for select
  using (auth.uid() = user_id);

create policy "Service role can insert adaptation events"
  on plan_adaptation_events for insert
  with check (auth.uid() = user_id);
