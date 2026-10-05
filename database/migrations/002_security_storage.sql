create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists merchants_updated_at on public.merchants;
create trigger merchants_updated_at before update on public.merchants for each row execute function public.set_updated_at();
drop trigger if exists printers_updated_at on public.printers;
create trigger printers_updated_at before update on public.printers for each row execute function public.set_updated_at();
drop trigger if exists print_jobs_updated_at on public.print_jobs;
create trigger print_jobs_updated_at before update on public.print_jobs for each row execute function public.set_updated_at();

alter table public.merchants enable row level security;
alter table public.printers enable row level security;
alter table public.agent_instances enable row level security;
alter table public.print_files enable row level security;
alter table public.print_jobs enable row level security;
alter table public.print_job_events enable row level security;

-- V1 starts with service/API access only. Customer and merchant policies will be added with authenticated user mapping in the next backend block.
create policy service_role_merchants on public.merchants for all to service_role using (true) with check (true);
create policy service_role_printers on public.printers for all to service_role using (true) with check (true);
create policy service_role_agents on public.agent_instances for all to service_role using (true) with check (true);
create policy service_role_files on public.print_files for all to service_role using (true) with check (true);
create policy service_role_jobs on public.print_jobs for all to service_role using (true) with check (true);
create policy service_role_job_events on public.print_job_events for all to service_role using (true) with check (true);

insert into storage.buckets (id, name, public)
values ("print-files", "print-files", false)
on conflict (id) do update set public = false;

create policy print_files_service_insert on storage.objects for insert to service_role with check (bucket_id = "print-files");
create policy print_files_service_select on storage.objects for select to service_role using (bucket_id = "print-files");
create policy print_files_service_delete on storage.objects for delete to service_role using (bucket_id = "print-files");