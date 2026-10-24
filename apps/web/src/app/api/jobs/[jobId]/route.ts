import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.union([z.string().uuid(), z.string().regex(/^pmj_[a-f0-9]{32}$/)]);

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  if (!idSchema.safeParse(jobId).success) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  if (jobId === "pmj_00000000000000000000000000000001") {
    return NextResponse.json({ job: { id: jobId, public_id: jobId, merchant_id: "00000000-0000-0000-0000-000000000001", status: "QUEUED", copies: 1, color_mode: "BW", duplex: false, paper_size: "A4", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), print_files: { original_filename: "demo-document.pdf", size_bytes: 0, mime_type: "application/pdf" } }, events: [{ id: "demo-event", status: "QUEUED", message: "Demo job accepted. Connect Supabase and a Windows agent for live printing.", created_at: new Date().toISOString() }], demo: true });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = createSupabaseAdminClient();
  const jobQuery = supabase
    .from("print_jobs")
    .select("id,public_id,merchant_id,status,copies,color_mode,duplex,paper_size,created_at,updated_at,print_files(original_filename,size_bytes,mime_type)");
  const { data: job, error } = await (jobId.startsWith("pmj_")
    ? jobQuery.eq("public_id", jobId)
    : jobQuery.eq("id", jobId)).single();

  if (error || !job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const { data: events } = await supabase
    .from("print_job_events")
    .select("id,status,message,created_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ job, events: events ?? [] });
}
