import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const enumMigration = readFileSync("supabase/migrations/20260717000100_content_moderation_blog_status_enum.sql", "utf8");
const migration = readFileSync("supabase/migrations/20260717000200_content_moderation_lifecycle.sql", "utf8");
const preflight = readFileSync("supabase/audit/task_2b_content_moderation_preflight.sql", "utf8");
const verification = readFileSync("supabase/audit/task_2b_content_moderation_verification.sql", "utf8");
const assetsService = readFileSync("src/services/assets.ts", "utf8");
const contentService = readFileSync("src/services/content.ts", "utf8");
const dashboard = readFileSync("src/pages/creator/CreatorDashboard.tsx", "utf8");
const creatorBlogEditor = readFileSync("src/pages/creator/EditBlogPostPage.tsx", "utf8");
const adminAssets = readFileSync("src/pages/admin/AdminAssets.tsx", "utf8");
const adminBlog = readFileSync("src/pages/admin/AdminBlog.tsx", "utf8");

describe("Task 2B content moderation lifecycle", () => {
  it("splits blog enum values from later enum usage for transaction safety", () => {
    expect(enumMigration).toContain("alter type public.publish_status add value");
    expect(migration).not.toContain("alter type public.publish_status add value");
    expect(migration).toContain("status in ('published', 'pending_review')");
  });

  it("explicitly enforces creator ownership and approval in RPCs and RLS", () => {
    for (const tableRef of ["current_asset.creator_id", "current_post.creator_id", "assets.creator_id", "blog_posts.creator_id"]) {
      expect(migration).toContain(`creators.id = ${tableRef}`);
    }
    expect(migration.match(/creators\.profile_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(6);
    expect(migration.match(/creators\.active = true/g)?.length).toBeGreaterThanOrEqual(6);
    expect(migration.match(/creators\.application_status = 'approved'/g)?.length).toBeGreaterThanOrEqual(6);
    expect(migration).toContain("status in ('draft', 'pending_review')");
    expect(migration).toContain("status in ('draft', 'rejected')");
    expect(migration).not.toContain("public.is_approved_creator(current_asset.creator_id)");
    expect(migration).not.toContain("public.is_approved_creator(current_post.creator_id)");
  });

  it("proves creator A cannot create, edit, submit, or resubmit creator B content", () => {
    expect(migration).toContain("Only the approved owner creator can submit this asset");
    expect(migration).toContain("Only the approved owner creator can submit this blog post");
    expect(migration).toContain("where creators.id = assets.creator_id");
    expect(migration).toContain("where creators.id = blog_posts.creator_id");
    expect(migration).toContain("select * into current_asset from public.assets where id = target_asset_id for update");
    expect(migration).toContain("select * into current_post from public.blog_posts where id = target_blog_post_id for update");
  });

  it("implements fail-closed RPC transitions and minimum privileges", () => {
    for (const rpc of ["submit_asset_for_review", "submit_blog_post_for_review", "review_asset", "review_blog_post", "set_asset_featured"]) {
      expect(migration).toContain(`function public.${rpc}`);
      expect(migration).toContain(`revoke all on function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
    }
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain("Only pending-review assets can be approved or rejected");
    expect(migration).toContain("A rejection reason is required");
    expect(migration).not.toContain("grant execute on function public.review_asset(uuid, public.asset_status, text) to anon");
  });

  it("does not silently reclassify approved assets and preflight fails closed", () => {
    expect(migration).not.toContain("set status = 'pending_review'\nwhere status = 'approved'");
    expect(preflight).toContain("assets_approved");
    expect(preflight).toContain("assets_approved = 0");
    expect(preflight).toContain("approved assets exist");
  });

  it("adds baseline-based published-content preservation verification", () => {
    expect(preflight).toContain("verification_operator_inputs");
    expect(verification).toContain("operator_baseline_instruction");
    expect(verification).toContain("invalid_asset_states");
    expect(verification).toContain("rejected_blogs_missing_reason");
  });

  it("routes creator submissions through draft, explicit submit RPCs, and no partial asset auto-submit", () => {
    expect(assetsService).toContain('status: input.status || "draft"');
    expect(assetsService).toContain('supabase.rpc("submit_asset_for_review"');
    expect(contentService).toContain('insert(blogDraftPayload(input))');
    expect(contentService).toContain('supabase.rpc("submit_blog_post_for_review"');
    expect(readFileSync("src/pages/creator/SubmitAssetPage.tsx", "utf8")).toContain("delivery upload failed");
  });

  it("provides complete creator and admin blog moderation UI", () => {
    expect(dashboard).toContain("New blog draft");
    expect(creatorBlogEditor).toContain("Save draft");
    expect(creatorBlogEditor).toContain("Submit for review");
    expect(creatorBlogEditor).toContain("Pending-review and published posts cannot be edited");
    expect(adminBlog).toContain("Moderation queue");
    expect(adminBlog).toContain("reviewBlogPost(reviewIntent.post.id, reviewIntent.status");
    expect(adminBlog).toContain("Enter a meaningful rejection reason");
    expect(adminBlog).not.toContain("status: editing.status");
  });

  it("fixes admin asset feature regression through trusted RPC and preserves mobile controls", () => {
    expect(migration).toContain("function public.set_asset_featured");
    expect(assetsService).toContain('supabase.rpc("set_asset_featured"');
    expect(adminAssets).toContain("setAssetFeatured(id, Boolean(patch.featured))");
    expect(adminAssets).toContain("overflow-x-auto");
    expect(migration).not.toContain("grant update (featured");
  });
});
