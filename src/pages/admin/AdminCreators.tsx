import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { AdminCreatorRow, listAdminCreators } from "@/services/admin";
import { reviewCreatorApplication, setCreatorFeatured } from "@/services/creators";
import type { CreatorStatus } from "@/types/database";
import { Star } from "lucide-react";

const filters: Array<CreatorStatus | "all"> = ["pending", "approved", "rejected", "all"];

export default function AdminCreators() {
  const [creators, setCreators] = useState<AdminCreatorRow[]>([]);
  const [filter, setFilter] = useState<CreatorStatus | "all">("pending");
  const [selected, setSelected] = useState<AdminCreatorRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const loadCreators = async () => {
    setLoading(true); setErr("");
    try { setCreators(await listAdminCreators()); }
    catch (error) { setErr(explainSupabaseError(error, "Unable to load creators.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCreators(); }, []);

  const visibleCreators = useMemo(() => filter === "all" ? creators : creators.filter(c => c.application_status === filter), [creators, filter]);

  const review = async (creator: AdminCreatorRow, status: "approved" | "rejected") => {
    setErr(""); setSuccess("");
    if (status === "rejected" && !rejectionReason.trim()) { setErr("Enter a rejection reason before rejecting this application."); return; }
    const message = status === "approved" ? `Approve ${creator.brand_name}?` : `Reject ${creator.brand_name}? The reason will be visible to the applicant.`;
    if (!window.confirm(message)) return;
    setSavingId(creator.id);
    try {
      const updated = await reviewCreatorApplication(creator.id, status, rejectionReason);
      setCreators(prev => prev.map(c => c.id === creator.id ? { ...c, ...updated } : c));
      setSelected(prev => prev?.id === creator.id ? { ...prev, ...updated } : prev);
      setRejectionReason("");
      setSuccess(`${creator.brand_name} is now ${status}.`);
    } catch (error) { setErr(explainSupabaseError(error, "Unable to update creator application.")); }
    finally { setSavingId(""); }
  };

  const toggleFeatured = async (creator: AdminCreatorRow) => {
    setErr(""); setSuccess("");
    if (!window.confirm(`${creator.featured ? "Remove" : "Add"} featured status for ${creator.brand_name}?`)) return;
    setSavingId(creator.id);
    try {
      const updated = await setCreatorFeatured(creator.id, !creator.featured);
      setCreators(prev => prev.map(c => c.id === creator.id ? { ...c, featured: updated.featured } : c));
      setSuccess("Creator featured status updated.");
    } catch (error) { setErr(explainSupabaseError(error, "Unable to update creator feature status.")); }
    finally { setSavingId(""); }
  };

  return (
    <AdminLayout eyebrow="Creators" title="Creator applications">
      {err && <div className="mb-6 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
      {success && <div className="mb-6 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#FFD600]">{success}</div>}
      {loading && <div className="mb-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading creator applications...</div>}

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map(next => <button key={next} onClick={() => setFilter(next)} className={`min-h-11 rounded-full border px-4 text-sm capitalize ${filter === next ? "border-[#FFD600]/40 bg-[#FFD600]/10 text-[#FFD600]" : "border-white/10 text-[#CFCFCF]"}`}>{next}</button>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3">
          {!loading && visibleCreators.length === 0 && <div className="card-premium p-8 text-center text-[#CFCFCF]">No {filter === "all" ? "" : filter} creator applications found.</div>}
          {visibleCreators.map(c => (
            <article key={c.id} className="card-premium p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <button onClick={() => { setSelected(c); setRejectionReason(""); }} className="min-h-12 min-w-0 text-left">
                  <div className="font-medium text-white break-words">{c.brand_name} {c.featured && <Star className="inline h-3.5 w-3.5 fill-[#FFD600] text-[#FFD600]" />}</div>
                  <div className="mt-1 text-sm text-[#CFCFCF] break-words">{c.applicantName} • {c.email || "No email"}</div>
                  <div className="mt-1 text-xs text-[#CFCFCF]/70">Submitted {new Date(c.application_submitted_at || c.created_at).toLocaleDateString()} • {c.assetCount} assets • {c.totalDownloads.toLocaleString()} downloads</div>
                </button>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <span className="inline-flex min-h-9 items-center rounded-full border border-white/10 px-3 text-xs capitalize text-[#CFCFCF]">{c.application_status}</span>
                  {c.application_status === "pending" && <>
                    <button disabled={savingId === c.id} onClick={() => review(c, "approved")} className="min-h-11 rounded-full btn-primary px-4 text-sm disabled:opacity-50">Approve</button>
                    <button disabled={savingId === c.id} onClick={() => { setSelected(c); setRejectionReason(""); }} className="min-h-11 rounded-full border border-white/10 px-4 text-sm text-white disabled:opacity-50">Review rejection</button>
                  </>}
                </div>
              </div>
            </article>
          ))}
        </div>
        <aside className="card-premium p-5 lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-xl font-medium">Application details</h2>
          {!selected ? <p className="mt-3 text-sm text-[#CFCFCF]">Select an application to review details and enter a rejection reason.</p> : <div className="mt-4 space-y-3 text-sm text-[#CFCFCF]">
            <p><span className="text-white">Brand:</span> {selected.brand_name}</p>
            <p><span className="text-white">Applicant:</span> {selected.applicantName}</p>
            <p><span className="text-white">Email:</span> {selected.email || "-"}</p>
            <p><span className="text-white">Status:</span> {selected.application_status}</p>
            <p><span className="text-white">Bio:</span> {selected.description || "-"}</p>
            {selected.application_rejection_reason && <p><span className="text-white">Current rejection reason:</span> {selected.application_rejection_reason}</p>}
            <Link to={`/creator/${selected.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-white/10 px-4 text-white">Open public page</Link>
            <label className="block pt-2"><span className="text-xs text-[#CFCFCF]">Required rejection reason</span><textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={4} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70" /></label>
            <div className="flex flex-wrap gap-2">
              {selected.application_status === "pending" && <>
                <button disabled={savingId === selected.id} onClick={() => review(selected, "approved")} className="min-h-11 rounded-full btn-primary px-4 text-sm disabled:opacity-50">Approve</button>
                <button disabled={savingId === selected.id || !rejectionReason.trim()} onClick={() => review(selected, "rejected")} className="min-h-11 rounded-full border border-white/10 px-4 text-sm text-white disabled:opacity-50">Reject with reason</button>
              </>}
              <button disabled={savingId === selected.id} onClick={() => toggleFeatured(selected)} className="min-h-11 rounded-full border border-white/10 px-4 text-sm text-white disabled:opacity-50">{selected.featured ? "Unfeature" : "Feature"}</button>
            </div>
          </div>}
        </aside>
      </div>
    </AdminLayout>
  );
}
