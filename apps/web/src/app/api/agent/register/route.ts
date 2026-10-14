import { NextResponse } from "next/server";
import { agentRegistrationSchema } from "@/lib/agent-contract";
import { issueOpaqueToken, sha256 } from "@/lib/agent-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { distributedRateLimit } from "@/lib/distributed-rate-limit";
import { requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

type EnrollmentRow = {
  id: string;
  merchant_id: string;
  expires_at: string;
  used_at: string | null;
  registered_agent_id: string | null;
};

export async function POST(request: Request) {
  try {
    const requestLimit = await distributedRateLimit(requestKey(request, "agent-register"), 5);
    if (!requestLimit.allowed) return NextResponse.json({ error: "Too many registration attempts." }, { status: 429, headers: { "retry-after": String(requestLimit.retryAfterSeconds) } });
    const enrollmentToken = request.headers.get("x-printmesh-enrollment-token")?.trim();
    if (!enrollmentToken) return NextResponse.json({ error: "Enrollment token is required." }, { status: 401 });

    const parsed = agentRegistrationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid registration request." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("agent_enrollment_tokens")
      .select("id,merchant_id,expires_at,used_at,registered_agent_id")
      .eq("token_hash", sha256(enrollmentToken))
      .maybeSingle();
    const enrollment = enrollmentData as EnrollmentRow | null;

    if (enrollmentError || !enrollment || new Date(enrollment.expires_at) <= new Date()) {
      return NextResponse.json({ error: "Enrollment token is invalid or expired." }, { status: 401 });
    }

    const { data: existingData, error: existingError } = await supabase
      .from("agent_instances")
      .select("id,merchant_id")
      .eq("installation_id", parsed.data.installationId)
      .maybeSingle();
    const existing = existingData as { id: string; merchant_id: string } | null;
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

    if (enrollment.used_at && enrollment.registered_agent_id !== existing?.id) {
      return NextResponse.json({ error: "Enrollment token was already used." }, { status: 409 });
    }
    if (existing && existing.merchant_id !== enrollment.merchant_id) {
      return NextResponse.json({ error: "Installation belongs to another merchant." }, { status: 409 });
    }

    const secret = issueOpaqueToken("pmasec");
    const changes = {
      merchant_id: enrollment.merchant_id,
      installation_id: parsed.data.installationId,
      name: parsed.data.machineName,
      version: parsed.data.version,
      auth_secret_hash: sha256(secret),
      status: "ONLINE",
      last_seen_at: new Date().toISOString(),
    };

    const { data: agentData, error: agentError } = existing
      ? await supabase.from("agent_instances").update(changes).eq("id", existing.id).select("id").single()
      : await supabase.from("agent_instances").insert(changes).select("id").single();
    const agent = agentData as { id: string } | null;
    if (agentError || !agent) return NextResponse.json({ error: agentError?.message ?? "Agent registration failed." }, { status: 502 });

    const { error: consumedError } = await supabase
      .from("agent_enrollment_tokens")
      .update({ used_at: new Date().toISOString(), registered_agent_id: agent.id })
      .eq("id", enrollment.id);
    if (consumedError) return NextResponse.json({ error: consumedError.message }, { status: 502 });

    return NextResponse.json({ agentId: agent.id, agentToken: `${agent.id}.${secret}`, heartbeatIntervalSeconds: 30 }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed." }, { status: 400 });
  }
}
