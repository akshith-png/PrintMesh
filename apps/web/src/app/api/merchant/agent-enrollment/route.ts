import { NextResponse } from "next/server";
import { z } from "zod";
import { issueOpaqueToken, sha256 } from "@/lib/agent-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({
  expiresInMinutes: z.coerce.number().int().min(10).max(1440).default(60),
});

export async function POST(request: Request) {
  try {
    const requestLimit = rateLimit(requestKey(request, "merchant-enrollment"), 10);
    if (!requestLimit.allowed) return NextResponse.json({ error: "Too many enrollment requests." }, { status: 429, headers: { "retry-after": String(requestLimit.retryAfterSeconds) } });
    const userClient = await createSupabaseServerClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: membership, error: membershipError } = await userClient
      .from("merchant_users")
      .select("merchant_id,role")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
    if (!membership || membership.role !== "merchant_admin") return NextResponse.json({ error: "Only a merchant admin can enroll an agent." }, { status: 403 });

    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid enrollment request." }, { status: 400 });
    const enrollmentToken = issueOpaqueToken("pmenroll");
    const expiresAt = new Date(Date.now() + parsed.data.expiresInMinutes * 60_000).toISOString();
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("agent_enrollment_tokens").insert({
      merchant_id: membership.merchant_id,
      token_hash: sha256(enrollmentToken),
      expires_at: expiresAt,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });

    // The raw enrollment token is intentionally returned once and never stored in the database.
    return NextResponse.json({ enrollmentToken, expiresAt }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enrollment token creation failed." }, { status: 400 });
  }
}
