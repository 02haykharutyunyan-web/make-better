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

export async function upsertBlogPost(input: Inserts<"blog_posts">) {
  const { data, error } = await supabase
    .from("blog_posts")
    .upsert(input, { onConflict: "slug" })
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

export async function listPublishedAssetsForCollection(collection: { selected_asset_ids?: string[] | null; related_types?: string[] | null }) {
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
  } else if (collection.related_types && collection.related_types.length > 0) {
    query = query.in("product_type", collection.related_types);
  }

  const { data, error } = await query.order("published_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertCollection(input: Inserts<"collections">) {
  const { data, error } = await supabase
    .from("collections")
    .upsert(input, { onConflict: "slug" })
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
