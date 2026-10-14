-- PrintMesh V1 customer flow. Uploaded files are private; the API is the only writer.
create index if not exists print_jobs_status_created_at_idx on public.print_jobs(status, created_at);
create index if not exists print_files_job_id_idx on public.print_files(job_id);
create index if not exists print_job_events_job_id_created_at_idx on public.print_job_events(job_id, created_at);

drop function if exists public.create_customer_print_job(uuid,text,text,bigint,integer,text,boolean,text);

create or replace function public.create_customer_print_job(
  p_merchant_id uuid,
  p_original_filename text,
  p_storage_path text,
  p_size_bytes bigint,
  p_sha256 text,
  p_idempotency_key uuid,
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
  if p_size_bytes <= 0 then raise exception 'Invalid file size'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Invalid file checksum'; end if;

  insert into public.print_files (storage_key, storage_path, original_filename, size_bytes, mime_type, sha256)
  values (p_storage_path, p_storage_path, p_original_filename, p_size_bytes, 'application/pdf', p_sha256)
  returning id into v_file_id;

  insert into public.print_jobs (public_id, merchant_id, file_id, status, copies, color_mode, duplex, paper_size, idempotency_key)
  values ('pmj_' || replace(gen_random_uuid()::text, '-', ''), p_merchant_id, v_file_id, 'QUEUED', p_copies, p_color_mode, p_duplex, p_paper_size, p_idempotency_key::text)
  returning id into v_job_id;

  update public.print_files set job_id = v_job_id where id = v_file_id;

  insert into public.print_job_events (job_id, event_type, status, message)
  values (v_job_id, 'CUSTOMER_UPLOAD_ACCEPTED', 'QUEUED', 'Customer PDF uploaded and queued for printing.');

  return v_job_id;
end;
$$;

revoke all on function public.create_customer_print_job(uuid,text,text,bigint,text,uuid,integer,text,boolean,text) from public;
grant execute on function public.create_customer_print_job(uuid,text,text,bigint,text,uuid,integer,text,boolean,text) to service_role;
