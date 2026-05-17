import { Navigate, useParams, Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import AssetCard from "@/components/AssetCard";
import { assetsInCollection, blogPosts, getCollection } from "@/data/marketplace";

export default function CollectionPage() {
  const { slug } = useParams();
  const c = getCollection(slug || "");
  if (!c) return <Navigate to="/collections" replace />;
  const list = assetsInCollection(c.slug);
  const relatedPosts = blogPosts.slice(0, 3);

  return (
    <SiteLayout>
      <section className="container-mb pt-16 md:pt-24">
        <Link to="/collections" className="text-sm text-white/50 hover:text-white">← All collections</Link>
        <div className="eyebrow mt-6">Collection</div>
        <h1 className="mt-5 text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.04] max-w-4xl">{c.title}</h1>
        <p className="mt-5 max-w-2xl text-white/60 text-lg">{c.longDescription}</p>
      </section>

      <section className="container-mb mt-14">
        <h2 className="text-2xl font-medium tracking-tight">Curated assets</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(a => <AssetCard key={a.slug} asset={a} />)}
        </div>
      </section>

      <section className="container-mb mt-20 grid gap-6 md:grid-cols-2">
        <div className="card-premium p-8">
          <div className="eyebrow">Best for</div>
          <ul className="mt-4 space-y-2.5 text-white/80">
            {c.bestFor.map(b => <li key={b} className="flex gap-2"><span className="text-white/30">—</span>{b}</li>)}
          </ul>
        </div>
        <div className="card-premium p-8">
          <div className="eyebrow">Related product types</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {c.relatedTypes.map(t => (
              <Link key={t} to="/assets" className="chip hover:border-white/30 hover:text-white">{t}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-mb mt-20">
        <h2 className="text-2xl font-medium tracking-tight">Related reading</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {relatedPosts.map(p => (
            <Link key={p.slug} to={`/blog/${p.slug}`} className="card-premium p-6">
              <div className="text-xs uppercase tracking-[0.16em] text-white/40">{p.category}</div>
              <h3 className="mt-3 text-lg font-medium tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm text-white/55 line-clamp-2">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
