import { Navigate, useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import type { Asset, BlogPost } from "@/data/marketplace";
import AssetCard from "@/components/AssetCard";
import { getPublishedBlogPostBySlug, listPublishedBlogPosts } from "@/services/content";
import { dbBlogToBlogPost } from "@/lib/content-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { getCreatorBySlug, listPublishedAssetsByCreatorId } from "@/services/creators";
import { dbAssetToAsset } from "@/lib/asset-mappers";
import { SectionVisual } from "@/components/visuals/MarketplaceVisuals";

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [creatorSlug, setCreatorSlug] = useState("");
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [creatorAssets, setCreatorAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const row = await getPublishedBlogPostBySlug(slug || "");
        if (row && !cancelled) {
          const mapped = dbBlogToBlogPost(row);
          setPost(mapped);
          setCreatorName(row.creators?.brand_name || "");
          setCreatorSlug(row.creators?.slug || "");
          const posts = await listPublishedBlogPosts();
          setRelated(posts.filter(p => p.slug !== row.slug).slice(0, 3).map(dbBlogToBlogPost));
          if (row.creators?.slug) {
            const creator = await getCreatorBySlug(row.creators.slug);
            if (creator) {
              const assets = await listPublishedAssetsByCreatorId(creator.id);
              setCreatorAssets(assets.slice(0, 3).map(dbAssetToAsset));
            }
          }
        }
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load this post."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (!post && !loading && !err) return <Navigate to="/blog" replace />;
  if (!post) {
    return (
      <SiteLayout>
        <section className="container-mb pt-16 sm:pt-24 pb-20">
          {loading ? (
            <div className="card-premium p-6 text-[#CFCFCF]">Loading post...</div>
          ) : (
            <div className="card-premium p-8 sm:p-10 text-center">
              <h1 className="text-2xl font-medium tracking-normal">Post unavailable</h1>
              <p className="mt-3 text-[#CFCFCF]">{err || "This post is not published yet."}</p>
              <Link to="/blog" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full btn-primary px-5 py-2 text-sm font-medium">
                Back to blog
              </Link>
            </div>
          )}
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <article className="container-mb section-rich pt-10 sm:pt-12 md:pt-16 max-w-3xl">
        <SectionVisual variant="lines" />
        <Link to="/blog" className="text-sm text-[#CFCFCF] hover:text-white">Back to blog</Link>
        <div className="eyebrow mt-6">{post.category}</div>
        <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-normal leading-[1.06] break-words">{post.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#CFCFCF]">
          <span>{post.date}</span>
          {creatorName && creatorSlug && <><span>|</span><Link to={`/creator/${creatorSlug}`} className="hover:text-white">{creatorName}</Link></>}
        </div>
        <div className="mt-12 prose prose-invert max-w-none">
          <p className="text-lg sm:text-xl text-white/75 leading-relaxed">{post.excerpt}</p>
          <p className="mt-6 text-white/65 leading-relaxed whitespace-pre-line">{post.body}</p>
        </div>
      </article>

      {creatorAssets.length > 0 && (
        <section className="container-mb section-rich mt-20">
          <SectionVisual variant="mesh" />
          <h2 className="text-2xl font-medium tracking-normal">Assets from {creatorName}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creatorAssets.map(a => <AssetCard key={a.slug} asset={a} />)}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="container-mb section-rich mt-20">
          <SectionVisual variant="market" />
          <h2 className="text-2xl font-medium tracking-normal">Keep reading</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map(p => (
              <Link to={`/blog/${p.slug}`} key={p.slug} className="card-premium p-6">
                <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">{p.category}</div>
                <h3 className="mt-3 text-lg font-medium tracking-normal">{p.title}</h3>
                <p className="mt-2 text-sm text-[#CFCFCF] line-clamp-2">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
