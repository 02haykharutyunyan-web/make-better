import type { Asset, Creator, ProductType } from "@/data/marketplace";
import type { Tables } from "@/types/database";
import type { SubmittedAsset, AssetStatus } from "@/store/store";

type DbCreator = Pick<Tables<"creators">, "slug" | "brand_name" | "niche" | "description" | "tags" | "followers" | "assets_count" | "downloads" | "rating" | "monthly_revenue" | "strengths">;

type DbAsset = Tables<"assets"> & {
  creators?: DbCreator | null;
};

const statusMap: Record<Tables<"assets">["status"], AssetStatus> = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
};

export function dbCreatorToCreator(creator?: DbCreator | null): Creator | null {
  if (!creator) return null;
  return {
    slug: creator.slug,
    name: creator.brand_name,
    niche: creator.niche || "",
    description: creator.description || "",
    tags: creator.tags || [],
    followers: creator.followers || 0,
    assetsCount: creator.assets_count || 0,
    downloads: creator.downloads || 0,
    rating: Number(creator.rating || 0),
    monthlyRevenue: creator.monthly_revenue || "-",
    strengths: creator.strengths || [],
  };
}

export function dbAssetToAsset(asset: DbAsset): Asset {
  return {
    slug: asset.slug,
    title: asset.title,
    category: asset.category || asset.product_type,
    productType: asset.product_type as ProductType,
    description: asset.short_description || "",
    longDescription: asset.long_description || "",
    tags: asset.tags || [],
    price: Number(asset.price || 0),
    downloads: asset.downloads || 0,
    rating: Number(asset.rating || 0),
    reviewCount: asset.review_count || 0,
    creatorSlug: asset.creators?.slug || "",
    collectionSlugs: [],
  };
}

export function dbAssetToSubmittedAsset(asset: DbAsset): SubmittedAsset {
  return {
    ...dbAssetToAsset(asset),
    id: asset.id,
    status: statusMap[asset.status],
    isFree: asset.is_free,
    priceType: asset.price_type,
    submittedAt: asset.submitted_at,
    rejectionReason: asset.rejection_reason || undefined,
    featured: asset.featured,
    useCases: asset.use_cases || [],
    included: asset.included || [],
    before: asset.before || [],
    after: asset.after || [],
    fullDescription: asset.long_description || "",
  };
}
