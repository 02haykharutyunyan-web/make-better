import { supabase } from "@/lib/supabase/client";
import type { Inserts, Updates } from "@/types/database";

export async function listPublishedBlogPosts() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, creators (id, slug, brand_name)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listAdminBlogPosts() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, creators (id, slug, brand_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPublishedBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, creators (id, slug, brand_name)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listCreatorBlogPosts(creatorId: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, creators (id, slug, brand_name)")
    .eq("creator_id", creatorId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}


export async function getCreatorBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, creators (id, slug, brand_name)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function submitBlogPostForReview(blogPostId: string) {
  const { data, error } = await supabase.rpc("submit_blog_post_for_review", { target_blog_post_id: blogPostId });
  if (error) throw error;
  return data;
}

export async function reviewBlogPost(blogPostId: string, status: "published" | "rejected" | "draft", rejectionReason?: string | null) {
  if (status === "rejected" && !rejectionReason?.trim()) throw new Error("A rejection reason is required.");
  const { data, error } = await supabase.rpc("review_blog_post", {
    target_blog_post_id: blogPostId,
    target_status: status,
    rejection_reason: status === "rejected" ? rejectionReason!.trim() : null,
  });
  if (error) throw error;
  return data;
}

export async function upsertBlogPost(input: Inserts<"blog_posts">) {
  const { data, error } = await supabase
    .from("blog_posts")
    .upsert({ ...input, status: input.status || "draft" }, { onConflict: "slug" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBlogPost(id: string, patch: Updates<"blog_posts">) {
  const { data, error } = await supabase
    .from("blog_posts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBlogPost(id: string) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function listPublishedCollections() {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("status", "published")
    .order("title", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function listAdminCollections() {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPublishedCollectionBySlug(slug: string) {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listPublishedAssetsForCollection(collection: { selected_asset_ids?: string[] | null; related_types?: string[] | null; related_tags?: string[] | null }) {
  let query = supabase
    .from("assets")
    .select(`
      *,
      creators (
        id,
        slug,
        brand_name,
        profile_id,
        niche,
        description,
        tags,
        followers,
        assets_count,
        downloads,
        rating,
        monthly_revenue,
        strengths
      )
    `)
    .eq("status", "published");

  if (collection.selected_asset_ids && collection.selected_asset_ids.length > 0) {
    query = query.in("id", collection.selected_asset_ids);
  }

  const { data, error } = await query.order("published_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  if (collection.selected_asset_ids && collection.selected_asset_ids.length > 0) return rows;

  const relatedTypes = collection.related_types || [];
  const relatedTags = (collection.related_tags || []).map(tag => tag.toLowerCase());
  if (relatedTypes.length === 0 && relatedTags.length === 0) return rows;

  return rows.filter(asset => {
    const typeMatch = relatedTypes.includes(asset.product_type);
    const tagMatch = (asset.tags || []).some(tag => relatedTags.includes(tag.toLowerCase()));
    return typeMatch || tagMatch;
  });
}

export async function upsertCollection(input: Inserts<"collections">) {
  const { data, error } = await supabase
    .from("collections")
    .upsert({ ...input, status: input.status || "draft" }, { onConflict: "slug" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCollection(id: string, patch: Updates<"collections">) {
  const { data, error } = await supabase
    .from("collections")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCollection(id: string) {
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw error;
}
