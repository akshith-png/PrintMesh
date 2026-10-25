"use client";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
export function MerchantLogoutButton(){const router=useRouter();async function logout(){await createSupabaseBrowserClient().auth.signOut();router.replace("/merchant/login");router.refresh();}return <button className="secondary-button" type="button" onClick={logout}>Sign out</button>}
