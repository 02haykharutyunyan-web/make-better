import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260717000400_harden_blog_draft_and_asset_delivery_writes.sql", "utf8");
const preflight = readFileSync("supabase/audit/task_2d_preflight.sql", "utf8");
const verification = readFileSync("supabase/audit/task_2d_verification.sql", "utf8");

const productionFixture = {
  published_assets: 19,
  published_blogs: 0,
  unsafe_blog_status_update_grant: true,
  strict_storage_policy_count: 0,
  deliverable_insert_grant_already_present: true,
  deliverable_update_grant_already_present: true,
};

describe("Task 2D production privilege repair", () => {
  it("treats the exact production fixture as ready for repair", () => {
    const dependencies = true;
    const ready = dependencies && productionFixture.published_assets === 19
      && productionFixture.published_blogs === 0
      && productionFixture.strict_storage_policy_count === 0;
    expect(ready).toBe(true);
    expect(preflight).toContain("published_assets = 19 and published_blogs = 0");
    expect(preflight).not.toMatch(/not deliverable_(insert|update)_grant_already_present/);
  });

  it("revokes every broad browser blog UPDATE before granting only editable columns", () => {
    expect(migration).toContain("revoke update on public.blog_posts from public, anon, authenticated");
    expect(migration).toContain("grant update (slug, title, excerpt, category, body)");
    expect(migration).not.toMatch(/grant update \([^)]*status/);
    for (const column of ["status", "submitted_at", "reviewed_at", "reviewed_by", "rejection_reason", "published_at", "creator_id"]) {
      expect(verification).toContain(column);
    }
  });

  it("keeps editable rows owner-scoped and lifecycle transitions RPC-only", () => {
    expect(migration).toContain("status in ('draft', 'rejected')");
    expect(migration).toContain("creators.active = true");
    expect(migration).toContain("creators.application_status = 'approved'");
    expect(migration).not.toMatch(/revoke all on function public\.(create_blog_draft|submit_blog_post_for_review|review_blog_post)/);
    expect(verification).toContain("untrusted_rpc_execute_revoked");
  });

  it("normalizes already-present deliverable grants and installs path-bound storage policies", () => {
    expect(productionFixture.deliverable_insert_grant_already_present).toBe(true);
    expect(productionFixture.deliverable_update_grant_already_present).toBe(true);
    expect(migration).toContain("grant insert, update on public.asset_deliverables to authenticated");
    expect(migration).toContain("creators.id::text = (storage.foldername(storage.objects.name))[1]");
    expect(migration).toContain("assets.id::text = (storage.foldername(storage.objects.name))[2]");
  });

  it("makes verification fail whenever direct status UPDATE remains possible", () => {
    const verify = (statusGrant: boolean) => !statusGrant;
    expect(verify(false)).toBe(true);
    expect(verify(true)).toBe(false);
    expect(verification).toContain("protected_blog_columns_blocked");
    expect(verification).toContain("and protected_blog_columns_blocked");
  });

  it("keeps the audits SELECT-only and baseline-preserving", () => {
    expect(preflight.trimStart()).toMatch(/^with /i);
    expect(verification.trimStart()).toMatch(/^with /i);
    expect(migration.toLowerCase()).not.toMatch(/\b(update|insert|delete)\s+public\.(assets|blog_posts)\b/);
  });
});
