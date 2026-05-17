import { Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import { assets, collections, creators, productTypes, blogPosts, platformStats } from "@/data/marketplace";
import { ArrowUpRight, Search, Star } from "lucide-react";

const suggested = [
  "free prompts for TikTok",
  "AI assets for cold email",
  "SEO blog writing workflow",
  "Shopify growth assets",
];

export default function Index() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative pt-14 pb-20 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[420px] w-[720px] sm:h-[600px] sm:w-[1200px] max-w-none bg-white/[0.04] blur-3xl rounded-full" />
        </div>
        <div className="container-mb">
          <div className="eyebrow animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Assets Marketplace
          </div>
          <h1 className="mt-6 text-[clamp(2.45rem,12vw,4.5rem)] md:text-7xl font-medium tracking-[-0.04em] leading-[1.03] max-w-5xl animate-fade-up break-words">
            Find ready-to-use AI assets that <span className="text-[#94A3B8]">save time, improve output,</span> and help you work smarter.
          </h1>
          <p className="mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg text-[#94A3B8] leading-relaxed animate-fade-up">
            Browse proven prompts, agents, assistants, workflows, and API tools built to solve real business problems faster.
          </p>

          <div className="mt-8 sm:mt-10 max-w-2xl animate-fade-up">
            <div className="flex flex-col gap-2 rounded-2xl border border-[#1E293B] bg-[#111827]/60 p-2 focus-within:border-white/30 transition sm:flex-row sm:items-center sm:gap-3 sm:pl-5">
              <Search className="h-5 w-5 text-[#94A3B8]/70" />
              <input
                placeholder="Find assets for dropshipping"
                className="min-h-11 flex-1 bg-transparent px-2 py-2 text-base placeholder:text-white/30 focus:outline-none sm:px-0 sm:py-3"
              />
              <Link to="/assets" className="inline-flex min-h-11 items-center justify-center rounded-xl btn-primary px-5 py-2.5 text-sm font-medium transition">Search</Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggested.map(s => (
                <Link key={s} to="/assets" className="chip hover:border-[#3B82F6]/60 hover:text-white transition">{s}</Link>
              ))}
            </div>
          </div>

          <div className="mt-12 sm:mt-16 grid gap-4 sm:grid-cols-3 sm:gap-6 max-w-2xl">
            {[
              { label: "AI Assets", value: platformStats.assets },
              { label: "Creators", value: platformStats.creators },
              { label: "Organic Visitors", value: platformStats.visitors },
            ].map(s => (
              <div key={s.label} className="border-l border-[#1E293B] pl-4">
                <div className="text-2xl md:text-4xl font-medium tracking-tight">{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#94A3B8]/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR ASSETS */}
      <Section
        eyebrow="This week"
        title="Popular AI assets this week"
        description="Start with assets people already trust. High ratings, real downloads, and clear use cases."
        action={{ label: "Browse all assets", to: "/assets" }}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {assets.slice(0, 6).map(a => <AssetCard key={a.slug} asset={a} />)}
        </div>
      </Section>

      {/* PRODUCT TYPES */}
      <Section
        eyebrow="Browse by product type"
        title="What format works for you?"
        description="Categories are product types, not goals. Pick the format that fits how you work."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {productTypes.map(pt => (
            <Link to="/assets" key={pt.type} className="card-premium p-5 sm:p-6 group">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-medium tracking-tight">{pt.type}</h3>
                <span className="text-xs text-[#94A3B8]/70">{pt.count}</span>
              </div>
              <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">{pt.description}</p>
              <div className="mt-4 inline-flex items-center text-xs text-[#94A3B8] group-hover:text-white">
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
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map(c => (
            <Link to={`/collections/${c.slug}`} key={c.slug} className="card-premium p-5 sm:p-7 group">
              <div className="text-xs uppercase tracking-[0.16em] text-[#94A3B8]/70">Goal</div>
              <h3 className="mt-3 text-xl sm:text-2xl font-medium tracking-tight">{c.title}</h3>
              <p className="mt-2 text-sm text-[#94A3B8]">{c.description}</p>
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
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {creators.map(c => (
            <div key={c.slug} className="card-premium p-5 sm:p-7">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-12 w-12 rounded-full border border-[#1E293B] bg-[#111827]/70 flex items-center justify-center text-sm font-medium">
                  {c.name.split(" ").map(w => w[0]).join("")}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-medium tracking-tight">{c.name}</div>
                  <div className="text-xs text-[#94A3B8]">{c.niche}</div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Followers" value={`${(c.followers/1000).toFixed(1)}k`} />
                <Stat label="Assets" value={c.assetsCount} />
                <Stat label="Downloads" value={`${(c.downloads/1000).toFixed(1)}k`} />
                <Stat label="Rating" value={<span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-white text-white" />{c.rating}</span>} />
              </div>
              <div className="mt-4 text-xs text-[#94A3B8]">Approx. revenue <span className="text-white/80">{c.monthlyRevenue}</span></div>
              <Link to={`/creator/${c.slug}`} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#1E293B] bg-[#111827]/80 py-2.5 text-sm hover:bg-[#2563FF]/15 transition">
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
      >
        <div className="grid gap-5 md:grid-cols-3">
          {blogPosts.slice(0, 3).map(p => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className="card-premium p-7 group">
              <div className="text-xs uppercase tracking-[0.16em] text-[#94A3B8]/70">{p.category}</div>
              <h3 className="mt-3 text-xl font-medium tracking-tight leading-snug">{p.title}</h3>
              <p className="mt-2 text-sm text-[#94A3B8] line-clamp-3">{p.excerpt}</p>
              <div className="mt-5 text-xs text-[#94A3B8]/70">{p.date}</div>
            </Link>
          ))}
        </div>
      </Section>

      {/* CREATOR CTA */}
      <section className="container-mb mt-24 md:mt-32">
        <div className="card-premium p-5 sm:p-8 md:p-16 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[#111827]/70 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="eyebrow">For creators</div>
            <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.03em] leading-tight">
              Turn what makes your work faster into something others can buy.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-[#94A3B8] max-w-2xl">
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
                  <div className="text-3xl font-medium tracking-tight">{s.value}</div>
                  <div className="text-xs uppercase tracking-[0.14em] text-[#94A3B8]/70 mt-1">{s.label}</div>
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
    <div className="rounded-xl border border-[#1E293B] bg-[#0B1020]/70 p-3">
      <div className="text-[11px] text-[#94A3B8]/80 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  );
}

function Section({ eyebrow, title, description, action, children }: { eyebrow: string; title: string; description?: string; action?: { label: string; to: string }; children: React.ReactNode }) {
  return (
    <section className="container-mb mt-20 sm:mt-24 md:mt-32">
      <div className="flex items-start sm:items-end justify-between gap-6 flex-col sm:flex-row sm:flex-wrap">
        <div className="max-w-2xl">
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-medium tracking-[-0.03em] leading-tight">{title}</h2>
          {description && <p className="mt-3 text-[#94A3B8] text-base md:text-lg">{description}</p>}
        </div>
        {action && (
          <Link to={action.to} className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white border-b border-[#3B82F6]/35 pb-0.5">
            {action.label} <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="mt-8 sm:mt-10">{children}</div>
    </section>
  );
}
