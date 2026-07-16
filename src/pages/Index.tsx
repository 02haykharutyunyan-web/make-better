import { Link } from "react-router-dom";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import type { Asset, BlogPost, Collection, Creator } from "@/data/marketplace";
import { productTypes, platformStats } from "@/data/marketplace-meta";
import { ArrowUpRight, Search, Star } from "lucide-react";
import { listPublishedAssets } from "@/services/assets";
import { dbAssetToAsset, dbCreatorToCreator } from "@/lib/asset-mappers";
import { listPublishedBlogPosts, listPublishedCollections } from "@/services/content";
import { listActiveCreators } from "@/services/creators";
import { dbBlogToBlogPost, dbCollectionToCollection } from "@/lib/content-mappers";
import { CategoryGlyph, ProductMockupCard, SectionVisual } from "@/components/visuals/MarketplaceVisuals";

const suggested = [
  "free prompts for TikTok",
  "AI assets for cold email",
  "SEO blog writing workflow",
  "Shopify growth assets",
];

type SearchableAsset = {
  asset: Asset;
  creatorName: string;
};

export default function Index() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [remoteAssets, setRemoteAssets] = useState<SearchableAsset[]>([]);
  const [remoteCollections, setRemoteCollections] = useState<Collection[]>([]);
  const [remoteCreators, setRemoteCreators] = useState<Creator[]>([]);
  const [remotePosts, setRemotePosts] = useState<BlogPost[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAssets() {
      setLoadingAssets(true);
      try {
        const rows = await listPublishedAssets();
        if (!cancelled) {
          setRemoteAssets(rows.map(row => ({
            asset: dbAssetToAsset(row),
            creatorName: row.creators?.brand_name || "",
          })));
        }
      } catch {
        if (!cancelled) setRemoteAssets([]);
      } finally {
        if (!cancelled) setLoadingAssets(false);
      }
    }

    loadAssets();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadContent() {
      try {
        const [collectionRows, creatorRows, postRows] = await Promise.all([
          listPublishedCollections(),
          listActiveCreators(),
          listPublishedBlogPosts(),
        ]);
        if (!cancelled) {
          setRemoteCollections(collectionRows.map(dbCollectionToCollection).slice(0, 6));
          setRemoteCreators((creatorRows.map(dbCreatorToCreator).filter(Boolean) as Creator[]).slice(0, 3));
          setRemotePosts(postRows.map(dbBlogToBlogPost).slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setRemoteCollections([]);
          setRemoteCreators([]);
          setRemotePosts([]);
        }
      }
    }
    loadContent();
    return () => { cancelled = true; };
  }, []);

  const searchableAssets = useMemo<SearchableAsset[]>(() => {
    return remoteAssets;
  }, [remoteAssets]);

  const displayedAssets = useMemo(() => {
    const normalizedQuery = activeQuery.trim().toLowerCase();
    if (!normalizedQuery) return searchableAssets.slice(0, 6).map(({ asset }) => asset);

    return searchableAssets
      .filter(({ asset, creatorName }) => [
        asset.title,
        asset.category,
        asset.productType,
        asset.description,
        creatorName,
      ].some(value => value.toLowerCase().includes(normalizedQuery)))
      .map(({ asset }) => asset);
  }, [activeQuery, searchableAssets]);

  const handleSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setActiveQuery(query.trim());
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const runSuggestedSearch = (value: string) => {
    setQuery(value);
    setActiveQuery(value);
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="section-rich relative pt-14 pb-20 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32 overflow-hidden">
        <SectionVisual variant="market" />
        <div className="container-mb grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-center">
          <div>
            <div className="eyebrow animate-fade-up">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFD600] animate-pulse" />
              AI Assets Marketplace
            </div>
            <h1 className="mt-6 text-[clamp(2.45rem,12vw,4.5rem)] md:text-7xl font-medium tracking-normal leading-[1.03] max-w-5xl animate-fade-up break-words">
              Find ready-to-use <span className="text-[#FFD600]">AI assets</span> that save time, improve output, and help you work <span className="text-[#FFD600]">smarter</span>.
            </h1>
            <p className="mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg text-[#CFCFCF] leading-relaxed animate-fade-up">
              Browse proven prompts, agents, assistants, workflows, and API tools built to solve real business problems faster.
            </p>

            <div className="mt-8 sm:mt-10 max-w-2xl animate-fade-up">
              <form onSubmit={handleSearch} className="hero-search-panel glass-panel flex flex-col gap-2 rounded-2xl p-2 transition sm:flex-row sm:items-center sm:gap-3 sm:pl-5">
                <Search className="h-5 w-5 text-[#CFCFCF]/70" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find assets for dropshipping"
                  className="hero-search-input min-h-11 flex-1 px-2 py-2 text-base placeholder:text-white/35 focus:outline-none sm:px-0 sm:py-3"
                />
                <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl btn-primary px-5 py-2.5 text-sm font-medium transition">Search</button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {suggested.map(s => (
                  <button key={s} type="button" onClick={() => runSuggestedSearch(s)} className="chip hover:border-[#FFD600]/60 hover:text-white transition">{s}</button>
                ))}
              </div>
            </div>

            <div className="mt-12 sm:mt-16 grid gap-4 sm:grid-cols-3 sm:gap-6 max-w-2xl">
              {[
                { label: "AI Assets", value: platformStats.assets },
                { label: "Creators", value: platformStats.creators },
                { label: "Organic Visitors", value: platformStats.visitors },
              ].map(s => (
                <div key={s.label} className="border-l border-white/10 pl-4">
                  <div className="text-2xl md:text-4xl font-medium tracking-normal">{s.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <ProductMockupCard />
        </div>
      </section>

      {/* POPULAR ASSETS */}
      <Section
        eyebrow={activeQuery ? "Search results" : "This week"}
        title={activeQuery ? `Assets matching "${activeQuery}"` : "Popular AI assets this week"}
        description={activeQuery ? "Results update directly on the homepage across title, category, product type, description, and creator." : "Start with assets people already trust. High ratings, real downloads, and clear use cases."}
        action={{ label: "Browse all assets", to: "/assets" }}
      >
        <div ref={resultsRef}>
          {loadingAssets && remoteAssets.length === 0 && (
            <div className="mb-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading published assets...</div>
          )}
          {displayedAssets.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {displayedAssets.map(a => <AssetCard key={a.slug} asset={a} />)}
            </div>
          ) : !loadingAssets && (
            <div className="card-premium p-8 sm:p-12 text-center">
              <h3 className="text-xl sm:text-2xl font-medium tracking-normal">No assets found</h3>
              <p className="mx-auto mt-2 max-w-md text-sm sm:text-base text-[#CFCFCF]">
                Try a broader search, or clear the query to return to the default featured assets.
              </p>
              <button
                type="button"
                onClick={() => { setQuery(""); setActiveQuery(""); }}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl btn-secondary px-5 py-2.5 text-sm font-medium"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* PRODUCT TYPES */}
      <Section
        eyebrow="Browse by product type"
        title="What format works for you?"
        description="Categories are product types, not goals. Pick the format that fits how you work."
        visual="lines"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {productTypes.map(pt => (
            <Link to="/assets" key={pt.type} className="card-premium p-5 sm:p-6 group">
              <CategoryGlyph type={pt.type} />
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="mt-5 text-lg font-medium tracking-normal">{pt.type}</h3>
                <span className="text-xs text-[#CFCFCF]/70">{pt.count}</span>
              </div>
              <p className="mt-2 text-sm text-[#CFCFCF] leading-relaxed">{pt.description}</p>
              <div className="mt-4 inline-flex items-center text-xs text-[#CFCFCF] group-hover:text-white">
                Explore <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* COLLECTIONS */}
      <Section
        eyebrow="Collections"
        title="Browse by goal"
        description="Start with what you want to achieve. Open curated lists built around real goals, not random filters."
        action={{ label: "All collections", to: "/collections" }}
        visual="mesh"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {remoteCollections.length === 0 && <div className="card-premium p-8 sm:p-10 text-center text-[#CFCFCF]">No published collections yet.</div>}
          {remoteCollections.map(c => (
            <Link to={`/collections/${c.slug}`} key={c.slug} className="card-premium p-5 sm:p-7 group">
              <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">Goal</div>
              <h3 className="mt-3 text-xl sm:text-2xl font-medium tracking-normal">{c.title}</h3>
              <p className="mt-2 text-sm text-[#CFCFCF]">{c.description}</p>
              <div className="mt-5 inline-flex items-center text-sm text-white/80 group-hover:text-white">
                Open collection <ArrowUpRight className="ml-1 h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* TOP CREATORS */}
      <Section
        eyebrow="Top performing"
        title="Creators powering the marketplace"
        description="Real builders shipping repeatable systems. Follow the ones aligned with your work."
        action={{ label: "All creators", to: "/creators" }}
        visual="market"
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {remoteCreators.length === 0 && <div className="card-premium p-8 sm:p-10 text-center text-[#CFCFCF] lg:col-span-3">No active creators yet.</div>}
          {remoteCreators.map(c => (
            <div key={c.slug} className="card-premium p-5 sm:p-7">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-12 w-12 rounded-full border border-white/10 bg-[#0E0E0E]/70 flex items-center justify-center text-sm font-medium">
                  {c.name.split(" ").map(w => w[0]).join("")}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-medium tracking-normal">{c.name}</div>
                  <div className="text-xs text-[#CFCFCF]">{c.niche}</div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Followers" value={`${(c.followers/1000).toFixed(1)}k`} />
                <Stat label="Assets" value={c.assetsCount} />
                <Stat label="Downloads" value={`${(c.downloads/1000).toFixed(1)}k`} />
                <Stat label="Rating" value={<span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-white text-white" />{c.rating}</span>} />
              </div>
              <div className="mt-4 text-xs text-[#CFCFCF]">Approx. revenue <span className="text-white/80">{c.monthlyRevenue}</span></div>
              <Link to={`/creator/${c.slug}`} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 bg-[#0E0E0E]/80 py-2.5 text-sm hover:bg-[#FFD600]/15 transition">
                Open profile
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* BLOG */}
      <Section
        eyebrow="Resources"
        title="Learn how to get better results with AI"
        description="Simple guides, smart strategies, and practical tutorials to help you use AI assets the right way."
        action={{ label: "Read the blog", to: "/blog" }}
        visual="lines"
      >
        <div className="grid gap-5 md:grid-cols-3">
          {remotePosts.length === 0 && <div className="card-premium p-8 sm:p-10 text-center text-[#CFCFCF] md:col-span-3">No published posts yet.</div>}
          {remotePosts.map(p => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className="card-premium p-7 group">
              <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">{p.category}</div>
              <h3 className="mt-3 text-xl font-medium tracking-normal leading-snug">{p.title}</h3>
              <p className="mt-2 text-sm text-[#CFCFCF] line-clamp-3">{p.excerpt}</p>
              <div className="mt-5 text-xs text-[#CFCFCF]/70">{p.date}</div>
            </Link>
          ))}
        </div>
      </Section>

      {/* CREATOR CTA */}
      <section className="container-mb mt-24 md:mt-32">
        <div className="card-premium p-5 sm:p-8 md:p-16 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[#0E0E0E]/70 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="eyebrow">For creators</div>
            <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-medium tracking-normal leading-tight">
              Turn what makes your work faster into something others can buy.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-[#CFCFCF] max-w-2xl">
              If you built an AI asset that saves time, improves output, or drives results, list it where people already come to discover better ways to work.
            </p>
            <div className="mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-2xl">
              {[
                { label: "Listed Assets", value: platformStats.assets },
                { label: "Organic Visitors", value: platformStats.visitors },
                { label: "Creators", value: platformStats.creators },
                { label: "Downloads", value: platformStats.downloads },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-3xl font-medium tracking-normal">{s.value}</div>
                  <div className="text-xs uppercase tracking-[0.14em] text-[#CFCFCF]/70 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <Link to="/submit" className="mt-10 inline-flex min-h-12 items-center justify-center gap-2 rounded-full btn-primary px-6 py-3 text-sm font-medium transition">
              List your asset <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0E0E0E]/70 p-3">
      <div className="text-[11px] text-[#CFCFCF]/80 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  );
}

function Section({ eyebrow, title, description, action, visual, children }: { eyebrow: string; title: string; description?: string; action?: { label: string; to: string }; visual?: "mesh" | "lines" | "market"; children: React.ReactNode }) {
  return (
    <section className="container-mb section-rich mt-20 sm:mt-24 md:mt-32">
      {visual && <SectionVisual variant={visual} />}
      <div className="flex items-start sm:items-end justify-between gap-6 flex-col sm:flex-row sm:flex-wrap">
        <div className="max-w-2xl">
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-medium tracking-normal leading-tight">{title}</h2>
          {description && <p className="mt-3 text-[#CFCFCF] text-base md:text-lg">{description}</p>}
        </div>
        {action && (
          <Link to={action.to} className="inline-flex items-center gap-1.5 text-sm text-[#CFCFCF] hover:text-white border-b border-[#FFD600]/35 pb-0.5">
            {action.label} <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="mt-8 sm:mt-10">{children}</div>
    </section>
  );
}
