import { Navigate, useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import { Asset, BlogPost, Collection } from "@/data/marketplace";
import { getPublishedCollectionBySlug, listPublishedAssetsForCollection, listPublishedBlogPosts } from "@/services/content";
import { dbCollectionToCollection, dbBlogToBlogPost } from "@/lib/content-mappers";
import { dbAssetToAsset } from "@/lib/asset-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function CollectionPage() {
  const { slug } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      setLoadFailed(false);
      try {
        const row = await getPublishedCollectionBySlug(slug || "");
        if (row && !cancelled) {
          setCollection(dbCollectionToCollection(row));
          const assetRows = await listPublishedAssetsForCollection(row);
          setAssets(assetRows.map(dbAssetToAsset));
          const posts = await listPublishedBlogPosts();
          setRelatedPosts(posts.slice(0, 3).map(dbBlogToBlogPost));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadFailed(true);
          setErr(explainSupabaseError(error, "Unable to load this published collection."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const c = collection;
  if (!c && !loading) return <Navigate to="/collections" replace />;
  if (!c) return null;
  const list = assets;
  const posts = relatedPosts;

  return (
    <SiteLayout>
      {err && <section className="container-mb pt-6"><div className="rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#CFCFCF]">{err}</div></section>}
      <section className="container-mb pt-12 sm:pt-16 md:pt-24">
        <Link to="/collections" className="text-sm text-[#CFCFCF] hover:text-white">← All collections</Link>
        <div className="eyebrow mt-6">Collection</div>
        <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-normal leading-[1.06] max-w-4xl break-words">{c.title}</h1>
        <p className="mt-5 max-w-2xl text-[#CFCFCF] text-base sm:text-lg leading-relaxed">{c.longDescription}</p>
      </section>

      <section className="container-mb mt-14">
        <h2 className="text-2xl font-medium tracking-normal">Curated assets</h2>
        {loading && <div className="mt-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading assets...</div>}
        {!loading && list.length === 0 && <div className="mt-6 card-premium p-8 sm:p-10 text-center text-[#CFCFCF]">No published assets in this collection yet.</div>}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(a => <AssetCard key={a.slug} asset={a} />)}
        </div>
      </section>

      <section className="container-mb mt-16 sm:mt-20 grid gap-6 md:grid-cols-2">
        <div className="card-premium p-5 sm:p-8">
          <div className="eyebrow">Best for</div>
          <ul className="mt-4 space-y-2.5 text-white/80">
            {c.bestFor.map(b => <li key={b} className="flex gap-2"><span className="text-white/30">—</span>{b}</li>)}
          </ul>
        </div>
        <div className="card-premium p-5 sm:p-8">
          <div className="eyebrow">Related product types</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {c.relatedTypes.map(t => (
              <Link key={t} to="/assets" className="chip hover:border-[#FFD600]/60 hover:text-white">{t}</Link>
            ))}
            {(c.relatedTags || []).map(t => (
              <Link key={t} to={`/assets?tag=${encodeURIComponent(t)}`} className="chip hover:border-[#FFD600]/60 hover:text-white">{t}</Link>
            ))}
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="container-mb mt-20">
          <h2 className="text-2xl font-medium tracking-normal">Related reading</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {posts.map(p => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="card-premium p-6">
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
