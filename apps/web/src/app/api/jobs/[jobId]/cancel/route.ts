import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const db = createSupabaseAdminClient();
  const { data: job } = await db.from("print_jobs").select("id,status").eq("public_id", jobId).maybeSingle();
  if (!job) return NextResponse.json({ error: "Print job not found." }, { status: 404 });
  if (job.status !== "QUEUED") return NextResponse.json({ error: "This print job can no longer be cancelled." }, { status: 409 });
  const { error } = await db.from("print_jobs").update({ status: "CANCELLED" }).eq("id", job.id).eq("status", "QUEUED");
  if (error) return NextResponse.json({ error: `Cancellation failed: ${error.message}` }, { status: 400 });
  await db.from("print_job_events").insert({ job_id: job.id, event_type: "CANCELLED", status: "CANCELLED", message: "Cancelled by customer." });
  return NextResponse.json({ status: "CANCELLED" });
}
