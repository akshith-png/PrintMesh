import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  if (!idSchema.safeParse(jobId).success) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: job, error } = await supabase
    .from("print_jobs")
    .select("id,merchant_id,status,copies,color_mode,duplex,paper_size,created_at,updated_at,print_files(original_filename,size_bytes,mime_type)")
    .eq("id", jobId)
    .single();

  if (error || !job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const { data: events } = await supabase
    .from("print_job_events")
    .select("id,status,message,created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ job, events: events ?? [] });
}