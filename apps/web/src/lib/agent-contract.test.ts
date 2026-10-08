import { describe, expect, it } from "vitest";
import { constantTimeMatches, issueOpaqueToken, sha256 } from "@/lib/agent-auth";
import { agentHeartbeatSchema, agentJobStatusSchema } from "@/lib/agent-contract";

describe("Windows agent API contract", () => {
  it("issues opaque secrets that verify only by their hash", () => {
    const secret = issueOpaqueToken("pmenroll");
    expect(constantTimeMatches(sha256(secret), secret)).toBe(true);
    expect(constantTimeMatches(sha256(secret), `${secret}x`)).toBe(false);
  });

  it("rejects a selected printer that was not discovered", () => {
    const result = agentHeartbeatSchema.safeParse({
      machineName: "merchant-pc",
      version: "1.0.0",
      selectedWindowsPrinterName: "Unknown printer",
      printers: [{ name: "Known printer", isValid: true }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an idempotent terminal status payload", () => {
    const result = agentJobStatusSchema.safeParse({
      claimToken: "this-is-a-long-enough-claim-token",
      status: "COMPLETED",
    });
    expect(result.success).toBe(true);
  });
});
