import { useEffect, useMemo, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import { Asset, assets, ProductType } from "@/data/marketplace";
import { Search } from "lucide-react";
import { dbAssetToAsset } from "@/lib/asset-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { listPublishedAssets } from "@/services/assets";

const filters: ("All" | ProductType)[] = ["All", "Prompts", "AI Agents", "AI Assistants", "Workflows", "Templates"];
const sorts = ["Trending", "Newest", "Most Downloaded", "Highest Rated", "Free First"] as const;

export default function AssetsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<typeof filters[number]>("All");
  const [sort, setSort] = useState<typeof sorts[number]>("Trending");
  const [visible, setVisible] = useState(9);
  const [remoteAssets, setRemoteAssets] = useState<Asset[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const rows = await listPublishedAssets();
        if (!cancelled) setRemoteAssets(rows.map(dbAssetToAsset));
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Using demo assets because Supabase assets could not be loaded."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const source = remoteAssets.length > 0 ? remoteAssets : assets;
    let list = source.filter(a => filter === "All" || a.productType === filter);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(t) ||
        a.description.toLowerCase().includes(t) ||
        a.tags.some(tag => tag.toLowerCase().includes(t))
      );
    }
    switch (sort) {
      case "Newest": list = [...list].reverse(); break;
      case "Most Downloaded": list = [...list].sort((a, b) => b.downloads - a.downloads); break;
      case "Highest Rated": list = [...list].sort((a, b) => b.rating - a.rating); break;
      case "Free First": list = [...list].sort((a, b) => a.price - b.price); break;
    }
    return list;
  }, [q, filter, sort, remoteAssets]);

  return (
    <SiteLayout>
      <section className="container-mb pt-12 sm:pt-16 md:pt-24 pb-8 sm:pb-10">
        <div className="eyebrow">AI Assets</div>
        <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.06] max-w-4xl break-words">
          Explore AI assets built to help you do better work.
        </h1>
        <p className="mt-4 sm:mt-5 max-w-2xl text-[#94A3B8] text-base sm:text-lg leading-relaxed">
          Search proven prompts, agents, assistants, workflows, and templates created to save time and improve results.
        </p>

        <div className="mt-8 sm:mt-10 flex min-h-14 items-center gap-3 rounded-2xl border border-[#1E293B] bg-[#111827]/60 p-2 pl-4 sm:pl-5 max-w-3xl focus-within:border-white/30 transition">
          <Search className="h-5 w-5 text-[#94A3B8]/70" />
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
                    ? "bg-[#F97316] text-white border-[#F97316]"
                    : "border-[#1E293B] bg-[#111827]/60 text-[#94A3B8] hover:text-white hover:border-[#3B82F6]/50"
                }`}
              >{f}</button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sorts[number])}
            className="min-h-11 w-full rounded-full border border-[#1E293B] bg-[#111827]/60 px-4 py-2 text-sm text-white/80 focus:outline-none focus:border-[#3B82F6]/70 md:w-auto"
          >
            {sorts.map(s => <option className="bg-black" key={s}>{s}</option>)}
          </select>
        </div>
      </section>

      <section className="container-mb">
        {err && <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{err}</div>}
        {loading && <div className="mb-6 card-premium p-4 text-sm text-[#94A3B8]">Loading marketplace assets...</div>}
        {filtered.length === 0 ? (
          <div className="card-premium p-8 sm:p-16 text-center">
            <h3 className="text-xl sm:text-2xl font-medium tracking-tight">No assets found</h3>
            <p className="mt-2 text-[#94A3B8]">Try a broader search or clear filters to see everything.</p>
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
                  className="min-h-11 rounded-full border border-[#1E293B] bg-[#111827]/80 px-6 py-2.5 text-sm hover:bg-[#2563FF]/15 transition"
                >Load more</button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="container-mb mt-20 sm:mt-28">
        <div className="card-premium p-5 sm:p-8 md:p-14 max-w-4xl">
          <div className="eyebrow">Why this works</div>
          <h2 className="mt-5 text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em] leading-tight">Find the right asset faster.</h2>
          <p className="mt-4 text-[#94A3B8] text-base sm:text-lg leading-relaxed">
            Each asset on Make Better solves a specific problem — getting leads, creating faster, ranking higher, automating tasks, improving output.
            Filter by what you want to do, not by what something is called.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
