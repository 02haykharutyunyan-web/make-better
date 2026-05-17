import { supabase } from "@/lib/supabase/client";
import { listAdminAssets } from "@/services/assets";
import { listProfiles } from "@/services/profiles";
import type { Tables } from "@/types/database";

export type AdminOverview = {
  totalCreators: number;
  totalAssets: number;
  pendingReviewCount: number;
  publishedCount: number;
  totalClaims: number;
  totalDownloads: number;
};

export type AdminCreatorRow = Tables<"creators"> & {
  email: string;
  joinedAt: string;
  assetCount: number;
  totalDownloads: number;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [creators, assets, claims] = await Promise.all([
    supabase.from("creators").select("id", { count: "exact" }),
    listAdminAssets(),
    supabase.from("asset_claims").select("id", { count: "exact", head: true }),
  ]);

  if (creators.error) throw creators.error;
  if (claims.error) throw claims.error;

  return {
    totalCreators: creators.count || creators.data?.length || 0,
    totalAssets: assets.length,
    pendingReviewCount: assets.filter(a => a.status === "pending_review").length,
    publishedCount: assets.filter(a => a.status === "published").length,
    totalClaims: claims.count || 0,
    totalDownloads: assets.reduce((sum, asset) => sum + (asset.downloads || 0), 0),
  };
}

export async function listAdminCreators(): Promise<AdminCreatorRow[]> {
  const [creatorsResult, profiles, assets] = await Promise.all([
    supabase.from("creators").select("*").order("created_at", { ascending: false }),
    listProfiles("creator"),
    listAdminAssets(),
  ]);

  if (creatorsResult.error) throw creatorsResult.error;

  return (creatorsResult.data || []).map(creator => {
    const profile = profiles.find(p => p.id === creator.profile_id);
    const creatorAssets = assets.filter(asset => asset.creator_id === creator.id);
    return {
      ...creator,
      email: profile?.email || "",
      joinedAt: profile?.created_at || creator.created_at,
      assetCount: creatorAssets.length,
      totalDownloads: creatorAssets.reduce((sum, asset) => sum + (asset.downloads || 0), 0),
    };
  });
}
