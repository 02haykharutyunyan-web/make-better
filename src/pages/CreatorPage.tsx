import { useParams, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import { Asset, BlogPost, Creator } from "@/data/marketplace";
import { Star, ArrowUpRight, Check } from "lucide-react";
import { getCreatorBySlug, listPublishedAssetsByCreatorId, listPublishedBlogPostsByCreatorId } from "@/services/creators";
import { dbAssetToAsset, dbCreatorToCreator } from "@/lib/asset-mappers";
import { dbBlogToBlogPost } from "@/lib/content-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function CreatorPage() {
  const { slug } = useParams();
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
          setCreator(dbCreatorToCreator(row));
          const [assetRows, postRows] = await Promise.all([
            listPublishedAssetsByCreatorId(row.id),
            listPublishedBlogPostsByCreatorId(row.id),
          ]);
          setCreatorAssets(assetRows.map(dbAssetToAsset));
          setCreatorPosts(postRows.map(dbBlogToBlogPost));
        }
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load this creator."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (!creator && !loading && !err) return <Navigate to="/creators" replace />;
  if (!creator) {
    return (
      <SiteLayout>
        <section className="container-mb pt-16 sm:pt-24 pb-20">
          {loading ? (
            <div className="card-premium p-6 text-[#CFCFCF]">Loading creator...</div>
          ) : (
            <div className="card-premium p-8 sm:p-10 text-center">
              <h1 className="text-2xl font-medium tracking-normal">Creator unavailable</h1>
              <p className="mt-3 text-[#CFCFCF]">{err || "This creator profile is not available."}</p>
              <Link to="/creators" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full btn-primary px-5 py-2 text-sm font-medium">
                View creators
              </Link>
            </div>
          )}
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="container-mb pt-10 sm:pt-12 md:pt-16">
        <div className="card-premium p-5 sm:p-8 md:p-10 grid min-w-0 gap-6 sm:gap-8 md:grid-cols-[minmax(0,1fr)_auto] items-start">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="h-16 w-16 rounded-full border border-white/10 bg-[#0E0E0E]/80 flex items-center justify-center text-lg font-medium">
                {creator.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-normal break-words">{creator.name}</h1>
                {creator.niche && <div className="mt-1 text-[#CFCFCF]">{creator.niche}</div>}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {creator.tags.map(t => <Link key={t} to={`/assets?tag=${encodeURIComponent(t)}`} className="chip hover:border-[#FFD600]/60 hover:text-white">{t}</Link>)}
            </div>
          </div>
          <button
            onClick={() => setFollowing(f => !f)}
            className={`min-h-11 rounded-full px-6 py-2.5 text-sm font-medium transition ${
              following ? "border border-[#FFD600]/35 bg-[#0E0E0E]/80 text-white" : "btn-primary hover:bg-[#FFD600]"
            }`}
          >{following ? "Following" : "Follow"}</button>
        </div>
      </section>

      <section className="container-mb mt-12 sm:mt-16">
        {creator.description && <p className="max-w-2xl text-base sm:text-lg text-[#CFCFCF] leading-relaxed">{creator.description}</p>}
        <div className="mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 max-w-3xl">
          {[
            { l: "Assets", v: creatorAssets.length || creator.assetsCount },
            { l: "Downloads", v: `${(creator.downloads / 1000).toFixed(1)}k` },
            { l: "Followers", v: `${(creator.followers / 1000).toFixed(1)}k` },
            { l: "Rating", v: <span className="inline-flex items-center gap-1.5"><Star className="h-5 w-5 fill-white text-white" />{creator.rating}</span> },
          ].map(s => (
            <div key={s.l} className="border-l border-white/10 pl-4">
              <div className="text-2xl sm:text-3xl font-medium tracking-normal">{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-mb mt-20">
        <h2 className="text-2xl sm:text-3xl font-medium tracking-normal">Published assets by {creator.name}</h2>
        {creatorAssets.length === 0 && <div className="mt-6 card-premium p-8 sm:p-10 text-center text-[#CFCFCF]">No published assets yet.</div>}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {creatorAssets.map(a => <AssetCard key={a.slug} asset={a} />)}
        </div>
      </section>

      {creator.strengths.length > 0 && (
        <section className="container-mb mt-20 sm:mt-28">
          <div className="card-premium p-5 sm:p-8">
            <div className="eyebrow">Strengths</div>
            <ul className="mt-4 space-y-3">
              {creator.strengths.map(s => (
                <li key={s} className="flex items-start gap-3 text-white/80"><Check className="h-4 w-4 mt-0.5 text-[#FFD600]" /> {s}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {creatorPosts.length > 0 && (
        <section className="container-mb mt-20">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-normal">Posts by {creator.name}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {creatorPosts.map(p => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="card-premium p-6">
                <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">{p.category}</div>
                <h3 className="mt-3 text-lg font-medium tracking-normal leading-snug">{p.title}</h3>
                <p className="mt-2 text-sm text-[#CFCFCF]">{p.excerpt}</p>
                <div className="mt-4 text-xs text-[#CFCFCF]/70">{p.date}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-mb mt-20 sm:mt-28">
        <div className="card-premium p-5 sm:p-8 md:p-14">
          <div className="eyebrow">For creators</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-normal max-w-2xl">Have a repeatable workflow others would pay for?</h2>
          <p className="mt-4 text-[#CFCFCF] max-w-2xl">Package it as an AI asset on Make Better. We handle discovery, trust signals, and payments while you focus on the work.</p>
          <Link to="/submit" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full btn-primary px-6 py-3 text-sm font-medium transition">
            List your asset <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
