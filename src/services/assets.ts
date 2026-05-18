import { supabase } from "@/lib/supabase/client";
import { requireSupabaseConfig } from "@/lib/supabase/errors";
import type { AccessRequestStatus, DeliveryType, Inserts, Tables, Updates } from "@/types/database";

export type AssetWithCreator = Awaited<ReturnType<typeof listPublishedAssets>>[number];
export const ASSET_DELIVERABLES_BUCKET = "asset-deliverables";
export const MAX_DELIVERABLE_FILE_SIZE = 50 * 1024 * 1024;
const blockedFileExtensions = [".exe", ".bat", ".cmd", ".msi", ".scr", ".ps1", ".vbs", ".js"];

const assetSelect = `
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
`;

export async function listPublishedAssets() {
  const { data, error } = await supabase
    .from("assets")
    .select(assetSelect)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listAdminAssets() {
  const { data, error } = await supabase
    .from("assets")
    .select(assetSelect)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPublishedAssetBySlug(slug: string) {
  const { data, error } = await supabase
    .from("assets")
    .select(assetSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listCreatorAssets(creatorId: string) {
  const { data, error } = await supabase
    .from("assets")
    .select(assetSelect)
    .eq("creator_id", creatorId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCreatorAssetBySlug(slug: string) {
  const { data, error } = await supabase
    .from("assets")
    .select(assetSelect)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function submitAsset(input: Inserts<"assets">) {
  const { data, error } = await supabase
    .from("assets")
    .insert({ ...input, status: input.status || "pending_review" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAsset(id: string, patch: Updates<"assets">) {
  const { data, error } = await supabase
    .from("assets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAsset(id: string) {
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export function validateDeliverableFile(file: File) {
  if (file.size > MAX_DELIVERABLE_FILE_SIZE) {
    throw new Error("File is too large. Upload a file smaller than 50 MB.");
  }

  const lower = file.name.toLowerCase();
  if (blockedFileExtensions.some(ext => lower.endsWith(ext))) {
    throw new Error("Unsupported file type. Upload a document, archive, image, CSV, JSON, or template file instead.");
  }
}

export async function uploadAssetDeliverableFile(creatorId: string, assetId: string, file: File) {
  validateDeliverableFile(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "deliverable";
  const storagePath = `${creatorId}/${assetId}/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(ASSET_DELIVERABLES_BUCKET)
    .upload(storagePath, file, { upsert: true });

  if (error) throw error;
  return data.path;
}

export async function upsertAssetDeliverable(input: Inserts<"asset_deliverables">) {
  const { data, error } = await supabase
    .from("asset_deliverables")
    .upsert(input, { onConflict: "asset_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAssetDeliverable(assetId: string) {
  const { data, error } = await supabase
    .from("asset_deliverables")
    .select("*")
    .eq("asset_id", assetId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listAssetDeliverables(assetIds: string[]) {
  if (assetIds.length === 0) return [] as Tables<"asset_deliverables">[];
  const { data, error } = await supabase
    .from("asset_deliverables")
    .select("*")
    .in("asset_id", assetIds);

  if (error) throw error;
  return data || [];
}

export async function createSignedDeliverableUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(ASSET_DELIVERABLES_BUCKET)
    .createSignedUrl(storagePath, 60 * 5, { download: true });

  if (error) throw new Error(`Storage signed URL failed: ${error.message}`);
  return data.signedUrl;
}

export async function getClaimedAssetDelivery(assetId: string) {
  requireSupabaseConfig();

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in before accessing this asset.");

  const { data: claim, error: claimError } = await supabase
    .from("asset_claims")
    .select("id, status")
    .eq("asset_id", assetId)
    .eq("user_id", auth.user.id)
    .in("status", ["unlocked", "paid_mock"])
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claim) throw new Error("Asset not claimed. Claim this asset before accessing its private delivery.");

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, status")
    .eq("id", assetId)
    .eq("status", "published")
    .maybeSingle();

  if (assetError) throw assetError;
  if (!asset) throw new Error("Asset not published. Delivery is available only after admin approval.");

  const delivery = await getAssetDeliverable(assetId);
  if (!delivery) throw new Error("No deliverable attached. Ask the creator or admin to add a file, link, or text delivery.");
  return delivery;
}

export function deliveryLabel(type?: DeliveryType | null) {
  if (type === "file") return "File upload";
  if (type === "external_link") return "External link";
  if (type === "text") return "Text delivery";
  return "No delivery";
}

export async function requestPaidAssetAccessBySlug(input: { slug: string; name: string; email: string; phone?: string; userId?: string | null }) {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, is_free, status")
    .eq("slug", input.slug)
    .eq("status", "published")
    .maybeSingle();

  if (assetError) throw assetError;
  if (!asset) throw new Error("This asset is not available for access requests yet.");
  if (asset.is_free) throw new Error("This asset is free. Use the free claim flow instead.");

  const { data, error } = await supabase
    .from("asset_access_requests")
    .insert({
      asset_id: asset.id,
      buyer_user_id: input.userId || null,
      buyer_name: input.name,
      buyer_email: input.email,
      buyer_phone: input.phone || null,
      status: "new",
    })
    .select()
    .single();

  if (error && "code" in error && error.code === "23505") return null;
  if (error) throw error;
  return data;
}

export async function listAdminAccessRequests() {
  const { data, error } = await supabase
    .from("asset_access_requests")
    .select(`
      *,
      assets (
        id,
        title,
        slug,
        price,
        creators (
          brand_name,
          slug
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateAccessRequestStatus(id: string, status: AccessRequestStatus) {
  const { data, error } = await supabase
    .from("asset_access_requests")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function countAccessRequestsForAssets(assetIds: string[]) {
  if (assetIds.length === 0) return {} as Record<string, number>;
  const { data, error } = await supabase
    .from("asset_access_requests")
    .select("asset_id")
    .in("asset_id", assetIds);

  if (error) throw error;
  return (data || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.asset_id] = (acc[row.asset_id] || 0) + 1;
    return acc;
  }, {});
}

export async function claimAsset(assetId: string, userId: string, status: Inserts<"asset_claims">["status"] = "unlocked") {
  const { data: existing, error: existingError } = await supabase
    .from("asset_claims")
    .select("*")
    .eq("asset_id", assetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("asset_claims")
    .insert({ asset_id: assetId, user_id: userId, status })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function claimFreeAssetBySlug(slug: string, userId: string) {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, slug, is_free, status")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("is_free", true)
    .maybeSingle();

  if (assetError) throw assetError;
  if (!asset) {
    throw new Error("This free asset is not available in Supabase yet. Seed the marketplace assets migration, then try again.");
  }

  return claimAsset(asset.id, userId, "unlocked");
}

export async function listMyAssetClaims(userId: string) {
  const { data, error } = await supabase
    .from("asset_claims")
    .select(`
      *,
      assets (*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
