import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/production-free-asset-qa.yml", "utf8");
const runner = readFileSync("scripts/production-free-asset-qa.mjs", "utf8");

describe("production free-asset QA workflow security contract", () => {
  it("is manual-only, main-only, serialized, and minimally privileged", () => {
    expect(workflow).toMatch(/on:\s*\n\s+workflow_dispatch:\s*\n/);
    expect(workflow).not.toMatch(/^\s+(push|pull_request):/m);
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("group: production-free-asset-qa");
    expect(workflow).toContain("environment: production-qa");
    expect(workflow).toContain("timeout-minutes: 20");
  });

  it("sources each credential from secrets only in the test and cleanup steps", () => {
    for (const name of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_AUTOMATION_BYPASS_SECRET"]) {
      expect(workflow).toContain(`${name}: \${{ secrets.${name} }}`);
      expect(workflow).not.toContain(`${name}: \${{ vars.${name} }}`);
    }
    expect(workflow).toContain("if: ${{ always() }}");
  });

  it("tracks current-run resources and contains all required authorization checks", () => {
    expect(runner).toContain(".production-qa-state.json");
    expect(runner).toContain("state.storagePaths");
    expect(runner).toContain("state.assetIds");
    expect(runner).toContain("state.userIds");
    for (const check of [
      "duplicate claim",
      "exactly one claim row",
      "My Assets visibility",
      "claimant deliverable access",
      "anonymous deliverable denied",
      "authenticated non-claimant deliverable denied",
      "unpublished asset denied",
      "paid asset denied",
    ]) expect(runner).toContain(check);
  });
});
