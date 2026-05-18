import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import { Asset, ProductType } from "@/data/marketplace";
import { ArrowUpRight, Search } from "lucide-react";
import { dbAssetToAsset } from "@/lib/asset-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { listPublishedAssets } from "@/services/assets";

const filters: ("All" | ProductType)[] = ["All", "Prompts", "AI Agents", "AI Assistants", "Workflows", "Templates"];
const sorts = ["Trending", "Newest", "Most Downloaded", "Highest Rated", "Free First"] as const;

export default function AssetsPage() {
  const [params] = useSearchParams();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<typeof filters[number]>("All");
  const [sort, setSort] = useState<typeof sorts[number]>("Trending");
  const [visible, setVisible] = useState(9);
  const [remoteAssets, setRemoteAssets] = useState<Asset[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tag = params.get("tag");
    if (tag) setQ(tag);
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const rows = await listPublishedAssets();
        if (!cancelled) setRemoteAssets(rows.map(dbAssetToAsset));
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load published marketplace assets."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = remoteAssets.filter(a => filter === "All" || a.productType === filter);
    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        a.productType.toLowerCase().includes(term) ||
        a.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    switch (sort) {
      case "Newest": return [...list].reverse();
      case "Most Downloaded": return [...list].sort((a, b) => b.downloads - a.downloads);
      case "Highest Rated": return [...list].sort((a, b) => b.rating - a.rating);
      case "Free First": return [...list].sort((a, b) => a.price - b.price);
      default: return list;
    }
  }, [q, filter, sort, remoteAssets]);

  return (
    <SiteLayout>
      <section className="container-mb pt-12 sm:pt-16 md:pt-24 pb-8 sm:pb-10">
        <div className="eyebrow">AI Assets</div>
        <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-normal leading-[1.06] max-w-4xl break-words">
          Explore AI assets built to help you do better work.
        </h1>
        <p className="mt-4 sm:mt-5 max-w-2xl text-[#CFCFCF] text-base sm:text-lg leading-relaxed">
          Search proven prompts, agents, assistants, workflows, and templates created to save time and improve results.
        </p>

        <div className="mt-8 sm:mt-10 flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-[#0E0E0E]/60 p-2 pl-4 sm:pl-5 max-w-3xl focus-within:border-white/30 transition">
          <Search className="h-5 w-5 text-[#CFCFCF]/70" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search assets, tags, creators..."
            className="min-w-0 flex-1 bg-transparent py-3 text-base placeholder:text-white/30 focus:outline-none"
          />
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
          <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`min-h-10 shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
                  filter === f
                    ? "bg-[#FFD600] text-[#050505] border-[#FFD600]"
                    : "border-white/10 bg-[#0E0E0E]/60 text-[#CFCFCF] hover:text-white hover:border-[#FFD600]/50"
                }`}
              >{f}</button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sorts[number])}
            className="min-h-11 w-full rounded-full border border-white/10 bg-[#0E0E0E]/60 px-4 py-2 text-sm text-white/80 focus:outline-none focus:border-[#FFD600]/70 md:w-auto"
          >
            {sorts.map(s => <option className="bg-black" key={s}>{s}</option>)}
          </select>
        </div>
      </section>

      <section className="container-mb">
        {err && <div className="mb-6 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
        {loading && <div className="mb-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading marketplace assets...</div>}
        {!loading && filtered.length === 0 ? (
          <div className="card-premium p-8 sm:p-16 text-center">
            <h3 className="text-xl sm:text-2xl font-medium tracking-normal">No assets found</h3>
            <p className="mt-2 text-[#CFCFCF]">Try a broader search or clear filters to see everything.</p>
            <button
              onClick={() => { setQ(""); setFilter("All"); }}
              className="mt-6 min-h-11 rounded-full btn-primary px-5 py-2 text-sm font-medium"
            >Clear filters</button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.slice(0, visible).map(a => <AssetCard key={a.slug} asset={a} />)}
            </div>
            {visible < filtered.length && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => setVisible(v => v + 6)}
                  className="min-h-11 rounded-full border border-white/10 bg-[#0E0E0E]/80 px-6 py-2.5 text-sm hover:bg-[#FFD600]/15 transition"
                >Load more</button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="container-mb mt-20 sm:mt-28">
        <div className="card-premium p-5 sm:p-8 md:p-14">
          <div className="eyebrow">Build or browse</div>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-normal leading-tight">Find the right asset faster, or publish the one your workflow already depends on.</h2>
              <p className="mt-4 text-[#CFCFCF] text-base sm:text-lg leading-relaxed">
                Buyers can search by category, tag, and outcome. Creators can submit focused tools, prompts, workflows, and templates for review.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link to="/collections" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#0E0E0E]/80 px-5 py-3 text-sm font-medium text-white/85 hover:border-[#FFD600]/50 hover:text-white transition">
                Explore collections <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full btn-primary px-5 py-3 text-sm font-medium transition">
                Submit an asset <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
