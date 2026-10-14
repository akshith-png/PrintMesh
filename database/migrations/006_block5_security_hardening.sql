-- PrintMesh Block 5: database-enforced lifecycle safety and operational indexes.

create index if not exists idx_print_jobs_active_claims
  on public.print_jobs(claimed_by_agent_id, claim_expires_at)
  where status in ('CLAIMED', 'PRINTING');

create index if not exists idx_print_files_expiry
  on public.print_files(expires_at)
  where expires_at is not null;

create or replace function public.validate_print_job_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'COMPLETED' and new.status <> old.status then
    raise exception 'Completed jobs are immutable';
  end if;
  if old.status = 'CANCELLED' and new.status <> old.status then
    raise exception 'Cancelled jobs are immutable';
  end if;
  if old.status = 'QUEUED' and new.status not in ('QUEUED', 'CLAIMED', 'CANCELLED') then
    raise exception 'Invalid queued job transition';
  end if;
  if old.status = 'CLAIMED' and new.status not in ('CLAIMED', 'PRINTING', 'FAILED') then
    raise exception 'Invalid claimed job transition';
  end if;
  if old.status = 'PRINTING' and new.status not in ('PRINTING', 'COMPLETED', 'FAILED') then
    raise exception 'Invalid printing job transition';
  end if;
  return new;
end;
$$;

drop trigger if exists print_jobs_lifecycle_guard on public.print_jobs;
create trigger print_jobs_lifecycle_guard
before update on public.print_jobs
for each row execute function public.validate_print_job_transition();

-- A service/API retry must not create a second job for the same client operation.
create unique index if not exists idx_jobs_merchant_idempotency
  on public.print_jobs(merchant_id, idempotency_key);

-- Only the service role can mutate agent credentials and queue state.
drop policy if exists authenticated_agents_write on public.agent_instances;
drop policy if exists authenticated_jobs_write on public.print_jobs;
drop policy if exists authenticated_files_write on public.print_files;

-- Expired one-time enrollment material is safe to remove without touching an agent installation.
create or replace function public.delete_expired_agent_enrollment_tokens()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.agent_enrollment_tokens
    where expires_at < now() and used_at is null
    returning id
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.delete_expired_agent_enrollment_tokens() from public;
grant execute on function public.delete_expired_agent_enrollment_tokens() to service_role;

create or replace function public.prune_old_job_events(retention_days integer default 90)
returns integer language plpgsql security definer set search_path = public as $$
declare deleted_count integer;
begin
  delete from public.print_job_events where created_at < now() - make_interval(days => greatest(retention_days, 7));
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.prune_old_job_events(integer) from public, anon, authenticated;
grant execute on function public.prune_old_job_events(integer) to service_role;
