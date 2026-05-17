import { Navigate, useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import { Asset, BlogPost, assetsByCreator, blogPosts, getCreator, getPost } from "@/data/marketplace";
import AssetCard from "@/components/AssetCard";
import { getPublishedBlogPostBySlug, listPublishedBlogPosts } from "@/services/content";
import { dbBlogToBlogPost } from "@/lib/content-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { getCreatorBySlug, listPublishedAssetsByCreatorId } from "@/services/creators";
import { dbAssetToAsset, dbCreatorToCreator } from "@/lib/asset-mappers";

export default function BlogPostPage() {
  const { slug } = useParams();
  const mockPost = getPost(slug || "");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [creatorName, setCreatorName] = useState<string>("");
  const [creatorSlug, setCreatorSlug] = useState<string>("");
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
        if (!cancelled) setErr(explainSupabaseError(error, "Using demo post because Supabase could not load this post."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const visiblePost = post || mockPost;
  if (!visiblePost && !loading) return <Navigate to="/blog" replace />;
  if (!visiblePost) return null;
  const mockCreator = visiblePost.creatorSlug ? getCreator(visiblePost.creatorSlug) : null;
  const visibleCreatorName = creatorName || mockCreator?.name || "";
  const visibleCreatorSlug = creatorSlug || mockCreator?.slug || "";
  const visibleRelated = related.length > 0 ? related : blogPosts.filter(p => p.slug !== visiblePost.slug).slice(0, 3);
  const visibleCreatorAssets = creatorAssets.length > 0 ? creatorAssets : mockCreator ? assetsByCreator(mockCreator.slug).slice(0, 3) : [];

  return (
    <SiteLayout>
      {err && <section className="container-mb pt-6"><div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{err}</div></section>}
      <article className="container-mb pt-10 sm:pt-12 md:pt-16 max-w-3xl">
        <Link to="/blog" className="text-sm text-[#94A3B8] hover:text-white">← Blog</Link>
        <div className="eyebrow mt-6">{visiblePost.category}</div>
        <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.06] break-words">{visiblePost.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#94A3B8]">
          <span>{visiblePost.date}</span>
          {visibleCreatorName && <><span>·</span><Link to={`/creator/${visibleCreatorSlug}`} className="hover:text-white">{visibleCreatorName}</Link></>}
        </div>
        <div className="mt-12 prose prose-invert max-w-none">
          <p className="text-lg sm:text-xl text-white/75 leading-relaxed">{visiblePost.excerpt}</p>
          <p className="mt-6 text-white/65 leading-relaxed whitespace-pre-line">{visiblePost.body}</p>
        </div>
      </article>

      {visibleCreatorAssets.length > 0 && (
        <section className="container-mb mt-20">
          <h2 className="text-2xl font-medium tracking-tight">Assets from {visibleCreatorName}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCreatorAssets.map(a => <AssetCard key={a.slug} asset={a} />)}
          </div>
        </section>
      )}

      <section className="container-mb mt-20">
        <h2 className="text-2xl font-medium tracking-tight">Keep reading</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {visibleRelated.map(p => (
            <Link to={`/blog/${p.slug}`} key={p.slug} className="card-premium p-6">
              <div className="text-xs uppercase tracking-[0.16em] text-[#94A3B8]/70">{p.category}</div>
              <h3 className="mt-3 text-lg font-medium tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm text-[#94A3B8] line-clamp-2">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
