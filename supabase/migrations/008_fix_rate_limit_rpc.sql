create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer default 60)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = public
as $$
declare current_window public.rate_limit_windows%rowtype; next_count integer;
begin
  if coalesce(length(p_key), 0) = 0 or coalesce(p_limit, 0) < 1 or coalesce(p_window_seconds, 0) < 1 then return query select false, coalesce(p_window_seconds, 0); return; end if;
  select * into current_window from public.rate_limit_windows where public.rate_limit_windows.key = p_key for update;
  if current_window.key is null or current_window.window_started_at + make_interval(secs => p_window_seconds) <= now() then
    insert into public.rate_limit_windows(key, window_started_at, request_count, updated_at) values (p_key, now(), 1, now())
      on conflict (key) do update set window_started_at=excluded.window_started_at, request_count=1, updated_at=now();
    return query select true, 0; return;
  end if;
  next_count := coalesce(current_window.request_count, 0) + 1;
  update public.rate_limit_windows set request_count=next_count, updated_at=now() where public.rate_limit_windows.key = p_key;
  return query select next_count <= p_limit, greatest(1, ceil(extract(epoch from (current_window.window_started_at + make_interval(secs => p_window_seconds) - now())))::integer);
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
