import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import type { Collection } from "@/data/marketplace";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { listPublishedCollections } from "@/services/content";
import { dbCollectionToCollection } from "@/lib/content-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { SectionVisual } from "@/components/visuals/MarketplaceVisuals";

export default function CollectionsPage() {
  const [remoteCollections, setRemoteCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const rows = await listPublishedCollections();
        if (!cancelled) setRemoteCollections(rows.map(dbCollectionToCollection));
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load published collections."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visibleCollections = remoteCollections;

  return (
    <SiteLayout>
      <section className="container-mb section-rich pt-12 sm:pt-16 md:pt-24">
        <SectionVisual variant="mesh" />
        <div className="eyebrow">Collections</div>
        <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-normal leading-[1.06] max-w-4xl">
          Start with what you want to achieve.
        </h1>
        <p className="mt-4 sm:mt-5 max-w-2xl text-[#CFCFCF] text-base sm:text-lg leading-relaxed">
          Curated lists built around real goals â€” not random filters. Open the one closest to your work.
        </p>
      </section>

      <section className="container-mb section-rich mt-10">
        <SectionVisual variant="lines" />
        {err && <div className="mb-6 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
        {loading && <div className="mb-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading collections...</div>}
        {!loading && visibleCollections.length === 0 && <div className="card-premium p-8 sm:p-10 text-center text-[#CFCFCF]">No published collections yet.</div>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleCollections.map(c => (
            <Link key={c.slug} to={`/collections/${c.slug}`} className="card-premium p-5 sm:p-8 group">
              <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">Goal</div>
              <h3 className="mt-3 text-xl sm:text-2xl font-medium tracking-normal">{c.title}</h3>
              <p className="mt-3 text-[#CFCFCF]">{c.description}</p>
              <div className="mt-5 inline-flex items-center text-sm text-white/80 group-hover:text-white">
                Open collection <ArrowUpRight className="ml-1 h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
