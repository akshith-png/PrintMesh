import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function distributedRateLimit(key: string, limit: number) {
  try {
    const { data, error } = await createSupabaseAdminClient().rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: 60,
    });
    if (error || !data?.[0]) return { allowed: false, retryAfterSeconds: 60, unavailable: true };
    return { allowed: Boolean(data[0].allowed), retryAfterSeconds: Number(data[0].retry_after_seconds ?? 0), unavailable: false };
  } catch {
    return { allowed: false, retryAfterSeconds: 60, unavailable: true };
  }
}
