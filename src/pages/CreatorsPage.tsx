import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import { Creator, creators } from "@/data/marketplace";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { listActiveCreators } from "@/services/creators";
import { dbCreatorToCreator } from "@/lib/asset-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function CreatorsPage() {
  const [remoteCreators, setRemoteCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const rows = await listActiveCreators();
        if (!cancelled) setRemoteCreators(rows.map(dbCreatorToCreator).filter(Boolean) as Creator[]);
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Using demo creators because Supabase creators could not be loaded."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visibleCreators = remoteCreators.length > 0 ? remoteCreators : creators;

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

      <section className="container-mb mt-10">
        {err && <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{err}</div>}
        {loading && <div className="mb-6 card-premium p-4 text-sm text-white/55">Loading creators...</div>}
        {!loading && visibleCreators.length === 0 && <div className="card-premium p-10 text-center text-white/55">No active creators yet.</div>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleCreators.map(c => (
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
        </div>
      </section>
    </SiteLayout>
  );
}
