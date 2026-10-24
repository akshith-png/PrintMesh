import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireOwner() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return null;
  }
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = (process.env.PRINTMESH_OWNER_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!user || !user.email || !allowed.includes(user.email.toLowerCase())) return null;
  return { supabase, user };
}
