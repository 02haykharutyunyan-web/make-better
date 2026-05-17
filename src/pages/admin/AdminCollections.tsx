import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Collection } from "@/data/marketplace";
import { deleteCollection, listAdminCollections, upsertCollection } from "@/services/content";
import { listAdminAssets } from "@/services/assets";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { dbCollectionToCollection } from "@/lib/content-mappers";
import type { Tables } from "@/types/database";

type Draft = Collection & { id?: string; status?: string; selectedAssetIds?: string[] };
const blank: Draft = { slug: "", title: "", description: "", longDescription: "", bestFor: [], relatedTypes: [], status: "Published", selectedAssetIds: [] };

export default function AdminCollections() {
  const [collections, setCollections] = useState<Draft[]>([]);
  const [assets, setAssets] = useState<Tables<"assets">[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [collectionRows, assetRows] = await Promise.all([listAdminCollections(), listAdminAssets()]);
      setCollections(collectionRows.map(row => ({ ...dbCollectionToCollection(row), id: row.id, status: row.status === "published" ? "Published" : "Draft", selectedAssetIds: row.selected_asset_ids || [] })));
      setAssets(assetRows);
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to load collections."));
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
      await upsertCollection({
        slug,
        title: editing.title,
        description: editing.description,
        long_description: editing.longDescription,
        best_for: editing.bestFor,
        related_types: editing.relatedTypes,
        selected_asset_ids: editing.selectedAssetIds || [],
        status: editing.status === "Published" ? "published" : "draft",
      });
      setEditing(null);
      await load();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to save collection."));
    }
  };

  const remove = async (collection: Draft) => {
    if (!collection.id || !confirm("Delete collection?")) return;
    try {
      await deleteCollection(collection.id);
      await load();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to delete collection."));
    }
  };

  const toggleAsset = (id: string) => {
    if (!editing) return;
    const cur = editing.selectedAssetIds || [];
    setEditing({ ...editing, selectedAssetIds: cur.includes(id) ? cur.filter(s => s !== id) : [...cur, id] });
  };

  return (
    <AdminLayout eyebrow="Collections" title="Manage collections">
      {err && <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{err}</div>}
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing({ ...blank })} className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium">+ New collection</button>
      </div>
      {loading && <div className="mb-6 card-premium p-4 text-sm text-white/55">Loading collections...</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {collections.map(c => (
          <div key={c.id || c.slug} className="card-premium p-6">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-lg font-medium tracking-tight">{c.title}</h3><p className="mt-1 text-sm text-white/60 line-clamp-2">{c.description}</p><div className="mt-2 text-xs text-white/40">{c.status}</div></div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditing({ ...c })} className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/[0.06]">Edit</button>
                <button onClick={() => remove(c)} className="rounded-full border border-white/15 px-3 py-1.5 text-red-300 hover:bg-white/[0.06]">Delete</button>
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
            <Textarea label="SEO intro / long description" rows={4} value={editing.longDescription} onChange={v => setEditing({ ...editing, longDescription: v })} />
            <Field label="Best for (comma separated)" value={editing.bestFor.join(", ")} onChange={v => setEditing({ ...editing, bestFor: v.split(",").map(x => x.trim()).filter(Boolean) })} />
            <Field label="Related product types (comma separated)" value={editing.relatedTypes.join(", ")} onChange={v => setEditing({ ...editing, relatedTypes: v.split(",").map(x => x.trim()).filter(Boolean) as any })} />
            <div><div className="text-xs text-white/55 mb-2">Selected published assets</div><div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1">
              {assets.filter(a => a.status === "published").map(a => <label key={a.id} className="flex items-center gap-2 text-sm py-1"><input type="checkbox" checked={(editing.selectedAssetIds || []).includes(a.id)} onChange={() => toggleAsset(a.id)} /><span className="text-white/80">{a.title}</span></label>)}
            </div></div>
            <label className="block"><span className="text-xs text-white/55">Status</span><select value={editing.status || "Published"} onChange={e => setEditing({ ...editing, status: e.target.value })} className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm"><option className="bg-black">Draft</option><option className="bg-black">Published</option></select></label>
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
