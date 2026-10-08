import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAgent, sha256 } from "@/lib/agent-auth";
import { agentJobStatusSchema } from "@/lib/agent-contract";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const agent = await authenticateAgent(request);
    if (!agent) return NextResponse.json({ error: "Unauthorized agent." }, { status: 401 });
    const { jobId } = await context.params;
    if (!z.string().uuid().safeParse(jobId).success) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
    const parsed = agentJobStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid status report." }, { status: 400 });
    if (parsed.data.status === "FAILED" && !parsed.data.errorCode) {
      return NextResponse.json({ error: "A failed job requires an error code." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("report_agent_job_status", {
      p_agent_id: agent.id,
      p_job_id: jobId,
      p_claim_token_hash: sha256(parsed.data.claimToken),
      p_status: parsed.data.status,
      p_error_code: parsed.data.errorCode ?? null,
      p_error_message: parsed.data.errorMessage ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Status report failed." }, { status: 400 });
  }
}
