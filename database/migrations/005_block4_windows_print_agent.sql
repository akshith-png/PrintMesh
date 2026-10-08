-- PrintMesh Block 4: authenticated Windows print agents and safe queue transitions.
-- The additive statements also make an early Block 1 database compatible with this release.

alter table public.agent_instances add column if not exists merchant_id uuid references public.merchants(id) on delete cascade;
alter table public.agent_instances add column if not exists name text not null default 'PrintMesh Agent';
alter table public.agent_instances add column if not exists auth_secret_hash text;
alter table public.agent_instances add column if not exists selected_windows_printer_name text;
alter table public.agent_instances add column if not exists updated_at timestamptz not null default now();

alter table public.printers add column if not exists agent_instance_id uuid references public.agent_instances(id) on delete set null;
alter table public.printers add column if not exists is_available boolean not null default false;
alter table public.printers add column if not exists last_seen_at timestamptz;

alter table public.print_files add column if not exists job_id uuid references public.print_jobs(id) on delete cascade;
alter table public.print_files add column if not exists storage_path text;
alter table public.print_files add column if not exists sha256 text;

alter table public.print_jobs add column if not exists claimed_by_agent_id uuid references public.agent_instances(id);
alter table public.print_jobs add column if not exists claim_token_hash text;
alter table public.print_jobs add column if not exists claim_expires_at timestamptz;

alter table public.print_job_events add column if not exists event_type text;
alter table public.print_job_events add column if not exists status job_status;
alter table public.print_job_events add column if not exists message text;

create table if not exists public.agent_enrollment_tokens (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  registered_agent_id uuid references public.agent_instances(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_printers_agent_windows_name
  on public.printers(merchant_id, agent_instance_id, windows_printer_name)
  where windows_printer_name is not null;
create index if not exists idx_jobs_agent_status on public.print_jobs(claimed_by_agent_id, status);
create index if not exists idx_agent_enrollment_tokens_merchant_expiry
  on public.agent_enrollment_tokens(merchant_id, expires_at);

alter table public.agent_enrollment_tokens enable row level security;
drop policy if exists service_role_agent_enrollment_tokens on public.agent_enrollment_tokens;
create policy service_role_agent_enrollment_tokens on public.agent_enrollment_tokens
  for all to service_role using (true) with check (true);

-- Atomically reserve one queued job for the calling agent. Printing jobs are never automatically re-claimed:
-- once the agent has handed a file to Windows, a retry could make a physical duplicate.
create or replace function public.claim_next_print_job(
  p_agent_id uuid,
  p_claim_token_hash text
) returns table(
  job_id uuid,
  original_filename text,
  sha256 text,
  copies integer,
  color_mode text,
  duplex boolean,
  paper_size text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent public.agent_instances%rowtype;
  v_job public.print_jobs%rowtype;
begin
  select * into v_agent
  from public.agent_instances
  where id = p_agent_id and status <> 'REVOKED'
  for update;

  if not found then
    raise exception 'Agent is not active';
  end if;

  if v_agent.merchant_id is null or v_agent.printer_id is null then
    return;
  end if;

  select j.* into v_job
  from public.print_jobs j
  where j.merchant_id = v_agent.merchant_id
    and j.status = 'QUEUED'
    and (j.printer_id is null or j.printer_id = v_agent.printer_id)
  order by j.created_at
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.print_jobs
  set status = 'CLAIMED',
      printer_id = coalesce(printer_id, v_agent.printer_id),
      claimed_by_agent_id = p_agent_id,
      claim_token_hash = p_claim_token_hash,
      claim_expires_at = now() + interval '10 minutes',
      claimed_at = now(),
      attempt_count = attempt_count + 1,
      error_code = null,
      error_message = null
  where id = v_job.id;

  insert into public.print_job_events (job_id, event_type, status, message, metadata)
  values (v_job.id, 'AGENT_CLAIMED', 'CLAIMED', 'Job reserved by Windows agent.', jsonb_build_object('agentId', p_agent_id));

  return query
  select j.id, f.original_filename, f.sha256, j.copies, j.color_mode, j.duplex, j.paper_size
  from public.print_jobs j
  join public.print_files f on f.id = j.file_id
  where j.id = v_job.id;
end;
$$;

-- Status reports require both the authenticated agent and the one-time claim token.
-- Repeating the terminal status is idempotent so a lost HTTP response does not trigger another print.
create or replace function public.report_agent_job_status(
  p_agent_id uuid,
  p_job_id uuid,
  p_claim_token_hash text,
  p_status job_status,
  p_error_code text default null,
  p_error_message text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.print_jobs%rowtype;
begin
  select * into v_job
  from public.print_jobs
  where id = p_job_id
  for update;

  if not found or v_job.claimed_by_agent_id <> p_agent_id or v_job.claim_token_hash <> p_claim_token_hash then
    raise exception 'Job claim is not owned by this agent';
  end if;

  if v_job.status = p_status then
    return true;
  end if;

  if p_status = 'PRINTING' and v_job.status <> 'CLAIMED' then
    raise exception 'Only claimed jobs can start printing';
  end if;

  if p_status = 'COMPLETED' and v_job.status <> 'PRINTING' then
    raise exception 'Only printing jobs can complete';
  end if;

  if p_status = 'FAILED' and v_job.status not in ('CLAIMED', 'PRINTING') then
    raise exception 'Only claimed or printing jobs can fail';
  end if;

  if p_status not in ('PRINTING', 'COMPLETED', 'FAILED') then
    raise exception 'Unsupported agent status';
  end if;

  update public.print_jobs
  set status = p_status,
      started_at = case when p_status = 'PRINTING' then coalesce(started_at, now()) else started_at end,
      completed_at = case when p_status = 'COMPLETED' then coalesce(completed_at, now()) else completed_at end,
      failed_at = case when p_status = 'FAILED' then coalesce(failed_at, now()) else failed_at end,
      error_code = case when p_status = 'FAILED' then p_error_code else null end,
      error_message = case when p_status = 'FAILED' then p_error_message else null end
  where id = p_job_id;

  insert into public.print_job_events (job_id, event_type, status, message, metadata)
  values (
    p_job_id,
    'AGENT_STATUS_REPORTED',
    p_status,
    case when p_status = 'FAILED' then coalesce(p_error_message, 'Windows agent failed the job.') else 'Windows agent reported ' || p_status::text end,
    jsonb_build_object('agentId', p_agent_id, 'errorCode', p_error_code)
  );

  return true;
end;
$$;

revoke all on function public.claim_next_print_job(uuid,text) from public;
grant execute on function public.claim_next_print_job(uuid,text) to service_role;
revoke all on function public.report_agent_job_status(uuid,uuid,text,job_status,text,text) from public;
grant execute on function public.report_agent_job_status(uuid,uuid,text,job_status,text,text) to service_role;
