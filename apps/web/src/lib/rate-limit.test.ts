import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("API rate limiter", () => {
  it("allows the configured burst and rejects the next request", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(rateLimit(key, 2).allowed).toBe(true);
    expect(rateLimit(key, 2).allowed).toBe(true);
    expect(rateLimit(key, 2).allowed).toBe(false);
  });
});
