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
