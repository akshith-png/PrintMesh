import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("job event retention migration", () => {
  it("deletes only old print_job_events and is service-role restricted", () => {
    const sql = readFileSync(resolve(process.cwd(), "database/migrations/006_block5_security_hardening.sql"), "utf8");
    expect(sql).toContain("delete from public.print_job_events");
    expect(sql).not.toContain("delete from public.job_events");
    expect(sql).toContain("grant execute on function public.prune_old_job_events(integer) to service_role");
  });
});
