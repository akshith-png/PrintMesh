import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAgent, constantTimeMatches } from "@/lib/agent-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type JobFile = { storage_path: string; original_filename: string; mime_type: string };
type JobRow = { status: string; claimed_by_agent_id: string | null; claim_token_hash: string | null; print_files: JobFile | JobFile[] | null };

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const agent = await authenticateAgent(request);
    if (!agent) return NextResponse.json({ error: "Unauthorized agent." }, { status: 401 });
    const { jobId } = await context.params;
    if (!z.string().uuid().safeParse(jobId).success) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
    const claimToken = request.headers.get("x-printmesh-claim-token")?.trim();
    if (!claimToken) return NextResponse.json({ error: "Claim token is required." }, { status: 401 });

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("print_jobs")
      .select("status,claimed_by_agent_id,claim_token_hash,print_files(storage_path,original_filename,mime_type)")
      .eq("id", jobId)
      .eq("merchant_id", agent.merchantId)
      .maybeSingle();
    const job = data as JobRow | null;
    if (error || !job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    if (job.claimed_by_agent_id !== agent.id || !constantTimeMatches(job.claim_token_hash, claimToken) || !["CLAIMED", "PRINTING"].includes(job.status)) {
      return NextResponse.json({ error: "Job file is not available to this agent." }, { status: 403 });
    }

    const file = Array.isArray(job.print_files) ? job.print_files[0] : job.print_files;
    if (!file) return NextResponse.json({ error: "Job file metadata is missing." }, { status: 500 });
    const { data: pdf, error: downloadError } = await supabase.storage.from("print-files").download(file.storage_path);
    if (downloadError || !pdf) return NextResponse.json({ error: downloadError?.message ?? "Private PDF download failed." }, { status: 502 });

    return new NextResponse(pdf, {
      headers: {
        "content-type": file.mime_type,
        "content-disposition": `attachment; filename="${file.original_filename.replaceAll('"', "_")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Private PDF download failed." }, { status: 400 });
  }
}
