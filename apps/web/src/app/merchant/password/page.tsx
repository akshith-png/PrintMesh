import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MerchantPasswordForm from "./MerchantPasswordForm";

export default async function MerchantPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/merchant/login");
  return <MerchantPasswordForm />;
}
