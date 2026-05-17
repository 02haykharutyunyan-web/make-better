import SiteLayout from "@/components/layout/SiteLayout";
import { creators } from "@/data/marketplace";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";

export default function CreatorsPage() {
  return (
    <SiteLayout>
      <section className="container-mb pt-16 md:pt-24">
        <div className="eyebrow">Creators</div>
        <h1 className="mt-5 text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.04] max-w-4xl">
          Builders shipping the best AI assets.
        </h1>
        <p className="mt-5 max-w-2xl text-white/60 text-lg">
          Follow operators turning their repeatable workflows into assets you can buy and use today.
        </p>
      </section>

      <section className="container-mb mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {creators.map(c => (
          <Link key={c.slug} to={`/creator/${c.slug}`} className="card-premium p-7">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center font-medium">
                {c.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div>
                <div className="text-lg font-medium tracking-tight">{c.name}</div>
                <div className="text-xs text-white/50">{c.niche}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/60 leading-relaxed">{c.description}</p>
            <div className="mt-5 flex justify-between text-xs text-white/55">
              <span>{c.assetsCount} assets</span>
              <span>{(c.downloads/1000).toFixed(1)}k downloads</span>
              <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-white text-white" />{c.rating}</span>
            </div>
          </Link>
        ))}
      </section>
    </SiteLayout>
  );
}
