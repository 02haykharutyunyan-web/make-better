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

export function assertCreatorApproved(creator: { application_status?: string; application_rejection_reason?: string | null }) {
  if (creator.application_status !== "approved") {
    if (creator.application_status === "rejected") {
      throw new Error(`Your creator application was rejected${creator.application_rejection_reason ? `: ${creator.application_rejection_reason}` : "."} You can update your application before submitting again.`);
    }
    throw new Error("Your creator application is pending admin approval. You can submit assets and creator blogs after approval.");
  }
}

export async function getCurrentCreatorForSubmission() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("No authenticated Supabase user found. Sign in again before submitting an asset.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error(`No profile row exists for authenticated user ${auth.user.id}. Sign out and sign in again, or run the creator profile repair SQL.`);
  if (profile.role !== "creator" && profile.role !== "admin") {
    throw new Error(`This account has role "${profile.role}". Only creator accounts can submit assets.`);
  }

  const creator = await getCreatorByProfileId(auth.user.id);
  if (!creator) {
    throw new Error(`No creator row is linked to this profile (${profile.email || auth.user.id}). Run the creator profile repair SQL or create a creator profile for this account.`);
  }

  assertCreatorApproved(creator);

  return creator;
}

export async function createCreator(input: Inserts<"creators">) {
  const { data, error } = await supabase
    .from("creators")
    .insert({ ...input, application_status: "pending" })
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


export async function reviewCreatorApplication(id: string, status: "approved" | "rejected", rejectionReason?: string) {
  if (status === "rejected" && !rejectionReason?.trim()) {
    throw new Error("A rejection reason is required before rejecting a creator application.");
  }

  const { data, error } = await supabase
    .from("creators")
    .update({
      application_status: status,
      application_rejection_reason: status === "rejected" ? rejectionReason!.trim() : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
