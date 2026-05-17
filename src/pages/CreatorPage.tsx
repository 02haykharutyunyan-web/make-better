import { useParams, Navigate, Link } from "react-router-dom";
import { useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import { assetsByCreator, creators, getCreator, postsByCreator } from "@/data/marketplace";
import { Star, ArrowUpRight, Check } from "lucide-react";

export default function CreatorPage() {
  const { slug } = useParams();
  const creator = getCreator(slug || "");
  const [following, setFollowing] = useState(false);
  if (!creator) return <Navigate to="/creators" replace />;

  const creatorAssets = assetsByCreator(creator.slug);
  const creatorPosts = postsByCreator(creator.slug);

  return (
    <SiteLayout>
      <section className="container-mb pt-12 md:pt-16">
        <div className="card-premium p-8 md:p-10 grid gap-8 md:grid-cols-[1fr_auto] items-start">
          <div>
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full border border-white/15 bg-white/[0.06] flex items-center justify-center text-lg font-medium">
                {creator.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-medium tracking-tight">{creator.name}</h1>
                <div className="mt-1 text-white/55">{creator.niche}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {creator.tags.map(t => <span key={t} className="chip">{t}</span>)}
            </div>
          </div>
          <button
            onClick={() => setFollowing(f => !f)}
            className={`rounded-full px-6 py-2.5 text-sm font-medium transition ${
              following
                ? "border border-white/20 bg-white/[0.06] text-white"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >{following ? "Following" : "Follow"}</button>
        </div>
      </section>

      <section className="container-mb mt-16">
        <h2 className="text-3xl md:text-5xl font-medium tracking-[-0.03em] max-w-3xl">
          AI assets for founders, marketers, and ecommerce teams.
        </h2>
        <p className="mt-5 max-w-2xl text-lg text-white/60">{creator.description}</p>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl">
          {[
            { l: "Assets", v: creator.assetsCount },
            { l: "Downloads", v: `${(creator.downloads/1000).toFixed(1)}k` },
            { l: "Followers", v: `${(creator.followers/1000).toFixed(1)}k` },
            { l: "Rating", v: <span className="inline-flex items-center gap-1.5"><Star className="h-5 w-5 fill-white text-white" />{creator.rating}</span> },
          ].map(s => (
            <div key={s.l} className="border-l border-white/10 pl-4">
              <div className="text-3xl font-medium tracking-tight">{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-mb mt-20">
        <h2 className="text-3xl font-medium tracking-tight">Popular assets by {creator.name}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {creatorAssets.map(a => <AssetCard key={a.slug} asset={a} />)}
        </div>
      </section>

      <section className="container-mb mt-28 grid gap-8 md:grid-cols-2">
        <div className="card-premium p-8">
          <div className="eyebrow">Why follow</div>
          <h3 className="mt-4 text-2xl font-medium tracking-tight">Operator-grade systems, packaged.</h3>
          <p className="mt-3 text-white/60">Get every new asset, update, and playbook from {creator.name} the moment it ships. No fluff, just systems that work.</p>
        </div>
        <div className="card-premium p-8">
          <div className="eyebrow">Strengths</div>
          <ul className="mt-4 space-y-3">
            {creator.strengths.map(s => (
              <li key={s} className="flex items-start gap-3 text-white/80"><Check className="h-4 w-4 mt-0.5 text-emerald-300" /> {s}</li>
            ))}
          </ul>
        </div>
      </section>

      {creatorPosts.length > 0 && (
        <section className="container-mb mt-20">
          <h2 className="text-3xl font-medium tracking-tight">Posts by {creator.name}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {creatorPosts.map(p => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="card-premium p-6">
                <div className="text-xs uppercase tracking-[0.16em] text-white/40">{p.category}</div>
                <h3 className="mt-3 text-lg font-medium tracking-tight leading-snug">{p.title}</h3>
                <p className="mt-2 text-sm text-white/55">{p.excerpt}</p>
                <div className="mt-4 text-xs text-white/40">{p.date}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-mb mt-28">
        <div className="card-premium p-10 md:p-14">
          <div className="eyebrow">For creators</div>
          <h2 className="mt-5 text-3xl md:text-4xl font-medium tracking-[-0.03em] max-w-2xl">Have a repeatable workflow others would pay for?</h2>
          <p className="mt-4 text-white/60 max-w-2xl">Package it as an AI asset on Make Better. We handle discovery, trust signals, and payments — you focus on the work.</p>
          <Link to="/submit" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-3 text-sm font-medium hover:bg-white/90 transition">
            List your asset <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="container-mb mt-20">
        <h3 className="text-xl text-white/70">Other creators</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {creators.filter(c => c.slug !== creator.slug).map(c => (
            <Link key={c.slug} to={`/creator/${c.slug}`} className="card-premium p-6">
              <div className="text-lg font-medium">{c.name}</div>
              <div className="mt-1 text-sm text-white/55">{c.niche}</div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
