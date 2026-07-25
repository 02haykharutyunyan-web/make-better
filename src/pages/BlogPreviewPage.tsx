import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { getBlogPostPreviewBySlug } from "@/services/content";
import { getCurrentCreatorForSubmission } from "@/services/creators";
import { explainSupabaseError } from "@/lib/supabase/errors";
import type { Tables } from "@/types/database";

type PreviewRow = Tables<"blog_posts"> & { creators?: Pick<Tables<"creators">, "id" | "slug" | "brand_name"> | null };

export default function BlogPreviewPage({ audience }: { audience: "admin" | "creator" }) {
  const { slug = "" } = useParams();
  const [post, setPost] = useState<PreviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);
    const previousTitle = document.title;
    document.title = "Private blog preview | Make Better";
    return () => { robots.remove(); document.title = previousTitle; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await getBlogPostPreviewBySlug(slug);
        if (!row) { if (!cancelled) setDenied(true); return; }
        if (audience === "creator") {
          const creator = await getCurrentCreatorForSubmission();
          if (row.creator_id !== creator.id) { if (!cancelled) setDenied(true); return; }
        }
        if (!cancelled) setPost(row as PreviewRow);
      } catch (cause) {
        if (!cancelled) setError(explainSupabaseError(cause, "Unable to authorize this preview."));
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [audience, slug]);

  if (denied) return <Navigate to={audience === "admin" ? "/admin/blog" : "/creator-dashboard"} replace />;
  return <SiteLayout><article className="container-mb max-w-3xl py-10 sm:py-16">
    <div role="status" className="sticky top-3 z-20 rounded-xl border border-[#FFD600]/40 bg-black/95 px-4 py-3 text-center text-xs font-bold tracking-[0.18em] text-[#FFD600] shadow-xl">PREVIEW — NOT PUBLIC</div>
    <Link className="mt-6 inline-block text-sm text-[#CFCFCF] hover:text-white" to={audience === "admin" ? "/admin/blog" : "/creator-dashboard"}>Back to {audience === "admin" ? "moderation queue" : "dashboard"}</Link>
    {loading && <div className="mt-8 card-premium p-6 text-[#CFCFCF]">Loading protected preview...</div>}
    {error && <div className="mt-8 card-premium p-6 text-[#CFCFCF]">{error}</div>}
    {post && <div className="mt-8 min-w-0"><div className="eyebrow">{post.category || "Uncategorized"}</div><h1 className="mt-5 break-words text-3xl font-medium sm:text-5xl">{post.title}</h1><div className="mt-4 text-sm text-[#CFCFCF]">{post.creators?.brand_name || "Make Better"} · {post.status.replace("_", " ")}</div><div className="prose prose-invert mt-10 max-w-none break-words"><p className="text-lg text-white/75">{post.excerpt}</p><p className="whitespace-pre-wrap text-white/65">{post.body}</p></div></div>}
  </article></SiteLayout>;
}
