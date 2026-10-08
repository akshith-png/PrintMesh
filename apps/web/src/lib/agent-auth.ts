import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuthenticatedAgent = {
  id: string;
  merchantId: string;
  status: string;
};

type AgentRow = {
  id: string;
  merchant_id: string | null;
  status: string;
  auth_secret_hash: string | null;
};

export function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function issueOpaqueToken(prefix: string) {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function constantTimeMatches(expectedHash: string | null | undefined, value: string) {
  if (!expectedHash) return false;
  const actual = Buffer.from(sha256(value), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function readBearerToken(request: Request) {
  const value = request.headers.get("authorization")?.trim();
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length).trim() || null;
}

export async function authenticateAgent(request: Request): Promise<AuthenticatedAgent | null> {
  const token = readBearerToken(request);
  if (!token) return null;

  const separator = token.indexOf(".");
  if (separator < 1 || separator === token.length - 1) return null;
  const agentId = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_instances")
    .select("id,merchant_id,status,auth_secret_hash")
    .eq("id", agentId)
    .maybeSingle();

  const agent = data as AgentRow | null;
  if (error || !agent || !agent.merchant_id || agent.status === "REVOKED") return null;
  if (!constantTimeMatches(agent.auth_secret_hash, secret)) return null;

  return { id: agent.id, merchantId: agent.merchant_id, status: agent.status };
}
