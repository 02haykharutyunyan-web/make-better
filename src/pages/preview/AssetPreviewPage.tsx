import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { deliveryLabel, getAssetDeliverable, getModerationAssetById } from "@/services/assets";
import type { Tables } from "@/types/database";

type AssetRow = Tables<"assets"> & { creators?: Pick<Tables<"creators">, "id" | "slug" | "brand_name"> | null };

export default function AssetPreviewPage() {
  const { id } = useParams();
  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [delivery, setDelivery] = useState<Tables<"asset_deliverables"> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    document.title = "Preview — not public";
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement("meta"); meta.name = "robots"; document.head.appendChild(meta); }
    meta.content = "noindex,nofollow";
    let cancelled = false;
    getModerationAssetById(id || "").then(async row => { if (!cancelled) setAsset(row as AssetRow | null); if (row) { const d = await getAssetDeliverable(row.id); if (!cancelled) setDelivery(d); } }).catch(() => { if (!cancelled) setAsset(null); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);
  return <SiteLayout><section className="container-mb max-w-4xl pt-12 sm:pt-16 pb-20 sm:pb-24">
    <div className="rounded-2xl border border-[#FFD600]/30 bg-[#FFD600]/10 p-4 text-sm font-medium text-[#FFD600]">PREVIEW — NOT PUBLIC</div>
    {loading && <p className="mt-8 text-[#CFCFCF]">Loading preview...</p>}
    {!loading && !asset && <div className="mt-8 card-premium p-6"><h1 className="text-2xl font-medium">Preview unavailable</h1><p className="mt-2 text-[#CFCFCF]">You do not have access to this unpublished asset, or it no longer exists.</p></div>}
    {asset && <article className="mt-8 card-premium p-5 sm:p-8">
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-[#CFCFCF]/70"><span>Status: {asset.status}</span><span>Creator: {asset.creators?.brand_name || "—"}</span><span>{asset.product_type}</span><span>{asset.is_free ? "Free" : `$${asset.price}`}</span></div>
      <h1 className="mt-4 text-3xl sm:text-5xl font-medium tracking-normal">{asset.title}</h1>
      {asset.short_description && <p className="mt-4 text-lg text-[#CFCFCF]">{asset.short_description}</p>}
      <dl className="mt-6 grid gap-3 text-sm text-[#CFCFCF] sm:grid-cols-3"><Meta label="Submitted" value={asset.submitted_at} /><Meta label="Published" value={asset.published_at} /><Meta label="Reviewed" value={asset.reviewed_at} /><Meta label="Slug" value={asset.slug} /><Meta label="Delivery" value={deliveryLabel(delivery?.delivery_type)} /><Meta label="File" value={delivery?.file_name || delivery?.external_url || (delivery?.text_content ? "Text content attached" : "—")} /></dl>
      {asset.rejection_reason && <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#CFCFCF]"><strong className="text-white">Rejection reason:</strong> {asset.rejection_reason}</div>}
      <Section title="Full description" body={asset.long_description} />
      <List title="Use cases" items={asset.use_cases} /><List title="Included" items={asset.included} /><List title="Before" items={asset.before} /><List title="After" items={asset.after} />
      {delivery?.text_content && <Section title="Private text delivery" body={delivery.text_content} />}
      {asset.status === "published" && <Link to={`/asset/${asset.slug}`} className="mt-8 inline-flex rounded-full btn-primary px-5 py-3 text-sm">Open public asset</Link>}
    </article>}
  </section></SiteLayout>;
}
function Meta({ label, value }: { label: string; value?: string | null }) { return <div><dt className="text-white/50">{label}</dt><dd className="break-words">{value ? (value.includes("T") ? new Date(value).toLocaleString() : value) : "—"}</dd></div>; }
function Section({ title, body }: { title: string; body?: string | null }) { return <section className="mt-8"><h2 className="text-xl font-medium">{title}</h2><p className="mt-3 whitespace-pre-wrap text-[#CFCFCF]">{body || "—"}</p></section>; }
function List({ title, items }: { title: string; items?: string[] | null }) { return <section className="mt-8"><h2 className="text-xl font-medium">{title}</h2><ul className="mt-3 list-disc space-y-1 pl-5 text-[#CFCFCF]">{(items?.length ? items : ["—"]).map(item => <li key={item}>{item}</li>)}</ul></section>; }
