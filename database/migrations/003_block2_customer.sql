-- PrintMesh V1 customer flow
-- Public customers create jobs anonymously; merchant ownership/auth is hardened in Block 5.
create index if not exists print_jobs_status_created_at_idx on public.print_jobs(status, created_at);
create index if not exists print_files_job_id_idx on public.print_files(job_id);
create index if not exists print_job_events_job_id_created_at_idx on public.print_job_events(job_id, created_at);

-- Anonymous customer job creation is intentionally restricted to the API service role.
-- The browser never receives the service-role key.
-- RLS remains enabled from migration 002.

create or replace function public.create_customer_print_job(
  p_merchant_id uuid,
  p_original_filename text,
  p_storage_path text,
  p_size_bytes bigint,
  p_copies integer default 1,
  p_color_mode text default 'BW',
  p_duplex boolean default false,
  p_paper_size text default 'A4'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_file_id uuid;
begin
  if p_copies < 1 or p_copies > 100 then raise exception 'Invalid copies'; end if;
  if p_color_mode not in ('BW', 'COLOR') then raise exception 'Invalid color mode'; end if;
  if p_paper_size not in ('A4', 'A3', 'LETTER') then raise exception 'Invalid paper size'; end if;

  insert into public.print_jobs (merchant_id, status, copies, color_mode, duplex, paper_size)
  values (p_merchant_id, 'UPLOADED', p_copies, p_color_mode, p_duplex, p_paper_size)
  returning id into v_job_id;

  insert into public.print_files (job_id, original_filename, storage_path, size_bytes, mime_type)
  values (v_job_id, p_original_filename, p_storage_path, p_size_bytes, 'application/pdf')
  returning id into v_file_id;

  insert into public.print_job_events (job_id, status, message)
  values (v_job_id, 'UPLOADED', 'Customer PDF uploaded and job created.');

  return v_job_id;
end;
$$;

revoke all on function public.create_customer_print_job(uuid,text,text,bigint,integer,text,boolean,text) from public;
grant execute on function public.create_customer_print_job(uuid,text,text,bigint,integer,text,boolean,text) to service_role;