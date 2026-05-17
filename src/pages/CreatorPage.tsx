import { useParams, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import { Asset, BlogPost, Creator, assetsByCreator, creators, getCreator, postsByCreator } from "@/data/marketplace";
import { Star, ArrowUpRight, Check } from "lucide-react";
import { getCreatorBySlug, listPublishedAssetsByCreatorId, listPublishedBlogPostsByCreatorId } from "@/services/creators";
import { dbAssetToAsset, dbCreatorToCreator } from "@/lib/asset-mappers";
import { dbBlogToBlogPost } from "@/lib/content-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function CreatorPage() {
  const { slug } = useParams();
  const mockCreator = getCreator(slug || "");
  const [creator, setCreator] = useState<Creator | null>(null);
  const [creatorAssets, setCreatorAssets] = useState<Asset[]>([]);
  const [creatorPosts, setCreatorPosts] = useState<BlogPost[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const row = await getCreatorBySlug(slug || "");
        if (row && !cancelled) {
          const mapped = dbCreatorToCreator(row);
          setCreator(mapped);
          const [assetRows, postRows] = await Promise.all([
            listPublishedAssetsByCreatorId(row.id),
            listPublishedBlogPostsByCreatorId(row.id),
          ]);
          setCreatorAssets(assetRows.map(dbAssetToAsset));
          setCreatorPosts(postRows.map(dbBlogToBlogPost));
        }
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Using demo creator because Supabase could not load this creator."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const visibleCreator = creator || mockCreator;
  if (!visibleCreator && !loading) return <Navigate to="/creators" replace />;
  if (!visibleCreator) return null;

  const assets = creatorAssets.length > 0 ? creatorAssets : assetsByCreator(visibleCreator.slug);
  const posts = creatorPosts.length > 0 ? creatorPosts : postsByCreator(visibleCreator.slug);

  return (
    <SiteLayout>
      {err && <section className="container-mb pt-6"><div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{err}</div></section>}
      <section className="container-mb pt-10 sm:pt-12 md:pt-16">
        <div className="card-premium p-5 sm:p-8 md:p-10 grid min-w-0 gap-6 sm:gap-8 md:grid-cols-[minmax(0,1fr)_auto] items-start">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="h-16 w-16 rounded-full border border-[#1E293B] bg-[#111827]/80 flex items-center justify-center text-lg font-medium">
                {visibleCreator.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight break-words">{visibleCreator.name}</h1>
                <div className="mt-1 text-[#94A3B8]">{visibleCreator.niche}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {visibleCreator.tags.map(t => <span key={t} className="chip">{t}</span>)}
            </div>
          </div>
          <button
            onClick={() => setFollowing(f => !f)}
            className={`min-h-11 rounded-full px-6 py-2.5 text-sm font-medium transition ${
              following ? "border border-[#3B82F6]/35 bg-[#111827]/80 text-white" : "btn-primary hover:bg-[#FB923C]"
            }`}
          >{following ? "Following" : "Follow"}</button>
        </div>
      </section>

      <section className="container-mb mt-12 sm:mt-16">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-medium tracking-[-0.03em] max-w-3xl">
          AI assets for founders, marketers, and ecommerce teams.
        </h2>
        <p className="mt-5 max-w-2xl text-base sm:text-lg text-[#94A3B8] leading-relaxed">{visibleCreator.description}</p>

        <div className="mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 max-w-3xl">
          {[
            { l: "Assets", v: assets.length || visibleCreator.assetsCount },
            { l: "Downloads", v: `${(visibleCreator.downloads/1000).toFixed(1)}k` },
            { l: "Followers", v: `${(visibleCreator.followers/1000).toFixed(1)}k` },
            { l: "Rating", v: <span className="inline-flex items-center gap-1.5"><Star className="h-5 w-5 fill-white text-white" />{visibleCreator.rating}</span> },
          ].map(s => (
            <div key={s.l} className="border-l border-[#1E293B] pl-4">
              <div className="text-2xl sm:text-3xl font-medium tracking-tight">{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#94A3B8]/70">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-mb mt-20">
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">Popular assets by {visibleCreator.name}</h2>
        {loading && <div className="mt-6 card-premium p-4 text-sm text-[#94A3B8]">Loading creator assets...</div>}
        {!loading && assets.length === 0 && <div className="mt-6 card-premium p-8 sm:p-10 text-center text-[#94A3B8]">No published assets yet.</div>}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map(a => <AssetCard key={a.slug} asset={a} />)}
        </div>
      </section>

      <section className="container-mb mt-20 sm:mt-28 grid gap-6 sm:gap-8 md:grid-cols-2">
        <div className="card-premium p-5 sm:p-8">
          <div className="eyebrow">Why follow</div>
          <h3 className="mt-4 text-2xl font-medium tracking-tight">Operator-grade systems, packaged.</h3>
          <p className="mt-3 text-[#94A3B8]">Get every new asset, update, and playbook from {visibleCreator.name} the moment it ships.</p>
        </div>
        <div className="card-premium p-5 sm:p-8">
          <div className="eyebrow">Strengths</div>
          <ul className="mt-4 space-y-3">
            {visibleCreator.strengths.map(s => (
              <li key={s} className="flex items-start gap-3 text-white/80"><Check className="h-4 w-4 mt-0.5 text-emerald-300" /> {s}</li>
            ))}
          </ul>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="container-mb mt-20">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">Posts by {visibleCreator.name}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {posts.map(p => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="card-premium p-6">
                <div className="text-xs uppercase tracking-[0.16em] text-[#94A3B8]/70">{p.category}</div>
                <h3 className="mt-3 text-lg font-medium tracking-tight leading-snug">{p.title}</h3>
                <p className="mt-2 text-sm text-[#94A3B8]">{p.excerpt}</p>
                <div className="mt-4 text-xs text-[#94A3B8]/70">{p.date}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-mb mt-20 sm:mt-28">
        <div className="card-premium p-5 sm:p-8 md:p-14">
          <div className="eyebrow">For creators</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em] max-w-2xl">Have a repeatable workflow others would pay for?</h2>
          <p className="mt-4 text-[#94A3B8] max-w-2xl">Package it as an AI asset on Make Better. We handle discovery, trust signals, and payments — you focus on the work.</p>
          <Link to="/submit" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full btn-primary px-6 py-3 text-sm font-medium transition">
            List your asset <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="container-mb mt-20">
        <h3 className="text-xl text-[#94A3B8]">Other creators</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {creators.filter(c => c.slug !== visibleCreator.slug).map(c => (
            <Link key={c.slug} to={`/creator/${c.slug}`} className="card-premium p-6">
              <div className="text-lg font-medium">{c.name}</div>
              <div className="mt-1 text-sm text-[#94A3B8]">{c.niche}</div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
