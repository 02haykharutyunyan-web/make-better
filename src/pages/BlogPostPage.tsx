import { Navigate, useParams, Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { assetsByCreator, blogPosts, getCreator, getPost } from "@/data/marketplace";
import AssetCard from "@/components/AssetCard";

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = getPost(slug || "");
  if (!post) return <Navigate to="/blog" replace />;
  const creator = post.creatorSlug ? getCreator(post.creatorSlug) : null;
  const related = blogPosts.filter(p => p.slug !== post.slug).slice(0, 3);
  const creatorAssets = creator ? assetsByCreator(creator.slug).slice(0, 3) : [];

  return (
    <SiteLayout>
      <article className="container-mb pt-12 md:pt-16 max-w-3xl">
        <Link to="/blog" className="text-sm text-white/50 hover:text-white">← Blog</Link>
        <div className="eyebrow mt-6">{post.category}</div>
        <h1 className="mt-5 text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.04]">{post.title}</h1>
        <div className="mt-6 flex items-center gap-3 text-sm text-white/50">
          <span>{post.date}</span>
          {creator && <><span>·</span><Link to={`/creator/${creator.slug}`} className="hover:text-white">{creator.name}</Link></>}
        </div>
        <div className="mt-12 prose prose-invert max-w-none">
          <p className="text-xl text-white/75 leading-relaxed">{post.excerpt}</p>
          <p className="mt-6 text-white/65 leading-relaxed">{post.body}</p>
          <p className="mt-6 text-white/65 leading-relaxed">
            On Make Better, every asset is built around a real problem. Browse the marketplace to find prompts, agents, assistants, and workflows that turn the strategy in this post into something you can run today.
          </p>
        </div>
      </article>

      {creatorAssets.length > 0 && (
        <section className="container-mb mt-20">
          <h2 className="text-2xl font-medium tracking-tight">Assets from {creator?.name}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creatorAssets.map(a => <AssetCard key={a.slug} asset={a} />)}
          </div>
        </section>
      )}

      <section className="container-mb mt-20">
        <h2 className="text-2xl font-medium tracking-tight">Keep reading</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {related.map(p => (
            <Link to={`/blog/${p.slug}`} key={p.slug} className="card-premium p-6">
              <div className="text-xs uppercase tracking-[0.16em] text-white/40">{p.category}</div>
              <h3 className="mt-3 text-lg font-medium tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm text-white/55 line-clamp-2">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
