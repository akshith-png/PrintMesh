create table if not exists public.rate_limit_windows (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_windows enable row level security;
revoke all on public.rate_limit_windows from anon, authenticated;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer default 60)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = public
as $$
declare current_window public.rate_limit_windows%rowtype;
declare next_count integer;
begin
  if length(p_key) = 0 or p_limit < 1 or p_window_seconds < 1 then
    return query select false, p_window_seconds;
    return;
  end if;
  select * into current_window from public.rate_limit_windows where key = p_key for update;
  if not found or current_window.window_started_at + make_interval(secs => p_window_seconds) <= now() then
    insert into public.rate_limit_windows(key, window_started_at, request_count, updated_at)
      values (p_key, now(), 1, now())
      on conflict (key) do update set window_started_at=excluded.window_started_at, request_count=1, updated_at=now();
    return query select true, 0;
  end if;
  next_count := current_window.request_count + 1;
  update public.rate_limit_windows set request_count=next_count, updated_at=now() where key=p_key;
  return query select next_count <= p_limit, greatest(1, ceil(extract(epoch from (current_window.window_started_at + make_interval(secs => p_window_seconds) - now())))::integer);
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
