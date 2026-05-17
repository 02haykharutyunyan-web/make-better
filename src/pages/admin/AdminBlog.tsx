import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useStore } from "@/store/store";
import { BlogPost } from "@/data/marketplace";

type Draft = BlogPost & { status?: "Draft" | "Published" };

const blank: Draft = {
  slug: "", title: "", excerpt: "", category: "Strategy", date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
  body: "", creatorSlug: "", status: "Published",
};

export default function AdminBlog() {
  const { store, upsertBlog, deleteBlog } = useStore();
  const [editing, setEditing] = useState<Draft | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const slug = editing.slug || editing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    upsertBlog({ ...editing, slug });
    setEditing(null);
  };

  return (
    <AdminLayout eyebrow="Blog" title="Manage posts">
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing({ ...blank })} className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium">+ New post</button>
      </div>

      <div className="card-premium overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-5 py-4">Title</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Author</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {store.blog.map(p => (
              <tr key={p.slug} className="border-t border-white/5">
                <td className="px-5 py-4 text-white">{p.title}</td>
                <td className="px-5 py-4 text-white/65">{p.category}</td>
                <td className="px-5 py-4 text-white/65">{p.creatorSlug ? store.creators.find(c => c.slug === p.creatorSlug)?.name : "Make Better"}</td>
                <td className="px-5 py-4 text-white/55">{p.date}</td>
                <td className="px-5 py-4 text-right text-xs space-x-3">
                  <button onClick={() => setEditing({ ...p })} className="text-white/70 hover:text-white">Edit</button>
                  <button onClick={() => { if (confirm("Delete post?")) deleteBlog(p.slug); }} className="text-red-300 hover:text-red-200">Delete</button>
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
            <label className="block">
              <span className="text-xs text-white/55">Excerpt</span>
              <textarea value={editing.excerpt} rows={2} onChange={e => setEditing({ ...editing, excerpt: e.target.value })}
                className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30" />
            </label>
            <label className="block">
              <span className="text-xs text-white/55">Content</span>
              <textarea value={editing.body} rows={6} onChange={e => setEditing({ ...editing, body: e.target.value })}
                className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30" />
            </label>
            <label className="block">
              <span className="text-xs text-white/55">Author / Creator</span>
              <select value={editing.creatorSlug || ""} onChange={e => setEditing({ ...editing, creatorSlug: e.target.value || undefined })}
                className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30">
                <option value="" className="bg-black">Make Better</option>
                {store.creators.map(c => <option key={c.slug} value={c.slug} className="bg-black">{c.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/55">Status</span>
              <select value={editing.status || "Published"} onChange={e => setEditing({ ...editing, status: e.target.value as any })}
                className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30">
                <option className="bg-black">Draft</option>
                <option className="bg-black">Published</option>
              </select>
            </label>
            <div className="text-xs text-white/40">Featured image upload — placeholder</div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-white/15 px-4 py-2 text-sm">Cancel</button>
              <button className="rounded-full bg-white text-black px-5 py-2 text-sm font-medium">Save</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, value, onChange, required, type = "text" }: any) {
  return (
    <label className="block">
      <span className="text-xs text-white/55">{label}{required && <span className="text-white/30"> *</span>}</span>
      <input required={required} type={type} value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30" />
    </label>
  );
}
