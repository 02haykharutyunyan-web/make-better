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
  "Draft": "bg-[#0E0E0E]/80 text-[#CFCFCF] border-white/10",
  "Pending Review": "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
  "Approved": "bg-white/10 text-white border-white/20",
  "Rejected": "bg-white/10 text-[#CFCFCF] border-white/20",
  "Published": "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
};

export default function AdminAssets() {
  const { store } = useStore();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [remoteAssets, setRemoteAssets] = useState<SubmittedAsset[]>([]);
  const [deliverables, setDeliverables] = useState<Record<string, Tables<"asset_deliverables">>>({});
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const loadAssets = async () => {
    setLoading(true);
    setErr("");
    setLoadFailed(false);
    try {
      const rows = await listAdminAssets();
      const mapped = rows.map(dbAssetToSubmittedAsset);
      setRemoteAssets(mapped);
      setCreatorNames(Object.fromEntries(rows.map(row => [row.slug, row.creators?.brand_name || ""])));
      const deliveryRows = await listAssetDeliverables(mapped.map(a => a.id));
      setDeliverables(Object.fromEntries(deliveryRows.map(d => [d.asset_id, d])));
    } catch (error) {
      setLoadFailed(true);
      setErr(explainSupabaseError(error, "Unable to load admin assets."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const assets = remoteAssets.length > 0 ? remoteAssets : loadFailed ? store.assets : [];
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
      setErr(explainSupabaseError(error, "Unable to delete asset."));
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
                const creator = store.creators.find(c => c.slug === a.creatorSlug);
                const creatorName = creatorNames[a.slug] || creator?.name || "—";
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
                      {a.status !== "Approved" && a.status !== "Published" && (
                        <button onClick={() => setStatus(a.id, { status: "Published", rejectionReason: undefined })} className="text-[#FFD600] hover:text-[#FFD600]">Approve</button>
                      )}
                      {a.status !== "Rejected" && (
                        <button onClick={() => reject(a.id)} className="text-[#CFCFCF] hover:text-[#CFCFCF]">Reject</button>
                      )}
                      {a.status !== "Published" ? (
                        <button onClick={() => setStatus(a.id, { status: "Published" })} className="text-white hover:text-white">Publish</button>
                      ) : (
                        <button onClick={() => setStatus(a.id, { status: "Approved" })} className="text-[#CFCFCF] hover:text-white">Unpublish</button>
                      )}
                      <button onClick={() => setStatus(a.id, { featured: !a.featured })} className="text-[#FFD600] hover:text-[#FFD600]">{a.featured ? "Unfeature" : "Feature"}</button>
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
    </AdminLayout>
  );
}
