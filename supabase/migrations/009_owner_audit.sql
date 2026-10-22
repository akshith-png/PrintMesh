create table if not exists public.owner_audit_logs (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid not null, action text not null,
  target_type text not null, target_id text not null, reason text, before_state jsonb, after_state jsonb,
  created_at timestamptz not null default now()
);
alter table public.owner_audit_logs enable row level security;
revoke all on public.owner_audit_logs from anon, authenticated;
grant all on public.owner_audit_logs to service_role;
