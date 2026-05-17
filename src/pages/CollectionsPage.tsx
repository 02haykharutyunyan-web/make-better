import SiteLayout from "@/components/layout/SiteLayout";
import { collections } from "@/data/marketplace";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function CollectionsPage() {
  return (
    <SiteLayout>
      <section className="container-mb pt-16 md:pt-24">
        <div className="eyebrow">Collections</div>
        <h1 className="mt-5 text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.04] max-w-4xl">
          Start with what you want to achieve.
        </h1>
        <p className="mt-5 max-w-2xl text-white/60 text-lg">
          Curated lists built around real goals — not random filters. Open the one closest to your work.
        </p>
      </section>

      <section className="container-mb mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {collections.map(c => (
          <Link key={c.slug} to={`/collections/${c.slug}`} className="card-premium p-8 group">
            <div className="text-xs uppercase tracking-[0.16em] text-white/40">Goal</div>
            <h3 className="mt-3 text-2xl font-medium tracking-tight">{c.title}</h3>
            <p className="mt-3 text-white/60">{c.description}</p>
            <div className="mt-5 inline-flex items-center text-sm text-white/80 group-hover:text-white">
              Open collection <ArrowUpRight className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </section>
    </SiteLayout>
  );
}
