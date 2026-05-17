import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import AssetVisual from "@/components/AssetVisual";
import GetAssetModal from "@/components/GetAssetModal";
import { Asset, assets, assetsByCreator, Creator, getAsset, getCreator, postsByCreator, platformStats } from "@/data/marketplace";
import { Star, Download, ArrowUpRight, Check, X } from "lucide-react";
import { dbAssetToAsset, dbCreatorToCreator } from "@/lib/asset-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { getPublishedAssetBySlug } from "@/services/assets";
import { listAssetReviews } from "@/services/reviews";

const beforeAfter = {
  before: ["Guessing what to sell", "Manual competitor research", "Weak product angles", "Slow decision making"],
  after: ["Validated product ideas", "Clear demand signals", "Better offer positioning", "Faster launches"],
};

const useCases = [
  "Launch a new Shopify store with better product selection",
  "Find new winners for an existing store",
  "Improve ad angles before spending budget",
  "Use as a daily product research workflow",
  "Hand results to your media buyer or VA",
  "Reduce failed tests and wasted time",
];

const includes = [
  "Research prompt system",
  "Competitor analysis workflow",
  "Offer angle generator",
  "Trend validation checklist",
  "Setup guide",
  "Usage examples",
  "Best practices",
  "Future updates",
];

const reviews = [
  { name: "Marcus L.", rating: 5, body: "Cut my product research from days to under an hour. The angle generator alone is worth it." },
  { name: "Priya S.", rating: 5, body: "First asset I bought here that actually delivered. Validated 3 winners in week one." },
  { name: "Jonas K.", rating: 4, body: "Solid system. The competitor workflow is a cheat code if you sell DTC." },
];

export default function AssetPage() {
  const { slug } = useParams();
  const mockAsset = getAsset(slug || "");
  const [remoteAsset, setRemoteAsset] = useState<Asset | null>(null);
  const [remoteCreator, setRemoteCreator] = useState<Creator | null>(null);
  const [remoteUseCases, setRemoteUseCases] = useState<string[]>([]);
  const [remoteIncludes, setRemoteIncludes] = useState<string[]>([]);
  const [remoteBefore, setRemoteBefore] = useState<string[]>([]);
  const [remoteAfter, setRemoteAfter] = useState<string[]>([]);
  const [remoteReviews, setRemoteReviews] = useState<typeof reviews>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const row = await getPublishedAssetBySlug(slug || "");
        if (!cancelled && row) {
          setRemoteAsset(dbAssetToAsset(row));
          setRemoteCreator(dbCreatorToCreator(row.creators));
          setRemoteUseCases(row.use_cases || []);
          setRemoteIncludes(row.included || []);
          setRemoteBefore(row.before || []);
          setRemoteAfter(row.after || []);
          const reviewRows = await listAssetReviews(row.id);
          setRemoteReviews(reviewRows.map(r => ({
            name: r.profiles?.full_name || "Buyer",
            rating: r.rating,
            body: r.body || "",
          })).filter(r => r.body));
        }
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Using demo asset details because Supabase could not load this asset."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const asset = remoteAsset || mockAsset;
  if (!asset && !loading) return <Navigate to="/assets" replace />;
  if (!asset) return null;

  const creator = remoteCreator || getCreator(asset.creatorSlug)!;
  const creatorPosts = postsByCreator(creator.slug);
  const creatorAssets = assetsByCreator(creator.slug).filter(a => a.slug !== asset.slug).slice(0, 2);
  const related = assets.filter(a => a.slug !== asset.slug && a.productType === asset.productType).slice(0, 3);
  const pageBefore = remoteBefore.length > 0 ? remoteBefore : beforeAfter.before;
  const pageAfter = remoteAfter.length > 0 ? remoteAfter : beforeAfter.after;
  const pageUseCases = remoteUseCases.length > 0 ? remoteUseCases : useCases;
  const pageIncludes = remoteIncludes.length > 0 ? remoteIncludes : includes;
  const pageReviews = remoteReviews.length > 0 ? remoteReviews : reviews;

  return (
    <SiteLayout>
      {err && <section className="container-mb pt-6"><div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{err}</div></section>}
      {/* HERO */}
      <section className="container-mb pt-10 sm:pt-12 md:pt-16">
        <div className="grid min-w-0 gap-8 sm:gap-12 lg:grid-cols-[1.1fr_minmax(0,1fr)] items-start">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">{asset.category}</div>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.06] break-words">{asset.title}</h1>
            <p className="mt-5 text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-xl">{asset.description}</p>

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5"><Download className="h-4 w-4" /> {asset.downloads.toLocaleString()} downloads</span>
              <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-white text-white" /> {asset.rating} ({asset.reviewCount})</span>
              <Link to={`/creator/${creator.slug}`} className="hover:text-white">by {creator.name}</Link>
            </div>

            <div className="mt-8 sm:mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="text-2xl sm:text-3xl font-medium tracking-tight">
                {asset.price === 0 ? <span className="text-emerald-300">Free</span> : `$${asset.price}`}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full btn-primary px-7 py-3.5 text-sm font-medium transition sm:w-auto"
              >
                {asset.price === 0 ? "Get Asset" : "Join Waitlist"} <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-xs text-[#94A3B8]/70 max-w-md">
              {asset.price === 0 ? "Free assets unlock instantly after signup." : "Paid purchases are coming soon. Join the waitlist and we will contact you when access opens."}
            </p>
          </div>

          <AssetVisual title={asset.title} />
        </div>
      </section>

      {/* PROBLEM */}
      <section className="container-mb mt-20 sm:mt-28">
        <div className="max-w-3xl">
          <div className="eyebrow">The problem</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em]">What problem does this solve?</h2>
          <p className="mt-5 text-[#94A3B8] text-base sm:text-lg leading-relaxed">
            Most store owners waste weeks testing random products with no system behind it. This asset gives you a repeatable validation loop — so you stop guessing and start launching products with real demand signals behind them.
          </p>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="container-mb mt-14 sm:mt-20 grid gap-5 md:grid-cols-2">
        <div className="card-premium p-5 sm:p-8">
          <div className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">Before</div>
          <ul className="mt-5 space-y-3">
            {pageBefore.map(i => (
              <li key={i} className="flex items-start gap-3 text-[#94A3B8]"><X className="h-4 w-4 mt-0.5 text-white/30" /> {i}</li>
            ))}
          </ul>
        </div>
        <div className="card-premium p-5 sm:p-8 border-[#3B82F6]/35">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">After</div>
          <ul className="mt-5 space-y-3">
            {pageAfter.map(i => (
              <li key={i} className="flex items-start gap-3 text-white"><Check className="h-4 w-4 mt-0.5 text-emerald-300" /> {i}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* USE CASES */}
      <section className="container-mb mt-20 sm:mt-28">
        <div className="eyebrow">Use cases</div>
        <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em] max-w-2xl">Where this asset fits</h2>
        <div className="mt-8 sm:mt-10 grid gap-4 md:grid-cols-2">
          {pageUseCases.map(u => (
            <div key={u} className="card-premium p-5 flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
              <span className="text-white/80">{u}</span>
            </div>
          ))}
        </div>
      </section>

      {/* INCLUDES */}
      <section className="container-mb mt-20 sm:mt-28">
        <div className="card-premium p-5 sm:p-8 md:p-10">
          <div className="eyebrow">Inside the asset</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em]">What's included</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pageIncludes.map(i => (
              <div key={i} className="flex items-start gap-2 rounded-2xl border border-[#1E293B] bg-[#111827]/60 p-4 text-sm text-white/80">
                <Check className="h-4 w-4 text-emerald-300" /> {i}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="container-mb mt-20 sm:mt-28">
        <div className="flex items-start sm:items-end justify-between flex-col sm:flex-row sm:flex-wrap gap-4">
          <div>
            <div className="eyebrow">Reviews</div>
            <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em]">What buyers say</h2>
          </div>
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <Star className="h-5 w-5 fill-white text-white" />
            <span className="text-2xl font-medium text-white">{asset.rating}</span>
            <span className="text-sm">({asset.reviewCount} reviews)</span>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {pageReviews.map((r, i) => (
            <div key={i} className="card-premium p-6">
              <div className="flex">{Array.from({length: r.rating}).map((_, j) => <Star key={j} className="h-4 w-4 fill-white text-white" />)}</div>
              <p className="mt-3 text-white/75 leading-relaxed">"{r.body}"</p>
              <div className="mt-4 text-xs text-[#94A3B8]/80">— {r.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CREATOR */}
      <section className="container-mb mt-20 sm:mt-28">
        <div className="card-premium p-5 sm:p-8 md:p-10 grid min-w-0 gap-6 sm:gap-8 md:grid-cols-[minmax(0,1fr)_auto] items-center">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div className="h-14 w-14 rounded-full border border-[#1E293B] bg-[#111827]/70 flex items-center justify-center font-medium">
              {creator.name.split(" ").map(w => w[0]).join("")}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]/70">Creator</div>
              <div className="mt-1 text-xl sm:text-2xl font-medium tracking-tight break-words">{creator.name}</div>
              <p className="mt-2 text-[#94A3B8] max-w-lg">{creator.description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#94A3B8]">
                <span>{creator.assetsCount} assets</span>
                <span>{(creator.downloads/1000).toFixed(1)}k downloads</span>
                <span>{creator.monthlyRevenue}</span>
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-white text-white" /> {creator.rating}</span>
              </div>
            </div>
          </div>
          <Link to={`/creator/${creator.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-full btn-primary px-5 py-2.5 text-sm font-medium transition">
            Open profile
          </Link>
        </div>
      </section>

      {/* CREATOR BLOG */}
      {creatorPosts.length > 0 && (
        <section className="container-mb mt-20 sm:mt-28">
          <div className="eyebrow">Learn from this creator</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em]">More from {creator.name}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {creatorPosts.map(p => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="card-premium p-6 group">
                <div className="text-xs uppercase tracking-[0.16em] text-[#94A3B8]/70">{p.category}</div>
                <h3 className="mt-3 text-lg font-medium tracking-tight leading-snug">{p.title}</h3>
                <p className="mt-2 text-sm text-[#94A3B8]">{p.excerpt}</p>
                <div className="mt-4 text-xs text-[#94A3B8]/70">{p.date}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {creatorAssets.length > 0 && (
        <section className="container-mb mt-20">
          <div className="eyebrow">More by {creator.name}</div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {creatorAssets.map(a => <AssetCard key={a.slug} asset={a} />)}
          </div>
        </section>
      )}

      {/* RELATED */}
      <section className="container-mb mt-20 sm:mt-28">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em]">Related assets</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {related.map(a => <AssetCard key={a.slug} asset={a} />)}
        </div>
      </section>

      {/* CREATOR CTA */}
      <section className="container-mb mt-20 sm:mt-28">
        <div className="card-premium p-5 sm:p-8 md:p-14">
          <div className="eyebrow">For creators</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-5xl font-medium tracking-[-0.03em] max-w-3xl">Built something that makes your work faster?</h2>
          <p className="mt-5 text-[#94A3B8] text-base sm:text-lg max-w-2xl">Turn it into an AI asset people can discover, trust, and buy on Make Better.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6 max-w-2xl">
            <div><div className="text-2xl font-medium">{platformStats.assets}</div><div className="text-xs text-[#94A3B8]/70 uppercase tracking-wider mt-1">Listed Assets</div></div>
            <div><div className="text-2xl font-medium">{platformStats.visitors}</div><div className="text-xs text-[#94A3B8]/70 uppercase tracking-wider mt-1">Organic Visitors</div></div>
            <div><div className="text-2xl font-medium">{platformStats.creators}</div><div className="text-xs text-[#94A3B8]/70 uppercase tracking-wider mt-1">Creators</div></div>
          </div>
          <Link to="/submit" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full btn-primary px-6 py-3 text-sm font-medium transition">
            List Your Asset <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <GetAssetModal asset={asset} open={modalOpen} onClose={() => setModalOpen(false)} />
    </SiteLayout>
  );
}
