import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useStore } from "@/store/store";
import { Collection } from "@/data/marketplace";

const blank: Collection = {
  slug: "", title: "", description: "", longDescription: "", bestFor: [], relatedTypes: [],
};

export default function AdminCollections() {
  const { store, upsertCollection, deleteCollection } = useStore();
  const [editing, setEditing] = useState<(Collection & { status?: string; seoIntro?: string; selectedAssets?: string[]; relatedBlog?: string[] }) | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const slug = editing.slug || editing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    upsertCollection({ ...editing, slug });
    setEditing(null);
  };

  const toggleAsset = (slug: string) => {
    if (!editing) return;
    const cur = editing.selectedAssets || [];
    setEditing({ ...editing, selectedAssets: cur.includes(slug) ? cur.filter(s => s !== slug) : [...cur, slug] });
  };
  const toggleBlog = (slug: string) => {
    if (!editing) return;
    const cur = editing.relatedBlog || [];
    setEditing({ ...editing, relatedBlog: cur.includes(slug) ? cur.filter(s => s !== slug) : [...cur, slug] });
  };

  return (
    <AdminLayout eyebrow="Collections" title="Manage collections">
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing({ ...blank, status: "Published" })} className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium">+ New collection</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {store.collections.map(c => (
          <div key={c.slug} className="card-premium p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium tracking-tight">{c.title}</h3>
                <p className="mt-1 text-sm text-white/60 line-clamp-2">{c.description}</p>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditing({ ...c })} className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/[0.06]">Edit</button>
                <button onClick={() => { if (confirm("Delete?")) deleteCollection(c.slug); }} className="rounded-full border border-white/15 px-3 py-1.5 text-red-300 hover:bg-white/[0.06]">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditing(null)} />
          <form onSubmit={save} className="relative w-full max-w-2xl card-premium p-7 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-medium tracking-tight">{editing.slug ? "Edit collection" : "New collection"}</h3>
            <Field label="Title" value={editing.title} onChange={v => setEditing({ ...editing, title: v })} required />
            <Field label="Slug (optional)" value={editing.slug} onChange={v => setEditing({ ...editing, slug: v })} />
            <Textarea label="Description" rows={2} value={editing.description} onChange={v => setEditing({ ...editing, description: v })} />
            <Textarea label="SEO intro / long description" rows={4} value={editing.longDescription || editing.seoIntro || ""} onChange={v => setEditing({ ...editing, longDescription: v, seoIntro: v })} />

            <div>
              <div className="text-xs text-white/55 mb-2">Selected assets</div>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1">
                {store.assets.map(a => (
                  <label key={a.id} className="flex items-center gap-2 text-sm py-1">
                    <input type="checkbox" checked={(editing.selectedAssets || []).includes(a.slug)} onChange={() => toggleAsset(a.slug)} />
                    <span className="text-white/80">{a.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-white/55 mb-2">Related blog posts</div>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1">
                {store.blog.map(p => (
                  <label key={p.slug} className="flex items-center gap-2 text-sm py-1">
                    <input type="checkbox" checked={(editing.relatedBlog || []).includes(p.slug)} onChange={() => toggleBlog(p.slug)} />
                    <span className="text-white/80">{p.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs text-white/55">Status</span>
              <select value={editing.status || "Published"} onChange={e => setEditing({ ...editing, status: e.target.value })}
                className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30">
                <option className="bg-black">Draft</option>
                <option className="bg-black">Published</option>
              </select>
            </label>

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
function Textarea({ label, value, onChange, rows = 3 }: any) {
  return (
    <label className="block">
      <span className="text-xs text-white/55">{label}</span>
      <textarea value={value} rows={rows} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30" />
    </label>
  );
}
