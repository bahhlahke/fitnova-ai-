-- SIT Phase 2-4 foundations
-- Readiness orchestration, safety ledger, physical history graph, and exercise ontology.

create extension if not exists pgcrypto;

create table if not exists public.policy_versions (
  policy_version_id uuid primary key default gen_random_uuid(),
  policy_key text not null,
  version text not null,
  is_active boolean not null default true,
  changelog text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(policy_key, version)
);

create table if not exists public.readiness_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  pathway text not null check (pathway in ('green', 'amber', 'red')),
  score numeric not null,
  confidence numeric not null,
  reason_codes text[] not null default '{}',
  policy_version text not null,
  features jsonb not null default '{}'::jsonb,
  canonical_input jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, snapshot_date, policy_version)
);

create table if not exists public.plan_mutations (
  mutation_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_local date not null,
  policy_version text not null,
  pathway text not null check (pathway in ('green', 'amber', 'red')),
  shadow_mode boolean not null default false,
  before_plan jsonb not null,
  after_plan jsonb not null,
  mutation_trace jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_ledger (
  ledger_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_local date not null,
  policy_version text not null,
  decision_status text not null check (decision_status in ('pass', 'modified', 'blocked')),
  reason_codes text[] not null default '{}',
  input_payload jsonb not null,
  output_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.one_rm_anomalies (
  anomaly_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  source_row_id text,
  decision text not null check (decision in ('quarantined', 'accepted')),
  reason_codes text[] not null default '{}',
  input_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_ontology (
  exercise_id text primary key,
  canonical_name text not null,
  aliases text[] not null default '{}',
  contraindications text[] not null default '{}',
  equivalence_class text not null,
  home_variant text not null,
  gym_variant text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.physical_history_events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('symptom_reported', 'substitution_recommended', 'substitution_applied', 'outcome_recorded')),
  symptom_tags text[] not null default '{}',
  current_exercise text,
  replacement_exercise text,
  outcome_quality integer check (outcome_quality between 1 and 5),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_readiness_snapshots_user_date on public.readiness_snapshots(user_id, snapshot_date desc);
create index if not exists idx_plan_mutations_user_date on public.plan_mutations(user_id, date_local desc);
create index if not exists idx_safety_ledger_user_date on public.safety_ledger(user_id, date_local desc);
create index if not exists idx_physical_history_events_user_created on public.physical_history_events(user_id, created_at desc);
create index if not exists idx_physical_history_events_symptoms on public.physical_history_events using gin (symptom_tags);

alter table public.policy_versions enable row level security;
alter table public.readiness_snapshots enable row level security;
alter table public.plan_mutations enable row level security;
alter table public.safety_ledger enable row level security;
alter table public.one_rm_anomalies enable row level security;
alter table public.exercise_ontology enable row level security;
alter table public.physical_history_events enable row level security;

drop policy if exists "Users can view own readiness snapshots" on public.readiness_snapshots;
create policy "Users can view own readiness snapshots"
  on public.readiness_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own readiness snapshots" on public.readiness_snapshots;
create policy "Users can insert own readiness snapshots"
  on public.readiness_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own plan mutations" on public.plan_mutations;
create policy "Users can view own plan mutations"
  on public.plan_mutations for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own plan mutations" on public.plan_mutations;
create policy "Users can insert own plan mutations"
  on public.plan_mutations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own safety ledger" on public.safety_ledger;
create policy "Users can view own safety ledger"
  on public.safety_ledger for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own safety ledger" on public.safety_ledger;
create policy "Users can insert own safety ledger"
  on public.safety_ledger for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own 1RM anomalies" on public.one_rm_anomalies;
create policy "Users can view own 1RM anomalies"
  on public.one_rm_anomalies for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own 1RM anomalies" on public.one_rm_anomalies;
create policy "Users can insert own 1RM anomalies"
  on public.one_rm_anomalies for insert
  with check (auth.uid() = user_id);

drop policy if exists "Exercise ontology readable by authenticated users" on public.exercise_ontology;
create policy "Exercise ontology readable by authenticated users"
  on public.exercise_ontology for select
  using (auth.role() = 'authenticated');

drop policy if exists "Service can manage exercise ontology" on public.exercise_ontology;
create policy "Service can manage exercise ontology"
  on public.exercise_ontology for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Policy versions readable by authenticated users" on public.policy_versions;
create policy "Policy versions readable by authenticated users"
  on public.policy_versions for select
  using (auth.role() = 'authenticated');

drop policy if exists "Service can manage policy versions" on public.policy_versions;
create policy "Service can manage policy versions"
  on public.policy_versions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Users can view own physical history events" on public.physical_history_events;
create policy "Users can view own physical history events"
  on public.physical_history_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own physical history events" on public.physical_history_events;
create policy "Users can insert own physical history events"
  on public.physical_history_events for insert
  with check (auth.uid() = user_id);

insert into public.policy_versions (policy_key, version, is_active, changelog, config)
values
  ('readiness_orchestrator', 'readiness-orchestrator-v1', true, 'Initial deterministic readiness pathways.', '{"statuses":["green","amber","red"]}'::jsonb),
  ('safety_validator', 'safety-validator-v1', true, 'Initial prescription validator guardrails.', '{"fail_closed":true}'::jsonb),
  ('substitution_policy', 'exercise-ontology-v1', true, 'Initial deterministic substitution ontology.', '{"deterministic":true}'::jsonb)
on conflict (policy_key, version) do nothing;
