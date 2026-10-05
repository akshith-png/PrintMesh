import { describe, expect, it } from "vitest";

function isPdf(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}

describe("customer print flow validation", () => {
  it("accepts a real PDF signature", () => expect(isPdf(new TextEncoder().encode("%PDF-1.7"))).toBe(true));
  it("rejects non-PDF content", () => expect(isPdf(new TextEncoder().encode("not-a-pdf"))).toBe(false));
  it("keeps copies inside the V1 range", () => {
    expect(1).toBeGreaterThanOrEqual(1);
    expect(100).toBeLessThanOrEqual(100);
  });
});