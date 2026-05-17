import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import { BlogPost, blogPosts, getCreator } from "@/data/marketplace";
import { Link } from "react-router-dom";
import { listPublishedBlogPosts } from "@/services/content";
import { dbBlogToBlogPost } from "@/lib/content-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const rows = await listPublishedBlogPosts();
        if (!cancelled) setPosts(rows.map(dbBlogToBlogPost));
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Using demo posts because Supabase blog posts could not be loaded."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visiblePosts = posts.length > 0 ? posts : blogPosts;

  return (
    <SiteLayout>
      <section className="container-mb pt-16 md:pt-24">
        <div className="eyebrow">Blog</div>
        <h1 className="mt-5 text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.04] max-w-4xl">
          Better strategies for using AI assets.
        </h1>
        <p className="mt-5 max-w-2xl text-white/60 text-lg">
          Field notes, playbooks, and buying guides from the operators behind the marketplace.
        </p>
      </section>

      <section className="container-mb mt-10">
        {err && <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{err}</div>}
        {loading && <div className="mb-6 card-premium p-4 text-sm text-white/55">Loading posts...</div>}
        {!loading && visiblePosts.length === 0 && <div className="card-premium p-10 text-center text-white/55">No published posts yet.</div>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visiblePosts.map(p => {
            const c = p.creatorSlug ? getCreator(p.creatorSlug) : null;
            return (
              <Link to={`/blog/${p.slug}`} key={p.slug} className="card-premium p-7 group">
                <div className="text-xs uppercase tracking-[0.16em] text-white/40">{p.category}</div>
                <h3 className="mt-3 text-xl font-medium tracking-tight leading-snug">{p.title}</h3>
                <p className="mt-2 text-sm text-white/55 line-clamp-3">{p.excerpt}</p>
                <div className="mt-5 flex items-center justify-between text-xs text-white/45">
                  <span>{p.date}</span>
                  {c && <span>by {c.name}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
