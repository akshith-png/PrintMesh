import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/agent-auth";
import { agentHeartbeatSchema } from "@/lib/agent-contract";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PrinterRow = { id: string; public_id: string; windows_printer_name: string | null };

export async function POST(request: Request) {
  try {
    const agent = await authenticateAgent(request);
    if (!agent) return NextResponse.json({ error: "Unauthorized agent." }, { status: 401 });

    const parsed = agentHeartbeatSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid heartbeat." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: knownData, error: knownError } = await supabase
      .from("printers")
      .select("id,public_id,windows_printer_name")
      .eq("merchant_id", agent.merchantId)
      .eq("agent_instance_id", agent.id);
    if (knownError) return NextResponse.json({ error: knownError.message }, { status: 502 });
    const known = (knownData ?? []) as PrinterRow[];
    const knownByName = new Map(known.filter((printer) => printer.windows_printer_name).map((printer) => [printer.windows_printer_name as string, printer]));

    // A new discovery replaces availability from the previous heartbeat.
    const { error: unavailableError } = await supabase
      .from("printers")
      .update({ is_available: false, status: "OFFLINE" })
      .eq("agent_instance_id", agent.id);
    if (unavailableError) return NextResponse.json({ error: unavailableError.message }, { status: 502 });

    const now = new Date().toISOString();
    const printerRows = parsed.data.printers.map((printer) => ({
      public_id: knownByName.get(printer.name)?.public_id ?? `pmp_${randomUUID().replaceAll("-", "")}`,
      merchant_id: agent.merchantId,
      agent_instance_id: agent.id,
      name: printer.name,
      windows_printer_name: printer.name,
      capabilities: { windowsDiscovery: true },
      status: printer.isValid ? "ACTIVE" : "OFFLINE",
      is_available: printer.isValid,
      last_seen_at: now,
    }));

    let syncedPrinters: PrinterRow[] = [];
    if (printerRows.length) {
      const { data, error } = await supabase
        .from("printers")
        .upsert(printerRows, { onConflict: "merchant_id,agent_instance_id,windows_printer_name" })
        .select("id,public_id,windows_printer_name");
      if (error) return NextResponse.json({ error: error.message }, { status: 502 });
      syncedPrinters = (data ?? []) as PrinterRow[];
    }

    const requestedByMerchant = agent.selectedWindowsPrinterName;
    const selectedName = requestedByMerchant && syncedPrinters.some((printer) => printer.windows_printer_name === requestedByMerchant)
      ? requestedByMerchant
      : parsed.data.selectedWindowsPrinterName;
    const selected = syncedPrinters.find((printer) => printer.windows_printer_name === selectedName) ?? null;
    const { error: agentError } = await supabase
      .from("agent_instances")
      .update({
        name: parsed.data.machineName,
        version: parsed.data.version,
        status: "ONLINE",
        last_seen_at: now,
        selected_windows_printer_name: selected?.windows_printer_name ?? null,
        printer_id: selected?.id ?? null,
      })
      .eq("id", agent.id);
    if (agentError) return NextResponse.json({ error: agentError.message }, { status: 502 });

    return NextResponse.json({
      status: "ONLINE",
      selectedPrinterId: selected?.id ?? null,
      selectedPrinterName: selected?.windows_printer_name ?? null,
      desiredPrinterName: selected?.windows_printer_name ?? null,
      printers: syncedPrinters.map((printer) => ({ id: printer.id, name: printer.windows_printer_name })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Heartbeat failed." }, { status: 400 });
  }
}
