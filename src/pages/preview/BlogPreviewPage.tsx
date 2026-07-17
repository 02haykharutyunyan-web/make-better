import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { getModerationBlogPostById } from "@/services/content";
import type { Tables } from "@/types/database";

type BlogRow = Tables<"blog_posts"> & { creators?: Pick<Tables<"creators">, "id" | "slug" | "brand_name"> | null };

export default function BlogPreviewPage() {
  const { id } = useParams();
  const [post, setPost] = useState<BlogRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    document.title = "Preview — not public";
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement("meta"); meta.name = "robots"; document.head.appendChild(meta); }
    meta.content = "noindex,nofollow";
    let cancelled = false;
    getModerationBlogPostById(id || "").then(row => { if (!cancelled) setPost(row as BlogRow | null); }).catch(() => { if (!cancelled) setPost(null); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);
  return <SiteLayout><section className="container-mb max-w-3xl pt-12 sm:pt-16 pb-20 sm:pb-24">
    <div className="rounded-2xl border border-[#FFD600]/30 bg-[#FFD600]/10 p-4 text-sm font-medium text-[#FFD600]">PREVIEW — NOT PUBLIC</div>
    {loading && <p className="mt-8 text-[#CFCFCF]">Loading preview...</p>}
    {!loading && !post && <div className="mt-8 card-premium p-6"><h1 className="text-2xl font-medium">Preview unavailable</h1><p className="mt-2 text-[#CFCFCF]">You do not have access to this unpublished post, or it no longer exists.</p></div>}
    {post && <article className="mt-8 card-premium p-5 sm:p-8">
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-[#CFCFCF]/70"><span>Status: {post.status}</span><span>Creator: {post.creators?.brand_name || "Make Better"}</span><span>Category: {post.category || "Uncategorized"}</span></div>
      <h1 className="mt-4 text-3xl sm:text-5xl font-medium tracking-normal">{post.title}</h1>
      {post.excerpt && <p className="mt-4 text-lg text-[#CFCFCF]">{post.excerpt}</p>}
      <dl className="mt-6 grid gap-3 text-sm text-[#CFCFCF] sm:grid-cols-2"><Meta label="Submitted" value={post.submitted_at} /><Meta label="Published" value={post.published_at} /><Meta label="Reviewed" value={post.reviewed_at} /><Meta label="Slug" value={post.slug} /></dl>
      {post.rejection_reason && <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-[#CFCFCF]"><strong className="text-white">Rejection reason:</strong> {post.rejection_reason}</div>}
      <div className="prose prose-invert mt-8 max-w-none whitespace-pre-wrap text-[#F4F4F4]">{post.body || "No body content."}</div>
      {post.status === "published" && <Link to={`/blog/${post.slug}`} className="mt-8 inline-flex rounded-full btn-primary px-5 py-3 text-sm">Open public post</Link>}
    </article>}
  </section></SiteLayout>;
}
function Meta({ label, value }: { label: string; value?: string | null }) { return <div><dt className="text-white/50">{label}</dt><dd>{value ? (value.includes("T") ? new Date(value).toLocaleString() : value) : "—"}</dd></div>; }
