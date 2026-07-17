import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260717000300_repair_moderation_workflows.sql", "utf8");
const content = readFileSync("src/services/content.ts", "utf8");
const assets = readFileSync("src/services/assets.ts", "utf8");
const publicAssetPage = readFileSync("src/pages/Assets.tsx", "utf8");
const publicBlogPage = readFileSync("src/pages/BlogPage.tsx", "utf8");
const assetDetail = readFileSync("src/pages/AssetPage.tsx", "utf8");
const blogDetail = readFileSync("src/pages/BlogPostPage.tsx", "utf8");

describe("Task 2C lifecycle metadata and public visibility contracts", () => {
  it("uses trusted create_blog_draft RPC and never lets the browser choose creator_id or initial status", () => {
    expect(migration).toContain("function public.create_blog_draft");
    expect(migration).toContain("where profile_id = auth.uid()");
    expect(migration).toContain("application_status = 'approved'");
    expect(migration).toContain("if (select count(*) from public.creators where profile_id = auth.uid() and active = true and application_status = 'approved') <> 1");
    expect(migration).toContain("values (owner_creator.id, draft_slug, draft_title, draft_excerpt, draft_category, draft_body, 'draft')");
    expect(migration).toContain("revoke all on function public.create_blog_draft(text, text, text, text, text) from public, anon");
    expect(content).toContain('supabase.rpc("create_blog_draft"');
    expect(content.slice(content.indexOf("export async function createBlogPost"), content.indexOf("export async function createAdminBlogPost"))).not.toContain("creator_id");
    expect(content.slice(content.indexOf("export async function createBlogPost"), content.indexOf("export async function createAdminBlogPost"))).not.toContain("status");
  });

  it("enforces exact metadata semantics for submit, reject, publish, and draft returns", () => {
    expect(migration).toContain("set status = 'pending_review', submitted_at = now(), reviewed_at = null, reviewed_by = null, rejection_reason = null");
    expect(migration).toContain("if target_status = 'rejected' and normalized_reason is null then raise exception 'A rejection reason is required'");
    expect(migration).toContain("reviewed_at = case when target_status = 'draft' then null else now() end");
    expect(migration).toContain("reviewed_by = case when target_status = 'draft' then null else auth.uid() end");
    expect(migration).toContain("rejection_reason = case when target_status = 'rejected' then normalized_reason else null end");
    expect(migration).toContain("published_at = case when target_status = 'published' then now() else null end");
    expect(migration).toContain("Only pending-review assets can be published or rejected");
    expect(migration).toContain("Only pending-review blog posts can be published or rejected");
  });

  it("uses status=published for public lists and detail routes", () => {
    expect(assets).toContain('.eq("status", "published")');
    expect(content).toContain('.eq("status", "published")');
    expect(publicAssetPage).toContain("listPublishedAssets");
    expect(publicBlogPage).toContain("listPublishedBlogPosts");
    expect(assetDetail).toContain("getPublishedAssetBySlug");
    expect(blogDetail).toContain("getPublishedBlogPostBySlug");
  });
});
