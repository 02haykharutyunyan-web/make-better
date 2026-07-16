import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import AssetVisual from "@/components/AssetVisual";
import GetAssetModal from "@/components/GetAssetModal";
import type { Asset, Creator } from "@/data/marketplace";
import { platformStats } from "@/data/marketplace-meta";
import { Star, Download, ArrowUpRight, Check, X } from "lucide-react";
import { dbAssetToAsset, dbCreatorToCreator } from "@/lib/asset-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { getPublishedAssetBySlug, listPublishedAssets } from "@/services/assets";
import { SectionVisual } from "@/components/visuals/MarketplaceVisuals";

export default function AssetPage() {
  const { slug } = useParams();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [useCases, setUseCases] = useState<string[]>([]);
  const [included, setIncluded] = useState<string[]>([]);
  const [before, setBefore] = useState<string[]>([]);
  const [after, setAfter] = useState<string[]>([]);
  const [related, setRelated] = useState<Asset[]>([]);
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
        if (!row) {
          if (!cancelled) setAsset(null);
          return;
        }

        const mappedAsset = dbAssetToAsset(row);
        const rows = await listPublishedAssets();
        const relatedRows = rows
          .filter(item => item.slug !== row.slug)
          .filter(item => item.product_type === row.product_type || (item.tags || []).some(tag => (row.tags || []).includes(tag)))
          .slice(0, 3);

        if (!cancelled) {
          setAsset(mappedAsset);
          setCreator(dbCreatorToCreator(row.creators));
          setUseCases(row.use_cases || []);
          setIncluded(row.included || []);
          setBefore(row.before || []);
          setAfter(row.after || []);
          setRelated(relatedRows.map(dbAssetToAsset));
        }
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load this published asset."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (!asset && !loading && !err) return <Navigate to="/assets" replace />;
  if (!asset) {
    return (
      <SiteLayout>
        <section className="container-mb pt-16 sm:pt-24 pb-20">
          {loading ? (
            <div className="card-premium p-6 text-[#CFCFCF]">Loading asset...</div>
          ) : (
            <div className="card-premium p-8 sm:p-10 text-center">
              <h1 className="text-2xl font-medium tracking-normal">Asset unavailable</h1>
              <p className="mt-3 text-[#CFCFCF]">{err || "This asset is not published yet."}</p>
              <Link to="/assets" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full btn-primary px-5 py-2 text-sm font-medium">
                Explore assets
              </Link>
            </div>
          )}
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      {err && <section className="container-mb pt-6"><div className="rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#CFCFCF]">{err}</div></section>}

      <section className="container-mb section-rich pt-10 sm:pt-12 md:pt-16">
        <SectionVisual variant="market" />
        <div className="grid min-w-0 gap-8 sm:gap-12 lg:grid-cols-[1.1fr_minmax(0,1fr)] items-start">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-[#CFCFCF]">{asset.category}</div>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-6xl font-medium tracking-normal leading-[1.06] break-words">{asset.title}</h1>
            <p className="mt-5 text-base sm:text-lg text-[#CFCFCF] leading-relaxed max-w-xl">{asset.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {asset.tags.map(tag => <Link key={tag} to={`/assets?tag=${encodeURIComponent(tag)}`} className="chip hover:border-[#FFD600]/60 hover:text-white">{tag}</Link>)}
            </div>

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#CFCFCF]">
              <span className="inline-flex items-center gap-1.5"><Download className="h-4 w-4" /> {asset.downloads.toLocaleString()} downloads</span>
              <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-white text-white" /> {asset.rating} ({asset.reviewCount})</span>
              {creator && <Link to={`/creator/${creator.slug}`} className="hover:text-white">by {creator.name}</Link>}
            </div>

            <div className="mt-8 sm:mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="text-2xl sm:text-3xl font-medium tracking-normal">
                {asset.price === 0 ? <span className="text-[#FFD600]">Free</span> : `$${asset.price}`}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full btn-primary px-7 py-3.5 text-sm font-medium transition sm:w-auto"
              >
                {asset.price === 0 ? "Get Asset" : "Join Waitlist"} <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <AssetVisual title={asset.title} />
        </div>
      </section>

      {asset.longDescription && (
        <section className="container-mb section-rich mt-20 sm:mt-28">
          <SectionVisual variant="lines" />
          <div className="max-w-3xl">
            <div className="eyebrow">Overview</div>
            <p className="mt-5 text-[#CFCFCF] text-base sm:text-lg leading-relaxed whitespace-pre-line">{asset.longDescription}</p>
          </div>
        </section>
      )}

      {(before.length > 0 || after.length > 0) && (
        <section className="container-mb mt-14 sm:mt-20 grid gap-5 md:grid-cols-2">
          {before.length > 0 && (
            <div className="card-premium p-5 sm:p-8">
              <div className="text-xs uppercase tracking-[0.18em] text-[#CFCFCF]">Before</div>
              <ul className="mt-5 space-y-3">
                {before.map(item => <li key={item} className="flex items-start gap-3 text-[#CFCFCF]"><X className="h-4 w-4 mt-0.5 text-white/30" /> {item}</li>)}
              </ul>
            </div>
          )}
          {after.length > 0 && (
            <div className="card-premium p-5 sm:p-8 border-[#FFD600]/35">
              <div className="text-xs uppercase tracking-[0.18em] text-[#FFD600]/80">After</div>
              <ul className="mt-5 space-y-3">
                {after.map(item => <li key={item} className="flex items-start gap-3 text-white"><Check className="h-4 w-4 mt-0.5 text-[#FFD600]" /> {item}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {useCases.length > 0 && (
        <section className="container-mb section-rich mt-20 sm:mt-28">
          <SectionVisual variant="mesh" />
          <div className="eyebrow">Use cases</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-normal max-w-2xl">Where this asset fits</h2>
          <div className="mt-8 sm:mt-10 grid gap-4 md:grid-cols-2">
            {useCases.map(item => (
              <div key={item} className="card-premium p-5 flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span className="text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {included.length > 0 && (
        <section className="container-mb section-rich mt-20 sm:mt-28">
          <SectionVisual variant="lines" />
          <div className="card-premium p-5 sm:p-8 md:p-10">
            <div className="eyebrow">Inside the asset</div>
            <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-normal">What's included</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {included.map(item => (
                <div key={item} className="flex items-start gap-2 rounded-2xl border border-white/10 bg-[#0E0E0E]/60 p-4 text-sm text-white/80">
                  <Check className="h-4 w-4 text-[#FFD600]" /> {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {creator && (
        <section className="container-mb mt-20 sm:mt-28">
          <div className="card-premium p-5 sm:p-8 md:p-10 grid min-w-0 gap-6 sm:gap-8 md:grid-cols-[minmax(0,1fr)_auto] items-center">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="h-14 w-14 rounded-full border border-white/10 bg-[#0E0E0E]/70 flex items-center justify-center font-medium">
                {creator.name.split(" ").map(word => word[0]).join("")}
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.18em] text-[#CFCFCF]/70">Creator</div>
                <div className="mt-1 text-xl sm:text-2xl font-medium tracking-normal break-words">{creator.name}</div>
                {creator.description && <p className="mt-2 text-[#CFCFCF] max-w-lg">{creator.description}</p>}
              </div>
            </div>
            <Link to={`/creator/${creator.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-full btn-primary px-5 py-2.5 text-sm font-medium transition">
              Open profile
            </Link>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="container-mb mt-20 sm:mt-28">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-normal">Related assets</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(item => <AssetCard key={item.slug} asset={item} />)}
          </div>
        </section>
      )}

      <section className="container-mb mt-20 sm:mt-28">
        <div className="card-premium p-5 sm:p-8 md:p-14">
          <div className="eyebrow">For creators</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-5xl font-medium tracking-normal max-w-3xl">Built something that makes your work faster?</h2>
          <p className="mt-5 text-[#CFCFCF] text-base sm:text-lg max-w-2xl">Turn it into an AI asset people can discover, trust, and buy on Make Better.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6 max-w-2xl">
            <div><div className="text-2xl font-medium">{platformStats.assets}</div><div className="text-xs text-[#CFCFCF]/70 uppercase tracking-wider mt-1">Listed assets</div></div>
            <div><div className="text-2xl font-medium">{platformStats.visitors}</div><div className="text-xs text-[#CFCFCF]/70 uppercase tracking-wider mt-1">Organic visitors</div></div>
            <div><div className="text-2xl font-medium">{platformStats.creators}</div><div className="text-xs text-[#CFCFCF]/70 uppercase tracking-wider mt-1">Creators</div></div>
          </div>
          <Link to="/submit" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full btn-primary px-6 py-3 text-sm font-medium transition">
            List your asset <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <GetAssetModal asset={asset as any} open={modalOpen} onClose={() => setModalOpen(false)} />
    </SiteLayout>
  );
}
