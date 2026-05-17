import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { AssetStatus, SubmittedAsset, useStore } from "@/store/store";
import { Link } from "react-router-dom";
import { dbAssetToSubmittedAsset } from "@/lib/asset-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import {
  deleteAsset as deleteAssetFromSupabase,
  deliveryLabel,
  listAdminAssets,
  listAssetDeliverables,
  updateAsset as updateAssetInSupabase,
} from "@/services/assets";
import type { Tables } from "@/types/database";

const filters: (AssetStatus | "All")[] = ["All", "Pending Review", "Approved", "Rejected", "Published", "Draft"];

const statusStyles: Record<string, string> = {
  "Draft": "bg-[#111827]/80 text-[#94A3B8] border-[#1E293B]",
  "Pending Review": "bg-amber-400/10 text-amber-300 border-amber-400/20",
  "Approved": "bg-blue-400/10 text-blue-300 border-blue-400/20",
  "Rejected": "bg-red-400/10 text-red-300 border-red-400/20",
  "Published": "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
};

export default function AdminAssets() {
  const { store, updateAsset, deleteAsset } = useStore();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [remoteAssets, setRemoteAssets] = useState<SubmittedAsset[]>([]);
  const [deliverables, setDeliverables] = useState<Record<string, Tables<"asset_deliverables">>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadAssets = async () => {
    setLoading(true);
    setErr("");
    try {
      const rows = await listAdminAssets();
      const mapped = rows.map(dbAssetToSubmittedAsset);
      setRemoteAssets(mapped);
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

  const assets = remoteAssets.length > 0 ? remoteAssets : store.assets;
  const list = filter === "All" ? assets : assets.filter(a => a.status === filter);

  const setStatus = async (id: string, patch: Partial<SubmittedAsset>) => {
    const dbPatch: any = {};
    if (patch.status === "Published") {
      dbPatch.status = "published";
      dbPatch.published_at = new Date().toISOString();
      dbPatch.rejection_reason = null;
    }
    if (patch.status === "Approved") dbPatch.status = "approved";
    if (patch.status === "Rejected") dbPatch.status = "rejected";
    if (patch.status === "Draft") dbPatch.status = "draft";
    if (patch.status === "Pending Review") dbPatch.status = "pending_review";
    if ("rejectionReason" in patch) dbPatch.rejection_reason = patch.rejectionReason || null;
    if ("featured" in patch) dbPatch.featured = patch.featured;

    setErr("");
    try {
      await updateAssetInSupabase(id, dbPatch);
      await loadAssets();
    } catch (error) {
      updateAsset(id, patch);
      setErr(explainSupabaseError(error, "Unable to update asset status."));
    }
  };

  const reject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (reason) await setStatus(id, { status: "Rejected", rejectionReason: reason });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    setErr("");
    try {
      await deleteAssetFromSupabase(id);
      setRemoteAssets(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      deleteAsset(id);
      setErr(explainSupabaseError(error, "Unable to delete asset."));
    }
  };

  return (
    <AdminLayout eyebrow="Assets" title="All assets">
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`min-h-10 shrink-0 rounded-full px-3 py-1.5 text-xs border transition ${filter === f ? "bg-[#F97316] text-white border-[#F97316]" : "border-[#1E293B] text-white/65 hover:text-white hover:bg-[#F97316]/10"}`}>
            {f}
          </button>
        ))}
      </div>
      {err && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{err}</div>}
      {loading && <div className="mb-4 card-premium p-4 text-sm text-[#94A3B8]">Loading assets...</div>}

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-[#94A3B8]/80">
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
                const creator = store.creators.find(c => c.slug === a.creatorSlug);
                return (
                  <tr key={a.id} className="border-t border-white/5 align-top">
                    <td className="px-5 py-4 text-white max-w-[260px]">
                      <div className="font-medium">{a.title}</div>
                      {a.featured && <span className="mt-1 inline-block text-[10px] uppercase tracking-wider text-amber-300">Featured</span>}
                      {a.rejectionReason && <div className="mt-1 text-xs text-red-300/80">Reason: {a.rejectionReason}</div>}
                    </td>
                    <td className="px-5 py-4 text-white/65">{creator?.name || "—"}</td>
                    <td className="px-5 py-4 text-white/65">{a.productType}</td>
                    <td className="px-5 py-4 text-white/65">{a.isFree ? "Free" : `$${a.price}`}</td>
                    <td className="px-5 py-4 text-white/65">
                      <div>{deliveryLabel(deliverables[a.id]?.delivery_type)}</div>
                      {deliverables[a.id]?.file_name && <div className="text-[11px] text-[#94A3B8]/70 max-w-[160px] truncate">{deliverables[a.id].file_name}</div>}
                      {deliverables[a.id]?.external_url && <div className="text-[11px] text-[#94A3B8]/70 max-w-[160px] truncate">{deliverables[a.id].external_url}</div>}
                    </td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[a.status]}`}>{a.status}</span></td>
                    <td className="px-5 py-4 text-[#94A3B8] text-xs">{new Date(a.submittedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-white/65 text-xs">{a.downloads}/{a.rating}</td>
                    <td className="px-5 py-4 text-right text-xs space-x-2 whitespace-nowrap">
                      <Link to={`/asset/${a.slug}`} className="text-[#94A3B8] hover:text-white">View</Link>
                      {a.status !== "Approved" && a.status !== "Published" && (
                        <button onClick={() => setStatus(a.id, { status: "Published", rejectionReason: undefined })} className="text-emerald-300 hover:text-emerald-200">Approve</button>
                      )}
                      {a.status !== "Rejected" && (
                        <button onClick={() => reject(a.id)} className="text-red-300 hover:text-red-200">Reject</button>
                      )}
                      {a.status !== "Published" ? (
                        <button onClick={() => setStatus(a.id, { status: "Published" })} className="text-white hover:text-white">Publish</button>
                      ) : (
                        <button onClick={() => setStatus(a.id, { status: "Approved" })} className="text-[#94A3B8] hover:text-white">Unpublish</button>
                      )}
                      <button onClick={() => setStatus(a.id, { featured: !a.featured })} className="text-amber-300 hover:text-amber-200">{a.featured ? "Unfeature" : "Feature"}</button>
                      <button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
