-- PrintMesh V1 core database schema
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

create type merchant_status as enum ('ACTIVE','DISABLED');
create type printer_status as enum ('ACTIVE','DISABLED','OFFLINE');
create type job_status as enum ('CREATED','UPLOADED','QUEUED','CLAIMED','PRINTING','COMPLETED','FAILED','CANCELLED');

create table public.merchants (
    id uuid primary key default gen_random_uuid(),
    public_id text not null unique,
    name text not null,
    address text,
    phone text,
    status merchant_status not null default 'ACTIVE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.agent_instances (
    id uuid primary key default gen_random_uuid(),
    merchant_id uuid not null references public.merchants(id) on delete cascade,
    installation_id text not null unique,
    name text not null default 'PrintMesh Agent',
    version text not null,
    auth_secret_hash text,
    status text not null default 'OFFLINE' check (status in ('ONLINE','OFFLINE','REVOKED')),
    selected_windows_printer_name text,
    printer_id uuid,
    last_seen_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.printers (
    id uuid primary key default gen_random_uuid(),
    public_id text not null unique,
    merchant_id uuid not null references public.merchants(id) on delete cascade,
    agent_instance_id uuid references public.agent_instances(id) on delete set null,
    name text not null,
    manufacturer text,
    model text,
    windows_printer_name text,
    capabilities jsonb not null default '{}'::jsonb,
    status printer_status not null default 'OFFLINE',
    is_available boolean not null default false,
    last_seen_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.agent_instances
  add constraint agent_instances_printer_id_fkey
  foreign key (printer_id) references public.printers(id) on delete set null;

create table public.print_files (
    id uuid primary key default gen_random_uuid(),
    job_id uuid,
    storage_key text not null unique,
    storage_path text not null unique,
    original_filename text not null,
    mime_type text not null check (mime_type = 'application/pdf'),
    size_bytes bigint not null check (size_bytes > 0),
    sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
    created_at timestamptz not null default now(),
    expires_at timestamptz
);

create table public.print_jobs (
    id uuid primary key default gen_random_uuid(),
    public_id text not null unique,
    merchant_id uuid not null references public.merchants(id),
    printer_id uuid references public.printers(id),
    file_id uuid not null references public.print_files(id),
    copies integer not null default 1 check (copies between 1 and 100),
    color_mode text not null default 'BW' check (color_mode in ('BW','COLOR')),
    duplex boolean not null default false,
    paper_size text not null default 'A4' check (paper_size in ('A4','A3','LETTER')),
    status job_status not null default 'CREATED',
    attempt_count integer not null default 0,
    idempotency_key text not null unique,
    claimed_by_agent_id uuid references public.agent_instances(id),
    claim_token_hash text,
    claim_expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    claimed_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    failed_at timestamptz,
    error_code text,
    error_message text
);

alter table public.print_files
  add constraint print_files_job_id_fkey
  foreign key (job_id) references public.print_jobs(id) on delete cascade;

create table public.print_job_events (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references public.print_jobs(id) on delete cascade,
    event_type text not null,
    status job_status,
    message text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table public.agent_enrollment_tokens (
    id uuid primary key default gen_random_uuid(),
    merchant_id uuid not null references public.merchants(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    registered_agent_id uuid references public.agent_instances(id) on delete set null,
    created_at timestamptz not null default now()
);

create index idx_printers_merchant on public.printers(merchant_id);
create unique index idx_printers_agent_windows_name on public.printers(merchant_id, agent_instance_id, windows_printer_name) where windows_printer_name is not null;
create index idx_jobs_merchant_status on public.print_jobs(merchant_id,status);
create index idx_jobs_printer_status on public.print_jobs(printer_id,status);
create index idx_jobs_created_at on public.print_jobs(created_at);
create index idx_job_events_job on public.print_job_events(job_id);
create index idx_agents_merchant_last_seen on public.agent_instances(merchant_id,last_seen_at desc);
create index idx_agent_enrollment_tokens_merchant_expiry on public.agent_enrollment_tokens(merchant_id,expires_at);
