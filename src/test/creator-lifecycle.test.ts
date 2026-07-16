import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260716000200_creator_application_lifecycle.sql", "utf8");
const creatorsService = readFileSync("src/services/creators.ts", "utf8");
const adminCreators = readFileSync("src/pages/admin/AdminCreators.tsx", "utf8");
const dashboard = readFileSync("src/pages/creator/CreatorDashboard.tsx", "utf8");
const signup = readFileSync("src/pages/CreatorSignupPage.tsx", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const approvalGate = readFileSync("src/components/CreatorApprovalGate.tsx", "utf8");
const preflight = readFileSync("supabase/audit/task_2a_creator_lifecycle_preflight.sql", "utf8");
const verification = readFileSync("supabase/audit/task_2a_creator_lifecycle_verification.sql", "utf8");

describe("creator application lifecycle", () => {
  it("defaults new applications to pending while explicitly preserving established creators", () => {
    expect(migration).toContain("alter column application_status set default 'pending'");
    expect(migration).toContain("application_status = case");
    expect(migration).toContain("assets.status = 'published'");
    expect(migration).toContain("blog_posts.status = 'published'");
    expect(migration).toContain("creator.profile_id is null");
    expect(creatorsService).toContain('application_status: "pending"');
  });

  it("moves review and reapplication into fail-closed trusted RPCs", () => {
    expect(migration).toContain("create or replace function public.review_creator_application");
    expect(migration).toContain("Only pending creator applications can be reviewed");
    expect(migration).toContain("Admins cannot review their own creator application");
    expect(migration).toContain("create or replace function public.reapply_creator_application");
    expect(migration).toContain("Only rejected applications can be resubmitted");
    expect(migration).toContain("revoke update on public.creators from authenticated");
    expect(creatorsService).toContain('supabase.rpc("review_creator_application"');
    expect(creatorsService).toContain('supabase.rpc("reapply_creator_application"');
  });

  it("requires explicit rejection input and does not review from the queue shortcut", () => {
    expect(migration).toContain("A rejection reason is required");
    expect(adminCreators).toContain("Reject with reason");
    expect(adminCreators).toContain("Review rejection");
    expect(adminCreators).not.toContain('setSelected(c); review(c, "rejected")');
    expect(adminCreators).toContain("window.confirm");
  });

  it("allows only approved creators to reach and use submission flows", () => {
    expect(migration).toContain("public.is_approved_creator(creator_id)");
    expect(migration).toContain("approved creators can submit own assets");
    expect(migration).toContain("approved creators can submit own blog posts");
    expect(creatorsService).toContain("assertCreatorApproved(creator)");
    expect(app).toContain("<CreatorApprovalGate><SubmitAssetPage /></CreatorApprovalGate>");
    expect(app).toContain("<CreatorApprovalGate><EditAssetPage /></CreatorApprovalGate>");
    expect(approvalGate).toContain('creator?.application_status === "approved" && creator.active');
  });

  it("surfaces pending, rejected, and resubmission states", () => {
    expect(dashboard).toContain("Application pending review");
    expect(dashboard).toContain("Your creator application was rejected.");
    expect(dashboard).toContain("Resubmit application");
    expect(dashboard).toContain("paid-listing tools unlock only after admin approval");
    expect(signup).toContain("Application starts pending");
  });

  it("ships SELECT-only rollout gates with explicit stop conditions", () => {
    expect(preflight.trimStart().startsWith("--")).toBe(true);
    expect(preflight).toContain("ready_for_migration");
    expect(preflight).toContain("manual_review_required");
    expect(preflight).toContain("STOP:");
    expect(verification).toContain("verification_passed");
    expect(verification).toContain("anon_cannot_review_rpc");
    expect(verification).toContain("asset_approval_policy_present");
  });
});
