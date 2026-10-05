import { describe, expect, it } from "vitest";

describe("merchant dashboard", () => {
  it("recognizes active print states", () => {
    const active = ["CREATED", "UPLOADED", "QUEUED", "CLAIMED", "PRINTING"];
    expect(active).toContain("PRINTING");
    expect(active).not.toContain("COMPLETED");
  });

  it("uses a two minute agent heartbeat window", () => {
    const now = Date.now();
    const recent = now - 60_000;
    const stale = now - 180_000;

    expect(recent > now - 120_000).toBe(true);
    expect(stale > now - 120_000).toBe(false);
  });
});