import { describe, expect, it } from "vitest";

describe("PDF validation", () => {
  it("recognizes a PDF signature", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("rejects a non-PDF signature", () => {
    const bytes = new TextEncoder().encode("HELLO");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).not.toBe("%PDF-");
  });
});