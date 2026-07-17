import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const contentService = readFileSync("src/services/content.ts", "utf8");
const errors = readFileSync("src/lib/supabase/errors.ts", "utf8");
const adminAssets = readFileSync("src/pages/admin/AdminAssets.tsx", "utf8");
const adminBlog = readFileSync("src/pages/admin/AdminBlog.tsx", "utf8");
const creatorBlog = readFileSync("src/pages/creator/EditBlogPostPage.tsx", "utf8");
const repair = readFileSync("supabase/migrations/20260717000300_repair_moderation_workflows.sql", "utf8");
const preflight = readFileSync("supabase/audit/task_2c_moderation_repair_preflight.sql", "utf8");
const verification = readFileSync("supabase/audit/task_2c_moderation_repair_verification.sql", "utf8");

describe("Task 2C moderation workflow repair contracts", () => {
  it("removes creator-side blog UPSERT and separates insert/update draft writes", () => {
    expect(contentService).toContain("export async function createBlogPost");
    expect(contentService).toContain('.from("blog_posts")\n    .insert(blogDraftPayload(input))');
    expect(contentService).toContain('.from("blog_posts")\n    .update(blogDraftPayload');
    expect(contentService.slice(contentService.indexOf("export async function createBlogPost"), contentService.indexOf("export async function listPublishedCollections"))).not.toContain("onConflict");
    expect(creatorBlog).toContain("createBlogPost(payload)");
  });

  it("does not browser-write protected lifecycle fields during blog saves", () => {
    expect(contentService).toContain('const editableBlogColumns = ["slug", "title", "excerpt", "category", "body", "creator_id", "status"]');
    for (const protectedField of ["published_at", "submitted_at", "reviewed_at", "reviewed_by", "rejection_reason"]) {
      expect(contentService).not.toContain(`${protectedField}: input`);
      expect(contentService).not.toContain(`${protectedField}: patch`);
    }
  });

  it("preserves exact RPC names, parameter keys, and returned-row handling", () => {
    expect(contentService).toContain('supabase.rpc("review_blog_post", {');
    expect(contentService).toContain("target_blog_post_id: blogPostId");
    expect(contentService).toContain("target_status: status");
    expect(contentService).toContain("rejection_reason:");
    expect(adminBlog).toContain("const updated = await reviewBlogPost");
    expect(adminAssets).toContain("const row = await reviewAsset");
  });

  it("uses accessible application modals and state-specific legal admin actions", () => {
    expect(adminAssets).not.toContain("prompt(");
    expect(adminAssets).not.toContain("confirm(");
    expect(adminBlog).not.toContain("prompt(");
    expect(adminBlog).not.toContain("confirm(");
    expect(adminAssets).toContain('a.status === "Pending Review" && <button disabled={processingId === a.id} onClick={() => openReview(a.id, "published")}');
    expect(adminAssets).toContain('a.status === "Published" && <button disabled={processingId === a.id} onClick={() => openReview(a.id, "draft")}');
    expect(adminBlog).toContain('post.status === "pending_review" && <button disabled={disabled} onClick={() => onReview("published")}');
    expect(adminBlog).not.toContain(">Approve</button>");
  });

  it("formats duplicate slug and backend errors with safe Supabase context", () => {
    expect(errors).toContain("formatSupabaseOperationError");
    expect(errors).toContain("code: ${code}");
    expect(errors).toContain("details: ${details}");
    expect(errors).toContain("hint: ${hint}");
    expect(contentService).toContain("A blog post with this slug already exists");
  });

  it("adds forward-only migration and SELECT-only audits without touching Task 2B files", () => {
    expect(repair).toContain("create or replace function public.review_asset");
    expect(repair).toContain("for update");
    expect(repair).toContain("revoke all on function public.review_asset(uuid, public.asset_status, text) from public, anon");
    expect(repair).toContain("grant insert (slug, title, excerpt, category, body, creator_id, status) on public.blog_posts");
    expect(preflight.toLowerCase()).not.toMatch(/\b(update|insert|delete|alter|create|drop|grant|revoke)\b/);
    expect(verification.toLowerCase()).not.toMatch(/\b(update|insert|delete|alter|create|drop|grant|revoke)\b/);
    expect(preflight).toContain("19");
    expect(verification).toContain("published_counts");
  });
});
