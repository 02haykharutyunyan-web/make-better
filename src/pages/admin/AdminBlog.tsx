import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { BlogPost } from "@/data/marketplace";
import { deleteBlogPost, listAdminBlogPosts, upsertBlogPost } from "@/services/content";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { dbBlogToBlogPost } from "@/lib/content-mappers";
import { listActiveCreators } from "@/services/creators";
import type { Tables } from "@/types/database";

type Draft = BlogPost & { id?: string; status?: "Draft" | "Published" };
const blank: Draft = { slug: "", title: "", excerpt: "", category: "Strategy", date: "", body: "", creatorSlug: "", status: "Published" };

export default function AdminBlog() {
  const [posts, setPosts] = useState<Draft[]>([]);
  const [creators, setCreators] = useState<Tables<"creators">[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [postRows, creatorRows] = await Promise.all([listAdminBlogPosts(), listActiveCreators()]);
      setPosts(postRows.map(row => ({ ...dbBlogToBlogPost(row), id: row.id, status: row.status === "published" ? "Published" : "Draft" })));
      setCreators(creatorRows);
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to load blog posts."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setErr("");
    try {
      const slug = editing.slug || editing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const creator = creators.find(c => c.slug === editing.creatorSlug);
      await upsertBlogPost({
        slug,
        title: editing.title,
        excerpt: editing.excerpt,
        category: editing.category,
        body: editing.body,
        creator_id: creator?.id || null,
        status: editing.status === "Published" ? "published" : "draft",
        published_at: editing.status === "Published" ? new Date().toISOString() : null,
      });
      setEditing(null);
      await load();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to save blog post."));
    }
  };

  const remove = async (post: Draft) => {
    if (!post.id || !confirm("Delete post?")) return;
    try {
      await deleteBlogPost(post.id);
      await load();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to delete blog post."));
    }
  };

  return (
    <AdminLayout eyebrow="Blog" title="Manage posts">
      {err && <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{err}</div>}
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing({ ...blank })} className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium">+ New post</button>
      </div>
      {loading && <div className="mb-6 card-premium p-4 text-sm text-white/55">Loading posts...</div>}

      <div className="card-premium overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-white/45">
            <tr><th className="px-5 py-4">Title</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date</th><th className="px-5 py-4 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id || p.slug} className="border-t border-white/5">
                <td className="px-5 py-4 text-white">{p.title}</td>
                <td className="px-5 py-4 text-white/65">{p.category}</td>
                <td className="px-5 py-4 text-white/65">{p.status}</td>
                <td className="px-5 py-4 text-white/55">{p.date}</td>
                <td className="px-5 py-4 text-right text-xs space-x-3">
                  <button onClick={() => setEditing({ ...p })} className="text-white/70 hover:text-white">Edit</button>
                  <button onClick={() => remove(p)} className="text-red-300 hover:text-red-200">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditing(null)} />
          <form onSubmit={save} className="relative w-full max-w-2xl card-premium p-7 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-medium tracking-tight">{editing.slug ? "Edit post" : "New post"}</h3>
            <Field label="Title" value={editing.title} onChange={v => setEditing({ ...editing, title: v })} required />
            <Field label="Slug (optional)" value={editing.slug} onChange={v => setEditing({ ...editing, slug: v })} />
            <Field label="Category" value={editing.category} onChange={v => setEditing({ ...editing, category: v })} required />
            <Textarea label="Excerpt" rows={2} value={editing.excerpt} onChange={v => setEditing({ ...editing, excerpt: v })} />
            <Textarea label="Content" rows={6} value={editing.body} onChange={v => setEditing({ ...editing, body: v })} />
            <label className="block"><span className="text-xs text-white/55">Author / Creator</span>
              <select value={editing.creatorSlug || ""} onChange={e => setEditing({ ...editing, creatorSlug: e.target.value || undefined })} className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm">
                <option value="" className="bg-black">Make Better</option>
                {creators.map(c => <option key={c.slug} value={c.slug} className="bg-black">{c.brand_name}</option>)}
              </select>
            </label>
            <label className="block"><span className="text-xs text-white/55">Status</span>
              <select value={editing.status || "Published"} onChange={e => setEditing({ ...editing, status: e.target.value as any })} className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm">
                <option className="bg-black">Draft</option><option className="bg-black">Published</option>
              </select>
            </label>
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setEditing(null)} className="rounded-full border border-white/15 px-4 py-2 text-sm">Cancel</button><button className="rounded-full bg-white text-black px-5 py-2 text-sm font-medium">Save</button></div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, value, onChange, required, type = "text" }: any) {
  return <label className="block"><span className="text-xs text-white/55">{label}{required && <span className="text-white/30"> *</span>}</span><input required={required} type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30" /></label>;
}
function Textarea({ label, value, onChange, rows = 3 }: any) {
  return <label className="block"><span className="text-xs text-white/55">{label}</span><textarea value={value} rows={rows} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30" /></label>;
}
