-- PrintMesh Block 3: merchant dashboard authorization and indexes

create table if not exists public.merchant_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  role text not null default 'merchant_admin' check (role in ('merchant_admin','merchant_staff')),
  created_at timestamptz not null default now()
);

create index if not exists idx_merchant_users_merchant_id
  on public.merchant_users(merchant_id);

alter table public.merchant_users enable row level security;

create or replace function public.current_merchant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select merchant_id
  from public.merchant_users
  where auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_merchant_id() from public;
grant execute on function public.current_merchant_id() to authenticated, service_role;

drop policy if exists merchant_users_self_read on public.merchant_users;
create policy merchant_users_self_read
on public.merchant_users
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists merchants_member_read on public.merchants;
create policy merchants_member_read
on public.merchants
for select
to authenticated
using (id = public.current_merchant_id());

drop policy if exists merchant_jobs_read on public.print_jobs;
create policy merchant_jobs_read
on public.print_jobs
for select
to authenticated
using (merchant_id = public.current_merchant_id());

drop policy if exists merchant_printers_read on public.printers;
create policy merchant_printers_read
on public.printers
for select
to authenticated
using (merchant_id = public.current_merchant_id());

drop policy if exists merchant_agents_read on public.agent_instances;
create policy merchant_agents_read
on public.agent_instances
for select
to authenticated
using (merchant_id = public.current_merchant_id());

create index if not exists idx_print_jobs_merchant_status_created
  on public.print_jobs(merchant_id,status,created_at desc);

create index if not exists idx_printers_merchant
  on public.printers(merchant_id);

create index if not exists idx_agents_merchant_last_seen
  on public.agent_instances(merchant_id,last_seen_at desc);