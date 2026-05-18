import { Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { SubmittedAsset, useStore } from "@/store/store";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { dbAssetToSubmittedAsset } from "@/lib/asset-mappers";
import { getCreatorByProfileId } from "@/services/creators";
import { countAccessRequestsForAssets, listCreatorAssets } from "@/services/assets";

const statusStyles: Record<string, string> = {
  "Draft": "bg-[#0E0E0E]/80 text-[#CFCFCF] border-white/10",
  "Pending Review": "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
  "Approved": "bg-white/10 text-white border-white/20",
  "Rejected": "bg-white/10 text-[#CFCFCF] border-white/20",
  "Published": "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
};

export default function CreatorDashboard() {
  const { user, store } = useStore();
  const [remoteAssets, setRemoteAssets] = useState<SubmittedAsset[]>([]);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      setErr("");
      setLoadFailed(false);
      try {
        const creator = await getCreatorByProfileId(user.id);
        if (!creator) {
          if (!cancelled) setRemoteAssets([]);
          return;
        }
        const rows = await listCreatorAssets(creator.id);
        const mapped = rows.map(dbAssetToSubmittedAsset);
        const counts = await countAccessRequestsForAssets(mapped.map(a => a.id));
        if (!cancelled) {
          setRemoteAssets(mapped);
          setRequestCounts(counts);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadFailed(true);
          setErr(explainSupabaseError(error, "Unable to load your submissions."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const fallbackMine = store.assets.filter(a => a.creatorSlug === user?.creatorSlug);
  const mine = remoteAssets.length > 0 ? remoteAssets : loadFailed ? fallbackMine : [];
  const totalDownloads = mine.reduce((s, a) => s + a.downloads, 0);
  const stats = [
    { label: "Total assets", v: mine.length },
    { label: "Pending", v: mine.filter(a => a.status === "Pending Review").length },
    { label: "Published", v: mine.filter(a => a.status === "Published").length },
    { label: "Downloads", v: totalDownloads.toLocaleString() },
  ];

  return (
    <SiteLayout>
      <section className="container-mb pt-12 sm:pt-16 pb-20 sm:pb-24">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <div className="eyebrow">Creator dashboard</div>
            <h1 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-medium tracking-normal">Hey {user?.name.split(" ")[0]}.</h1>
            <p className="mt-3 text-[#CFCFCF]">Brand: <span className="text-white">{user?.creatorSlug}</span></p>
          </div>
          <Link to="/creator-dashboard/submit-asset" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full btn-primary px-5 py-3 text-sm font-medium transition sm:w-auto">
            <Plus className="h-4 w-4" /> Submit new asset
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="card-premium p-5 sm:p-6">
              <div className="text-2xl sm:text-3xl font-medium">{s.v}</div>
              <div className="mt-2 text-xs uppercase tracking-wider text-[#CFCFCF]/80">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 card-premium p-5 sm:p-6">
          <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">Payouts</div>
          <div className="mt-2 text-white/80">Stripe payouts will be available soon. We'll email you when payout setup opens.</div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-medium tracking-normal">Your submissions</h2>
          {err && <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
          {loading && <div className="mt-6 card-premium p-6 text-[#CFCFCF]">Loading submissions...</div>}
          {!loading && mine.length === 0 ? (
            <div className="mt-6 card-premium p-8 sm:p-10 text-center text-[#CFCFCF]">No assets yet. Submit your first one.</div>
          ) : !loading && (
            <div className="mt-6 grid gap-3">
              {mine.map(a => (
                <div key={a.id} className="card-premium p-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#CFCFCF]/70">{a.productType} • {a.isFree ? "Free" : `$${a.price}`}</div>
                    <h3 className="mt-1 text-lg font-medium tracking-normal">{a.title}</h3>
                    {a.status === "Rejected" && a.rejectionReason && (
                      <p className="mt-2 text-sm text-[#CFCFCF]/90">Rejection reason: {a.rejectionReason}</p>
                    )}
                    {!a.isFree && (
                      <p className="mt-2 text-sm text-[#CFCFCF]">{requestCounts[a.id] || 0} access requests</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[a.status]}`}>{a.status}</span>
                    <span className="text-xs text-[#CFCFCF]/80">{a.downloads.toLocaleString()} downloads</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
