-- PrintMesh V1 core database schema
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

create type merchant_status as enum ('ACTIVE','DISABLED');
create type printer_status as enum ('ACTIVE','DISABLED','OFFLINE');
create type job_status as enum ('CREATED','UPLOADED','QUEUED','CLAIMED','PRINTING','COMPLETED','FAILED','CANCELLED');

create table merchants (
    id uuid primary key default gen_random_uuid(),
    public_id text not null unique,
    name text not null,
    address text,
    phone text,
    status merchant_status not null default 'ACTIVE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table printers (
    id uuid primary key default gen_random_uuid(),
    public_id text not null unique,
    merchant_id uuid not null references merchants(id) on delete cascade,
    name text not null,
    manufacturer text,
    model text,
    windows_printer_name text,
    capabilities jsonb not null default '{}'::jsonb,
    status printer_status not null default 'OFFLINE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table agent_instances (
    id uuid primary key default gen_random_uuid(),
    printer_id uuid references printers(id) on delete set null,
    installation_id text not null unique,
    version text not null,
    last_seen_at timestamptz,
    status text not null default 'OFFLINE',
    created_at timestamptz not null default now()
);

create table print_files (
    id uuid primary key default gen_random_uuid(),
    storage_key text not null unique,
    original_filename text not null,
    mime_type text not null,
    size_bytes bigint not null,
    sha256 text not null,
    created_at timestamptz not null default now(),
    expires_at timestamptz
);

create table print_jobs (
    id uuid primary key default gen_random_uuid(),
    public_id text not null unique,
    merchant_id uuid not null references merchants(id),
    printer_id uuid references printers(id),
    file_id uuid not null references print_files(id),
    copies integer not null default 1 check (copies between 1 and 100),
    color_mode text not null default 'BW',
    duplex boolean not null default false,
    paper_size text not null default 'A4',
    status job_status not null default 'CREATED',
    attempt_count integer not null default 0,
    idempotency_key text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    claimed_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    failed_at timestamptz,
    error_code text,
    error_message text
);

create table print_job_events (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references print_jobs(id) on delete cascade,
    event_type text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index idx_printers_merchant on printers(merchant_id);
create index idx_jobs_merchant_status on print_jobs(merchant_id,status);
create index idx_jobs_printer_status on print_jobs(printer_id,status);
create index idx_jobs_created_at on print_jobs(created_at);
create index idx_job_events_job on print_job_events(job_id);
