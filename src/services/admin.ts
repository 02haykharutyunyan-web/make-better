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
  observability: { assetViews: number; freeClaimStarts: number; freeClaimsCompleted: number; deliveriesOpened: number; creatorSubmissions: number; adminReviews: number; clientErrors24h: number };
  downloadAnalytics: { downloads7d: number; downloads30d: number; topAssets: { id: string; title: string; slug: string; downloads: number; creator_name: string }[] };
};

export type AdminCreatorRow = Tables<"creators"> & {
  email: string;
  applicantName: string;
  joinedAt: string;
  assetCount: number;
  totalDownloads: number;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [creators, assets, claims, observability, downloadAnalytics] = await Promise.all([
    supabase.from("creators").select("id", { count: "exact" }),
    listAdminAssets(),
    supabase.from("asset_claims").select("id", { count: "exact", head: true }),
    supabase.rpc("get_marketplace_observability"),
    supabase.rpc("get_admin_download_analytics"),
  ]);

  if (creators.error) throw creators.error;
  if (claims.error) throw claims.error;
  if (observability.error) throw observability.error;
  if (downloadAnalytics.error) throw downloadAnalytics.error;
  const metrics = observability.data?.[0];
  const downloadMetrics = downloadAnalytics.data?.[0];

  return {
    totalCreators: creators.count || creators.data?.length || 0,
    totalAssets: assets.length,
    pendingReviewCount: assets.filter(a => a.status === "pending_review").length,
    publishedCount: assets.filter(a => a.status === "published").length,
    totalClaims: claims.count || 0,
    totalDownloads: assets.reduce((sum, asset) => sum + (asset.downloads || 0), 0),
    observability: {
      assetViews: metrics?.asset_views || 0,
      freeClaimStarts: metrics?.free_claim_starts || 0,
      freeClaimsCompleted: metrics?.free_claims_completed || 0,
      deliveriesOpened: metrics?.deliveries_opened || 0,
      creatorSubmissions: metrics?.creator_submissions || 0,
      adminReviews: metrics?.admin_reviews || 0,
      clientErrors24h: metrics?.client_errors_24h || 0,
    },
    downloadAnalytics: {
      downloads7d: downloadMetrics?.downloads_7d || 0,
      downloads30d: downloadMetrics?.downloads_30d || 0,
      topAssets: Array.isArray(downloadMetrics?.top_assets) ? downloadMetrics.top_assets as AdminOverview["downloadAnalytics"]["topAssets"] : [],
    },
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
      applicantName: profile?.full_name || "-",
      joinedAt: profile?.created_at || creator.created_at,
      assetCount: creatorAssets.length,
      totalDownloads: creatorAssets.reduce((sum, asset) => sum + (asset.downloads || 0), 0),
    };
  });
}
