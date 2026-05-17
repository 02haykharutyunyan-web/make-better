import { Link } from "react-router-dom";
import { Asset, getCreator } from "@/data/marketplace";
import { Download, Star, ArrowUpRight } from "lucide-react";

export default function AssetCard({ asset }: { asset: Asset }) {
  const creator = getCreator(asset.creatorSlug);
  return (
    <Link
      to={`/asset/${asset.slug}`}
      className="card-premium group p-6 flex flex-col"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50 uppercase tracking-[0.14em]">{asset.category}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
          asset.price === 0
            ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
            : "bg-white/[0.06] text-white border border-white/10"
        }`}>
          {asset.price === 0 ? "Free" : `$${asset.price}`}
        </span>
      </div>

      <h3 className="mt-5 text-xl font-medium tracking-tight leading-snug group-hover:text-white">
        {asset.title}
      </h3>
      <p className="mt-2 text-sm text-white/55 leading-relaxed line-clamp-3">
        {asset.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {asset.tags.map(t => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>

      <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-white/55">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> {asset.downloads.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-white/80 text-white/80" /> {asset.rating}
          </span>
        </div>
        {creator && (
          <span className="text-white/45">by <span className="text-white/70">{creator.name}</span></span>
        )}
      </div>

      <div className="mt-5 inline-flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 group-hover:text-white">
          Open asset <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
