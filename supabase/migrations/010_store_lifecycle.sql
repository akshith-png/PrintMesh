alter table public.merchants add column if not exists lifecycle_status text not null default 'ACTIVE' check (lifecycle_status in ('DRAFT','PENDING','ACTIVE','OFFLINE','SUSPENDED','BLACKLISTED','ARCHIVED'));
alter table public.merchants add column if not exists status_reason text;
create index if not exists idx_merchants_lifecycle_status on public.merchants(lifecycle_status);
