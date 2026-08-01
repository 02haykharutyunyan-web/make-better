import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { AdminOverview, getAdminOverview } from "@/services/admin";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await getAdminOverview();
        if (!cancelled) setOverview(data);
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load admin dashboard."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { label: "Total creators", v: overview?.totalCreators ?? 0 },
    { label: "Total assets", v: overview?.totalAssets ?? 0 },
    { label: "Pending review", v: overview?.pendingReviewCount ?? 0 },
    { label: "Published", v: overview?.publishedCount ?? 0 },
    { label: "Total claims", v: overview?.totalClaims ?? 0 },
    { label: "Total downloads", v: (overview?.totalDownloads ?? 0).toLocaleString() },
  ];

  return (
    <AdminLayout eyebrow="Overview" title="Platform dashboard">
      {err && <div className="mb-6 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
      {loading && <div className="mb-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading dashboard...</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(s => (
          <div key={s.label} className="card-premium p-5 sm:p-6">
            <div className="text-2xl sm:text-3xl font-medium">{s.v}</div>
            <div className="mt-2 text-xs uppercase tracking-wider text-[#CFCFCF]/80">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="eyebrow">Last 7 days</div>
        <h2 className="mt-2 text-xl font-medium">Marketplace funnel</h2>
        <p className="mt-2 text-sm text-[#CFCFCF]">Aggregate activity only. MakeBetter does not store contact or private delivery data in analytics.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Asset views", overview?.observability.assetViews ?? 0],
            ["Free claim starts", overview?.observability.freeClaimStarts ?? 0],
            ["Free claims completed", overview?.observability.freeClaimsCompleted ?? 0],
            ["Deliveries opened", overview?.observability.deliveriesOpened ?? 0],
            ["Creator submissions", overview?.observability.creatorSubmissions ?? 0],
            ["Admin reviews", overview?.observability.adminReviews ?? 0],
          ].map(([label, value]) => <div key={String(label)} className="card-premium p-5"><div className="text-2xl font-medium">{value}</div><div className="mt-2 text-xs uppercase tracking-wider text-[#CFCFCF]/80">{label}</div></div>)}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#CFCFCF]">Client errors in the last 24 hours: <span className="text-white">{overview?.observability.clientErrors24h ?? 0}</span></div>
      </section>

      <section className="mt-10">
        <div className="eyebrow">Real delivery access</div>
        <h2 className="mt-2 text-xl font-medium">Downloads</h2>
        <p className="mt-2 text-sm text-[#CFCFCF]">Counts only entitled delivery access. Repeat opens of the same asset by the same user count once per day.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="card-premium p-5"><div className="text-2xl font-medium">{overview?.downloadAnalytics.downloads7d ?? 0}</div><div className="mt-2 text-xs uppercase tracking-wider text-[#CFCFCF]/80">Last 7 days</div></div>
          <div className="card-premium p-5"><div className="text-2xl font-medium">{overview?.downloadAnalytics.downloads30d ?? 0}</div><div className="mt-2 text-xs uppercase tracking-wider text-[#CFCFCF]/80">Last 30 days</div></div>
        </div>
        <div className="mt-5 card-premium overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4 text-sm font-medium">Top assets</div>
          {(overview?.downloadAnalytics.topAssets.length || 0) === 0 ? <div className="px-5 py-5 text-sm text-[#CFCFCF]">No verified delivery access yet.</div> : (
            <div className="divide-y divide-white/10">{overview?.downloadAnalytics.topAssets.map(asset => <a key={asset.id} href={`/asset/${asset.slug}`} className="flex items-center justify-between gap-4 px-5 py-4 text-sm hover:bg-white/[0.03]"><span className="min-w-0"><span className="block truncate text-white">{asset.title}</span><span className="text-xs text-[#CFCFCF]">{asset.creator_name}</span></span><span className="shrink-0 text-white">{asset.downloads.toLocaleString()} downloads</span></a>)}</div>
          )}
        </div>
      </section>

      {(overview?.pendingReviewCount || 0) > 0 && (
        <div className="mt-10 card-premium p-5 sm:p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div>
              <div className="eyebrow">Needs attention</div>
              <h2 className="mt-2 text-xl font-medium">{overview?.pendingReviewCount} assets awaiting review</h2>
            </div>
            <a href="/admin/assets" className="inline-flex min-h-11 items-center justify-center rounded-full btn-primary px-4 py-2 text-sm font-medium">Review now</a>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
