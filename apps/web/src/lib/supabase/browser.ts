import { createBrowserClient } from "@supabase/ssr";
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase browser environment is not configured.");
  const client = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  if (typeof window !== "undefined") {
    const started = Number(window.localStorage.getItem("printmesh_session_started_at") ?? 0);
    if (started && Date.now() - started >= SESSION_MAX_AGE_MS) void client.auth.signOut();
    if (!started) void client.auth.getSession().then(({ data }) => { if (data.session) window.localStorage.setItem("printmesh_session_started_at", String(Date.now())); });
  }
  return client;
}
