import type { BlogPost, Collection, ProductType } from "@/data/marketplace";
import type { Tables } from "@/types/database";

type BlogRow = Pick<Tables<"blog_posts">, "slug" | "title" | "excerpt" | "category" | "published_at" | "created_at"> & Partial<Pick<Tables<"blog_posts">, "body">> & {
  creators?: { slug: string; brand_name: string } | null;
};

export function dbBlogToBlogPost(post: BlogRow): BlogPost {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || "",
    category: post.category || "Post",
    date: post.published_at
      ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    creatorSlug: post.creators?.slug,
    body: post.body || "",
  };
}

export function dbCollectionToCollection(collection: Pick<Tables<"collections">, "slug" | "title" | "description" | "long_description" | "best_for" | "related_types" | "related_tags">): Collection {
  return {
    slug: collection.slug,
    title: collection.title,
    description: collection.description || "",
    longDescription: collection.long_description || collection.description || "",
    bestFor: collection.best_for || [],
    relatedTypes: (collection.related_types || []) as ProductType[],
    relatedTags: collection.related_tags || [],
  };
}
