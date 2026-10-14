import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ printerId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("merchant_users").select("merchant_id").eq("auth_user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "No merchant assigned" }, { status: 403 });
  const { printerId } = await context.params;
  const { data: printer } = await supabase.from("printers").select("id,merchant_id,agent_instance_id,windows_printer_name,is_available").eq("id", printerId).eq("merchant_id", membership.merchant_id).maybeSingle();
  if (!printer) return NextResponse.json({ error: "Printer not found" }, { status: 404 });
  if (!printer.is_available || !printer.windows_printer_name) return NextResponse.json({ error: "Printer is unavailable" }, { status: 409 });
  const { error } = await supabase.from("agent_instances").update({ selected_windows_printer_name: printer.windows_printer_name, printer_id: printer.id }).eq("id", printer.agent_instance_id).eq("merchant_id", membership.merchant_id);
  if (error) return NextResponse.json({ error: "Could not select printer" }, { status: 502 });
  return NextResponse.json({ selected: true, printerId: printer.id, printerName: printer.windows_printer_name });
}
