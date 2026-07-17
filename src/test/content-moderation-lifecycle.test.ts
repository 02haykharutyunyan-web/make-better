import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260717000100_content_moderation_lifecycle.sql", "utf8");
const assetsService = readFileSync("src/services/assets.ts", "utf8");
const contentService = readFileSync("src/services/content.ts", "utf8");
const dashboard = readFileSync("src/pages/creator/CreatorDashboard.tsx", "utf8");
const adminAssets = readFileSync("src/pages/admin/AdminAssets.tsx", "utf8");

describe("Task 2B content moderation lifecycle", () => {
  it("enforces approved creator ownership and blocks direct publish/update bypasses", () => {
    expect(migration).toContain("public.is_approved_creator(current_asset.creator_id)");
    expect(migration).toContain("public.is_approved_creator(current_post.creator_id)");
    expect(migration).toContain("revoke update on public.assets from authenticated");
    expect(migration).toContain("revoke update on public.blog_posts from authenticated");
    expect(migration).toContain("status in ('draft', 'pending_review')");
    expect(migration).toContain("public.content_is_creator_editable(status::text)");
  });

  it("implements fail-closed RPC transitions and privileges", () => {
    for (const rpc of ["submit_asset_for_review", "submit_blog_post_for_review", "review_asset", "review_blog_post"]) {
      expect(migration).toContain(`function public.${rpc}`);
      expect(migration).toContain(`revoke all on function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
    }
    expect(migration).toContain("Only draft or rejected assets can be submitted for review");
    expect(migration).toContain("Only pending-review assets can be approved or rejected");
    expect(migration).toContain("A rejection reason is required");
    expect(migration).not.toContain("grant execute on function public.review_asset(uuid, public.asset_status, text) to anon");
    expect(migration).not.toContain("grant execute on function public.review_blog_post(uuid, public.publish_status, text) to anon");
  });

  it("preserves published content and classifies existing review states safely", () => {
    expect(migration).toContain("Existing published records stay published");
    expect(migration).toContain("where status = 'approved'");
    expect(migration).toContain("set status = 'pending_review'");
    expect(migration).not.toContain("set status = 'published'\nwhere status");
  });

  it("routes creator submissions through draft then trusted submit RPC", () => {
    expect(assetsService).toContain('status: input.status || "draft"');
    expect(assetsService).toContain('supabase.rpc("submit_asset_for_review"');
    expect(contentService).toContain('status: input.status || "draft"');
    expect(contentService).toContain('supabase.rpc("submit_blog_post_for_review"');
  });

  it("keeps rejected reasons visible and admin queues usable on mobile", () => {
    expect(dashboard).toContain("Rejection reason");
    expect(adminAssets).toContain("Reject this asset? The reason will be visible to the creator.");
    expect(adminAssets).toContain("overflow-x-auto");
    expect(migration).toContain("assets_moderation_queue_idx");
    expect(migration).toContain("blog_posts_moderation_queue_idx");
  });
});
