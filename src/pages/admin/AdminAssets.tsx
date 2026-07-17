import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { AssetStatus, SubmittedAsset } from "@/store/store";
import type { ProductType } from "@/data/marketplace";
import { Link } from "react-router-dom";
import { dbAssetToSubmittedAsset } from "@/lib/asset-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import {
  deleteAsset as deleteAssetFromSupabase,
  deliveryLabel,
  listAdminAssets,
  listAssetDeliverables,
  updateAsset as updateAssetInSupabase,
  reviewAsset,
  setAssetFeatured,
} from "@/services/assets";
import type { Tables, Updates } from "@/types/database";

const filters: (AssetStatus | "All")[] = ["All", "Pending Review", "Approved", "Rejected", "Published", "Draft"];
const productTypes: ProductType[] = ["Prompts", "AI Agents", "AI Assistants", "API Tools", "Workflows", "Templates", "Automation Assets", "Creator Resources"];

const statusStyles: Record<string, string> = {
  "Draft": "bg-[#0E0E0E]/80 text-[#CFCFCF] border-white/10",
  "Pending Review": "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
  "Approved": "bg-white/10 text-white border-white/20",
  "Rejected": "bg-white/10 text-[#CFCFCF] border-white/20",
  "Published": "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
};

export default function AdminAssets() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [remoteAssets, setRemoteAssets] = useState<SubmittedAsset[]>([]);
  const [deliverables, setDeliverables] = useState<Record<string, Tables<"asset_deliverables">>>({});
  const [assetRows, setAssetRows] = useState<Record<string, Tables<"assets">>>({});
  const [editing, setEditing] = useState<Tables<"assets"> | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewIntent, setReviewIntent] = useState<{ id: string; status: "published" | "rejected" | "draft" } | null>(null);
  const [reason, setReason] = useState("");

  const loadAssets = async () => {
    setLoading(true);
    setErr("");
    try {
      const rows = await listAdminAssets();
      const mapped = rows.map(dbAssetToSubmittedAsset);
      setRemoteAssets(mapped);
      setAssetRows(Object.fromEntries(rows.map(row => [row.id, row])));
      setCreatorNames(Object.fromEntries(rows.map(row => [row.slug, row.creators?.brand_name || ""])));
      const deliveryRows = await listAssetDeliverables(mapped.map(a => a.id));
      setDeliverables(Object.fromEntries(deliveryRows.map(d => [d.asset_id, d])));
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to load admin assets."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const list = filter === "All" ? remoteAssets : remoteAssets.filter(a => a.status === filter);

  const openReview = (id: string, status: "published" | "rejected" | "draft") => {
    if (processingId) return;
    setReason("");
    setReviewIntent({ id, status });
  };

  const confirmReview = async () => {
    if (!reviewIntent || processingId) return;
    if (reviewIntent.status === "rejected" && !reason.trim()) { setErr("Enter a meaningful rejection reason before rejecting."); return; }
    setProcessingId(reviewIntent.id); setErr("");
    try {
      const row = await reviewAsset(reviewIntent.id, reviewIntent.status, reason.trim());
      const mapped = dbAssetToSubmittedAsset(row);
      setRemoteAssets(prev => prev.map(asset => asset.id === mapped.id ? mapped : asset));
      setAssetRows(prev => ({ ...prev, [row.id]: row }));
      setReviewIntent(null);
      void loadAssets();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to review asset."));
    } finally {
      setProcessingId(null);
    }
  };

  const setStatus = async (id: string, patch: Partial<SubmittedAsset>) => {
    setErr("");
    try {
      if ("featured" in patch) {
        const row = await setAssetFeatured(id, Boolean(patch.featured));
        const mapped = dbAssetToSubmittedAsset(row);
        setRemoteAssets(prev => prev.map(asset => asset.id === mapped.id ? mapped : asset));
        setAssetRows(prev => ({ ...prev, [row.id]: row }));
        void loadAssets();
      }
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to review asset."));
    }
  };

  const remove = async (id: string) => {
    setErr("");
    try {
      await deleteAssetFromSupabase(id);
      setRemoteAssets(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to delete asset."));
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setErr("");
    setSavingEdit(true);
    try {
      await updateAssetInSupabase(editing.id, {
        title: editing.title,
        product_type: editing.product_type,
        category: editing.category,
        short_description: editing.short_description,
        long_description: editing.long_description,
        tags: editing.tags,
        price: editing.price,
        is_free: editing.price_type === "free",
        price_type: editing.price_type,
        use_cases: editing.use_cases,
        included: editing.included,
        before: editing.before,
        after: editing.after,
      });
      setEditing(null);
      await loadAssets();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to save asset content."));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <AdminLayout eyebrow="Assets" title="All assets">
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`min-h-10 shrink-0 rounded-full px-3 py-1.5 text-xs border transition ${filter === f ? "bg-[#FFD600] text-[#050505] border-[#FFD600]" : "border-white/10 text-white/65 hover:text-white hover:bg-[#FFD600]/10"}`}>
            {f}
          </button>
        ))}
      </div>
      {err && <div className="mb-4 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
      {loading && <div className="mb-4 card-premium p-4 text-sm text-[#CFCFCF]">Loading assets...</div>}

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-[#CFCFCF]/80">
              <tr>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Creator</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Delivery</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Submitted</th>
                <th className="px-5 py-4">DL / ★</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(a => {
                const creatorName = creatorNames[a.slug] || a.creatorSlug || "—";
                return (
                  <tr key={a.id} className="border-t border-white/5 align-top">
                    <td className="px-5 py-4 text-white max-w-[260px]">
                      <div className="font-medium">{a.title}</div>
                      {a.featured && <span className="mt-1 inline-block text-[10px] uppercase tracking-wider text-[#FFD600]">Featured</span>}
                      {a.rejectionReason && <div className="mt-1 text-xs text-[#CFCFCF]/80">Reason: {a.rejectionReason}</div>}
                    </td>
                    <td className="px-5 py-4 text-white/65">{creatorName}</td>
                    <td className="px-5 py-4 text-white/65">{a.productType}</td>
                    <td className="px-5 py-4 text-white/65">{a.isFree ? "Free" : `$${a.price}`}</td>
                    <td className="px-5 py-4 text-white/65">
                      <div>{deliveryLabel(deliverables[a.id]?.delivery_type)}</div>
                      {deliverables[a.id]?.file_name && <div className="text-[11px] text-[#CFCFCF]/70 max-w-[160px] truncate">{deliverables[a.id].file_name}</div>}
                      {deliverables[a.id]?.external_url && <div className="text-[11px] text-[#CFCFCF]/70 max-w-[160px] truncate">{deliverables[a.id].external_url}</div>}
                    </td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[a.status]}`}>{a.status}</span></td>
                    <td className="px-5 py-4 text-[#CFCFCF] text-xs">{new Date(a.submittedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-white/65 text-xs">{a.downloads}/{a.rating}</td>
                    <td className="px-5 py-4 text-right text-xs space-x-2 whitespace-nowrap">
                      <Link to={`/asset/${a.slug}`} className="text-[#CFCFCF] hover:text-white">View</Link>
                      <button onClick={() => setEditing(assetRows[a.id])} className="text-[#CFCFCF] hover:text-white">Edit</button>
                      {a.status === "Pending Review" && <button disabled={processingId === a.id} onClick={() => openReview(a.id, "published")} className="text-[#FFD600] hover:text-[#FFD600] disabled:opacity-50">Publish</button>}
                      {a.status === "Pending Review" && <button disabled={processingId === a.id} onClick={() => openReview(a.id, "rejected")} className="text-[#CFCFCF] hover:text-[#CFCFCF] disabled:opacity-50">Reject</button>}
                      {a.status === "Pending Review" && <button disabled={processingId === a.id} onClick={() => openReview(a.id, "draft")} className="text-[#CFCFCF] hover:text-white disabled:opacity-50">Return to draft</button>}
                      {a.status === "Published" && <button disabled={processingId === a.id} onClick={() => openReview(a.id, "draft")} className="text-[#CFCFCF] hover:text-white disabled:opacity-50">Unpublish</button>}
                      {a.status === "Published" && <button onClick={() => setStatus(a.id, { featured: !a.featured })} className="text-[#FFD600] hover:text-[#FFD600]">{a.featured ? "Unfeature" : "Feature"}</button>}
                      <button onClick={() => remove(a.id)} className="text-[#CFCFCF] hover:text-[#CFCFCF]">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[#CFCFCF]">No assets found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewIntent && (
        <ReviewModal
          title={reviewIntent.status === "published" ? "Publish asset" : reviewIntent.status === "draft" ? "Return asset to draft" : "Reject asset"}
          description={reviewIntent.status === "rejected" ? "The reason will be visible to the creator." : reviewIntent.status === "draft" ? "The asset will leave public results and become creator-editable." : "The asset will become public after the database transition succeeds."}
          requireReason={reviewIntent.status === "rejected"}
          reason={reason}
          onReason={setReason}
          loading={processingId === reviewIntent.id}
          onCancel={() => setReviewIntent(null)}
          onConfirm={confirmReview}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditing(null)} />
          <form onSubmit={saveEdit} className="relative w-full max-w-3xl glass-modal p-5 sm:p-7 space-y-4 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-medium tracking-normal">Edit asset content</h3>
            <Field label="Title" value={editing.title} onChange={v => setEditing({ ...editing, title: v })} required />
            <label className="block">
              <span className="text-xs text-[#CFCFCF]">Product type</span>
              <select value={editing.product_type} onChange={e => setEditing({ ...editing, product_type: e.target.value, category: e.target.value })} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm">
                {productTypes.map(type => <option key={type} className="bg-black">{type}</option>)}
              </select>
            </label>
            <Textarea label="Short description" rows={2} value={editing.short_description || ""} onChange={v => setEditing({ ...editing, short_description: v })} />
            <Textarea label="Full description" rows={5} value={editing.long_description || ""} onChange={v => setEditing({ ...editing, long_description: v })} />
            <Field label="Tags (comma separated)" value={(editing.tags || []).join(", ")} onChange={v => setEditing({ ...editing, tags: splitCsv(v) })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-[#CFCFCF]">Price type</span>
                <select value={editing.price_type} onChange={e => setEditing({ ...editing, price_type: e.target.value as Tables<"assets">["price_type"], price: e.target.value === "free" ? 0 : editing.price, is_free: e.target.value === "free" })} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm">
                  <option className="bg-black" value="free">Free</option>
                  <option className="bg-black" value="paid">Paid</option>
                </select>
              </label>
              {editing.price_type === "paid" && <Field label="Price (USD)" type="number" value={String(editing.price)} onChange={v => setEditing({ ...editing, price: Number(v) || 0 })} />}
            </div>
            <Textarea label="Use cases (one per line)" rows={3} value={(editing.use_cases || []).join("\n")} onChange={v => setEditing({ ...editing, use_cases: splitLines(v) })} />
            <Textarea label="What's included (one per line)" rows={3} value={(editing.included || []).join("\n")} onChange={v => setEditing({ ...editing, included: splitLines(v) })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Textarea label="Before (one per line)" rows={3} value={(editing.before || []).join("\n")} onChange={v => setEditing({ ...editing, before: splitLines(v) })} />
              <Textarea label="After (one per line)" rows={3} value={(editing.after || []).join("\n")} onChange={v => setEditing({ ...editing, after: splitLines(v) })} />
            </div>
            <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
              <button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-sm">Cancel</button>
              <button disabled={savingEdit} className="min-h-11 rounded-full btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50">{savingEdit ? "Saving..." : "Save content"}</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

function splitCsv(value: string) {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function splitLines(value: string) {
  return value.split("\n").map(item => item.trim()).filter(Boolean);
}

type TextInputProps = { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string };
type TextareaInputProps = Omit<TextInputProps, "type"> & { rows?: number };

function Field({ label, value, onChange, required, type = "text" }: TextInputProps) {
  return <label className="block"><span className="text-xs text-[#CFCFCF]">{label}{required && <span className="text-white/30"> *</span>}</span><input required={required} type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70" /></label>;
}

function Textarea({ label, value, onChange, rows = 3 }: TextareaInputProps) {
  return <label className="block"><span className="text-xs text-[#CFCFCF]">{label}</span><textarea value={value} rows={rows} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70" /></label>;
}

function ReviewModal({ title, description, requireReason, reason, onReason, loading, onCancel, onConfirm }: { title: string; description: string; requireReason: boolean; reason: string; onReason: (value: string) => void; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center sm:p-4"><div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={loading ? undefined : onCancel} /><div className="relative w-full max-w-lg glass-modal p-5 sm:p-7"><h3 className="text-xl font-medium">{title}</h3><p className="mt-2 text-sm text-[#CFCFCF]">{description}</p>{requireReason && <label className="mt-4 block"><span className="text-xs text-[#CFCFCF]">Rejection reason</span><textarea autoFocus rows={4} value={reason} onChange={e => onReason(e.target.value)} disabled={loading} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm disabled:opacity-60" /></label>}<div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row"><button type="button" disabled={loading} onClick={onCancel} className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-sm disabled:opacity-50">Cancel</button><button type="button" disabled={loading || (requireReason && !reason.trim())} onClick={onConfirm} className="min-h-11 rounded-full btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50">{loading ? "Saving..." : "Confirm"}</button></div></div></div>;
}
