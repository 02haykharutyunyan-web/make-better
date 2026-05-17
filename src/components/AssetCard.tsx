import { Link } from "react-router-dom";
import { Asset, getCreator } from "@/data/marketplace";
import { Download, Star, ArrowUpRight } from "lucide-react";

export default function AssetCard({ asset }: { asset: Asset }) {
  const creator = getCreator(asset.creatorSlug);
  return (
    <Link
      to={`/asset/${asset.slug}`}
      className="card-premium group p-5 sm:p-6 flex min-w-0 flex-col"
    >
      <div className="flex items-start justify-between gap-3 text-xs">
        <span className="min-w-0 break-words text-[#94A3B8] uppercase tracking-[0.14em]">{asset.category}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
          asset.price === 0
            ? "border border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#67E8F9]"
            : "border border-[#F97316]/25 bg-[#F97316]/10 text-[#FDBA74]"
        }`}>
          {asset.price === 0 ? "Free" : `$${asset.price}`}
        </span>
      </div>

      <h3 className="mt-5 text-lg sm:text-xl font-medium tracking-tight leading-snug group-hover:text-white">
        {asset.title}
      </h3>
      <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed line-clamp-3">
        {asset.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {asset.tags.map(t => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>

      <div className="mt-6 flex items-start justify-between gap-3 border-t border-[#1E293B] pt-5 text-xs text-[#94A3B8] sm:items-center">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> {asset.downloads.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-white/80 text-white/80" /> {asset.rating}
          </span>
        </div>
        {creator && (
          <span className="text-right text-[#94A3B8]/75">by <span className="text-[#F8FAFC]/85">{creator.name}</span></span>
        )}
      </div>

      <div className="mt-5 inline-flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 group-hover:text-white">
          Open asset <ArrowUpRight className="h-4 w-4 text-[#F97316] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
