import { Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { SubmittedAsset, useStore } from "@/store/store";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { dbAssetToSubmittedAsset } from "@/lib/asset-mappers";
import { getCreatorByProfileId, reapplyCreatorApplication } from "@/services/creators";
import type { Tables } from "@/types/database";
import { countAccessRequestsForAssets, listCreatorAssets } from "@/services/assets";
import { listCreatorBlogPosts } from "@/services/content";

const statusStyles: Record<string, string> = {
  "Draft": "bg-[#0E0E0E]/80 text-[#CFCFCF] border-white/10",
  "Pending Review": "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
  "Approved": "bg-white/10 text-white border-white/20",
  "Rejected": "bg-white/10 text-[#CFCFCF] border-white/20",
  "Published": "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
};

export default function CreatorDashboard() {
  const { user } = useStore();
  const [remoteAssets, setRemoteAssets] = useState<SubmittedAsset[]>([]);
  const [blogPosts, setBlogPosts] = useState<Tables<"blog_posts">[]>([]);
  const [creator, setCreator] = useState<Tables<"creators"> | null>(null);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reapplying, setReapplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      setErr("");
      try {
        const creator = await getCreatorByProfileId(user.id);
        if (!cancelled) setCreator(creator);
        if (!creator) {
          if (!cancelled) { setRemoteAssets([]); setBlogPosts([]); }
          return;
        }
        const rows = await listCreatorAssets(creator.id);
        const mapped = rows.map(dbAssetToSubmittedAsset);
        const counts = await countAccessRequestsForAssets(mapped.map(a => a.id));
        const posts = await listCreatorBlogPosts(creator.id);
        if (!cancelled) {
          setRemoteAssets(mapped);
          setRequestCounts(counts);
          setBlogPosts(posts);
        }
      } catch (error) {
        if (!cancelled) {
          setErr(explainSupabaseError(error, "Unable to load your submissions."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const reapply = async () => {
    if (!window.confirm("Resubmit your creator application for admin review?")) return;
    setReapplying(true);
    setErr("");
    try {
      const updated = await reapplyCreatorApplication();
      setCreator(updated);
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to resubmit your creator application."));
    } finally {
      setReapplying(false);
    }
  };

  const approved = creator?.application_status === "approved";
  const mine = remoteAssets;
  const totalDownloads = mine.reduce((s, a) => s + a.downloads, 0);
  const stats = [
    { label: "Total assets", v: mine.length },
    { label: "Blog posts", v: blogPosts.length },
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
          {approved ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link to="/creator-dashboard/submit-asset" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full btn-primary px-5 py-3 text-sm font-medium transition sm:w-auto">
                <Plus className="h-4 w-4" /> Submit new asset
              </Link>
              <Link to="/creator-dashboard/blog/new" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-[#FFD600]/60 sm:w-auto">
                <Plus className="h-4 w-4" /> New blog draft
              </Link>
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#CFCFCF] sm:w-auto">
              Application status: <span className="capitalize text-white">{creator?.application_status || "pending"}</span>
            </div>
          )}
        </div>

        {creator?.application_status === "rejected" && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-[#CFCFCF]">
            <div className="font-medium text-white">Your creator application was rejected.</div>
            {creator.application_rejection_reason && <p className="mt-2 text-sm">Reason: {creator.application_rejection_reason}</p>}
            <p className="mt-2 text-sm">Update the editable details on your profile, then resubmit for a fresh admin review.</p>
            <button type="button" disabled={reapplying} onClick={reapply} className="mt-4 min-h-11 rounded-full btn-primary px-5 text-sm disabled:opacity-50">
              {reapplying ? "Resubmitting..." : "Resubmit application"}
            </button>
          </div>
        )}
        {creator?.application_status === "pending" && (
          <div className="mt-6 rounded-2xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-5 text-[#CFCFCF]">
            <div className="font-medium text-[#FFD600]">Application pending review</div>
            <p className="mt-2 text-sm">You can sign in and view this status. Asset, creator-blog, and paid-listing tools unlock only after admin approval.</p>
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <div className="mt-6 card-premium p-8 sm:p-10 text-center text-[#CFCFCF]">No assets yet. Approved creators can submit their first asset.</div>
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
                    <Link to={`/creator-dashboard/assets/${a.id}/preview`} className="rounded-full border border-[#FFD600]/40 px-3 py-1 text-xs text-[#FFD600] hover:border-[#FFD600] transition">Preview</Link>
                    <Link to={`/creator-dashboard/assets/${a.slug}/edit`} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-[#FFD600]/60 hover:text-white transition">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-medium tracking-normal">Blog submissions</h2>
          {!loading && blogPosts.length === 0 ? (
            <div className="mt-6 card-premium p-8 sm:p-10 text-center text-[#CFCFCF]">No creator-blog posts yet.</div>
          ) : !loading && (
            <div className="mt-6 grid gap-3">
              {blogPosts.map(post => (
                <div key={post.id} className="card-premium p-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#CFCFCF]/70">Creator blog • {post.category || "Uncategorized"}</div>
                    <h3 className="mt-1 text-lg font-medium tracking-normal">{post.title}</h3>
                    {post.status === "rejected" && post.rejection_reason && (
                      <p className="mt-2 text-sm text-[#CFCFCF]/90">Rejection reason: {post.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusStyles[statusLabel(post.status)]}`}>{statusLabel(post.status)}</span>
                    <Link to={`/creator-dashboard/blog/${post.id}/preview`} className="rounded-full border border-[#FFD600]/40 px-3 py-1 text-xs text-[#FFD600] hover:border-[#FFD600] transition">Preview</Link>
                    {(post.status === "draft" || post.status === "rejected") && <Link to={`/creator-dashboard/blog/${post.slug}/edit`} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80 hover:border-[#FFD600]/60 hover:text-white transition">Edit</Link>}
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


function statusLabel(status: Tables<"blog_posts">["status"]) {
  if (status === "pending_review") return "Pending Review";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
