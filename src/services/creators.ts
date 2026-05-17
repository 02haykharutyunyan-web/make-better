import { supabase } from "@/lib/supabase/client";
import type { Inserts, Updates } from "@/types/database";

export async function listActiveCreators() {
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("brand_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCreatorBySlug(slug: string) {
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listPublishedAssetsByCreatorId(creatorId: string) {
  const { data, error } = await supabase
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
    .eq("creator_id", creatorId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listPublishedBlogPostsByCreatorId(creatorId: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, creators (id, slug, brand_name)")
    .eq("creator_id", creatorId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCreatorByProfileId(profileId: string) {
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCreator(input: Inserts<"creators">) {
  const { data, error } = await supabase
    .from("creators")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCreator(id: string, patch: Updates<"creators">) {
  const { data, error } = await supabase
    .from("creators")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
