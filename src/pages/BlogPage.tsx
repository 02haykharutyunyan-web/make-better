import { useEffect, useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import type { BlogPost } from "@/data/marketplace";
import { Link } from "react-router-dom";
import { listPublishedBlogPosts } from "@/services/content";
import { dbBlogToBlogPost } from "@/lib/content-mappers";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { SectionVisual } from "@/components/visuals/MarketplaceVisuals";

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
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load published posts."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visiblePosts = posts;

  return (
    <SiteLayout>
      <section className="container-mb section-rich pt-12 sm:pt-16 md:pt-24">
        <SectionVisual variant="lines" />
        <div className="eyebrow">Blog</div>
        <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-normal leading-[1.06] max-w-4xl">
          Better strategies for using AI assets.
        </h1>
        <p className="mt-4 sm:mt-5 max-w-2xl text-[#CFCFCF] text-base sm:text-lg leading-relaxed">
          Field notes, playbooks, and buying guides from the operators behind the marketplace.
        </p>
      </section>

      <section className="container-mb section-rich mt-10">
        <SectionVisual variant="mesh" />
        {err && <div className="mb-6 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
        {loading && <div className="mb-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading posts...</div>}
        {!loading && visiblePosts.length === 0 && <div className="card-premium p-8 sm:p-10 text-center text-[#CFCFCF]">No published posts yet.</div>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visiblePosts.map(p => (
            <Link to={`/blog/${p.slug}`} key={p.slug} className="card-premium p-5 sm:p-7 group">
              <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">{p.category}</div>
              <h3 className="mt-3 text-xl font-medium tracking-normal leading-snug">{p.title}</h3>
              <p className="mt-2 text-sm text-[#CFCFCF] line-clamp-3">{p.excerpt}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#CFCFCF]/80">
                <span>{p.date}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
