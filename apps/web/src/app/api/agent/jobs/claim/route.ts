import { NextResponse } from "next/server";
import { authenticateAgent, issueOpaqueToken, sha256 } from "@/lib/agent-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ClaimedJob = {
  job_id: string;
  original_filename: string;
  sha256: string;
  copies: number;
  color_mode: string;
  duplex: boolean;
  paper_size: string;
};

export async function POST(request: Request) {
  try {
    const agent = await authenticateAgent(request);
    if (!agent) return NextResponse.json({ error: "Unauthorized agent." }, { status: 401 });

    const claimToken = issueOpaqueToken("pmclaim");
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("claim_next_print_job", {
      p_agent_id: agent.id,
      p_claim_token_hash: sha256(claimToken),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });

    const job = (data as ClaimedJob[] | null)?.[0];
    if (!job) return NextResponse.json({ job: null });
    return NextResponse.json({
      job: {
        id: job.job_id,
        originalFilename: job.original_filename,
        sha256: job.sha256,
        copies: job.copies,
        colorMode: job.color_mode,
        duplex: job.duplex,
        paperSize: job.paper_size,
        claimToken,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Claim failed." }, { status: 400 });
  }
}
