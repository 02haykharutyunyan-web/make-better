import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type HomepageAsset = Pick<Tables<"assets">,
  "slug" | "title" | "product_type" | "category" | "short_description" |
  "tags" | "price" | "downloads" | "rating" | "review_count"
> & { creators: Pick<Tables<"creators">, "slug" | "brand_name"> | null };

type HomepageCollection = Pick<Tables<"collections">,
  "slug" | "title" | "description" | "long_description" | "best_for" |
  "related_types" | "related_tags"
>;

type HomepageCreator = Pick<Tables<"creators">,
  "slug" | "brand_name" | "niche" | "description" | "tags" | "followers" |
  "assets_count" | "downloads" | "rating" | "monthly_revenue" | "strengths"
>;

type HomepagePost = Pick<Tables<"blog_posts">,
  "slug" | "title" | "excerpt" | "category" | "published_at" | "created_at"
> & { creators: Pick<Tables<"creators">, "slug" | "brand_name"> | null };

export type HomepageFeed = {
  assets: HomepageAsset[];
  collections: HomepageCollection[];
  creators: HomepageCreator[];
  posts: HomepagePost[];
};

export async function getHomepageFeed(): Promise<HomepageFeed> {
  const { data, error } = await supabase.rpc("get_homepage_feed");
  if (error) throw error;
  return data as unknown as HomepageFeed;
}
