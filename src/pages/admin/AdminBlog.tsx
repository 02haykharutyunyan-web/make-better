import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { createAdminBlogPost, deleteBlogPost, listAdminBlogPosts, reviewBlogPost, updateBlogPost } from "@/services/content";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { listActiveCreators } from "@/services/creators";
import type { PublishStatus, Tables } from "@/types/database";

type BlogRow = Tables<"blog_posts"> & { creators?: Pick<Tables<"creators">, "id" | "slug" | "brand_name"> | null };
type Draft = { id?: string; slug: string; title: string; excerpt: string; category: string; body: string; creatorSlug: string };
const blank: Draft = { slug: "", title: "", excerpt: "", category: "Strategy", body: "", creatorSlug: "" };
const filters: (PublishStatus | "all")[] = ["pending_review", "published", "rejected", "draft", "all"];

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [creators, setCreators] = useState<Tables<"creators">[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("pending_review");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewIntent, setReviewIntent] = useState<{ post: BlogRow; status: "published" | "rejected" | "draft" } | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [postRows, creatorRows] = await Promise.all([listAdminBlogPosts(), listActiveCreators()]);
      setPosts(postRows as BlogRow[]);
      setCreators(creatorRows);
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to load blog posts."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visiblePosts = useMemo(() => filter === "all" ? posts : posts.filter(post => post.status === filter), [filter, posts]);

  const edit = (post: BlogRow) => setEditing({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || "",
    category: post.category || "Strategy",
    body: post.body || "",
    creatorSlug: post.creators?.slug || "",
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setErr(""); setSuccess(""); setSaving(true);
    try {
      const slug = editing.slug || editing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const creator = creators.find(c => c.slug === editing.creatorSlug);
      const payload = { slug, title: editing.title, excerpt: editing.excerpt || null, category: editing.category || null, body: editing.body || null, creator_id: creator?.id || null, status: "draft" as const };
      if (editing.id) await updateBlogPost(editing.id, payload);
      else await createAdminBlogPost(payload);
      setEditing(null);
      setSuccess("Blog draft saved. Publish through the moderation queue after review.");
      await load();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to save blog post."));
    } finally {
      setSaving(false);
    }
  };

  const review = (post: BlogRow, status: "published" | "rejected" | "draft") => {
    if (processingId) return;
    setReason("");
    setReviewIntent({ post, status });
  };

  const confirmReview = async () => {
    if (!reviewIntent || processingId) return;
    if (reviewIntent.status === "rejected" && !reason.trim()) { setErr("Enter a meaningful rejection reason before rejecting."); return; }
    setProcessingId(reviewIntent.post.id); setErr(""); setSuccess("");
    try {
      const updated = await reviewBlogPost(reviewIntent.post.id, reviewIntent.status, reason.trim());
      setPosts(prev => prev.map(post => post.id === updated.id ? { ...(updated as BlogRow), creators: reviewIntent.post.creators } : post));
      setReviewIntent(null);
      setSuccess(reviewIntent.status === "published" ? "Blog post published." : reviewIntent.status === "draft" ? "Blog post returned to draft." : "Blog post rejected.");
      void load();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to review blog post."));
    } finally {
      setProcessingId(null);
    }
  };

  const remove = async (post: BlogRow) => {
    if (processingId) return;
    setProcessingId(post.id); setErr(""); setSuccess("");
    try {
      await deleteBlogPost(post.id);
      setSuccess("Blog post deleted.");
      await load();
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to delete blog post."));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout eyebrow="Blog" title="Moderation queue">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map(item => <button key={item} onClick={() => setFilter(item)} className={`min-h-10 shrink-0 rounded-full px-3 py-1.5 text-xs border transition ${filter === item ? "bg-[#FFD600] text-[#050505] border-[#FFD600]" : "border-white/10 text-white/65 hover:text-white hover:bg-[#FFD600]/10"}`}>{statusLabel(item)}</button>)}
        </div>
        <button onClick={() => setEditing({ ...blank })} className="min-h-11 rounded-full btn-primary px-4 py-2 text-sm font-medium">+ New draft</button>
      </div>
      {err && <div className="mb-4 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
      {success && <div className="mb-4 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#FFD600]">{success}</div>}
      {loading && <div className="mb-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading posts...</div>}

      <div className="grid gap-3 lg:hidden">
        {!loading && visiblePosts.map(post => <BlogCard key={post.id} post={post} disabled={processingId === post.id} onEdit={() => edit(post)} onReview={status => review(post, status)} onDelete={() => remove(post)} />)}
      </div>

      <div className="card-premium hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-[#CFCFCF]/80"><tr><th className="px-5 py-4">Title</th><th className="px-5 py-4">Creator</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody>
              {!loading && visiblePosts.map(post => <BlogTableRow key={post.id} post={post} disabled={processingId === post.id} onEdit={() => edit(post)} onReview={status => review(post, status)} onDelete={() => remove(post)} />)}
              {!loading && visiblePosts.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-[#CFCFCF]">No blog posts in this queue.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && visiblePosts.length === 0 && <div className="mt-3 card-premium p-8 text-center text-[#CFCFCF] lg:hidden">No blog posts in this queue.</div>}

      {reviewIntent && (
        <ReviewModal
          title={reviewIntent.status === "published" ? "Publish blog post" : reviewIntent.status === "draft" ? "Return blog post to draft" : "Reject blog post"}
          description={reviewIntent.status === "rejected" ? "The reason will be visible to the creator." : reviewIntent.status === "draft" ? "The post will leave public results and become creator-editable." : "The post will become public after the database transition succeeds."}
          requireReason={reviewIntent.status === "rejected"}
          reason={reason}
          onReason={setReason}
          loading={processingId === reviewIntent.post.id}
          onCancel={() => setReviewIntent(null)}
          onConfirm={confirmReview}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditing(null)} />
          <form onSubmit={save} className="relative w-full max-w-2xl glass-modal p-5 sm:p-7 space-y-4 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-medium tracking-normal">{editing.id ? "Edit blog draft" : "New blog draft"}</h3>
            <Field label="Title" value={editing.title} onChange={v => setEditing({ ...editing, title: v })} required disabled={saving} />
            <Field label="Slug (optional)" value={editing.slug} onChange={v => setEditing({ ...editing, slug: v })} disabled={saving} />
            <Field label="Category" value={editing.category} onChange={v => setEditing({ ...editing, category: v })} required disabled={saving} />
            <Textarea label="Excerpt" rows={2} value={editing.excerpt} onChange={v => setEditing({ ...editing, excerpt: v })} disabled={saving} />
            <Textarea label="Content" rows={6} value={editing.body} onChange={v => setEditing({ ...editing, body: v })} disabled={saving} />
            <label className="block"><span className="text-xs text-[#CFCFCF]">Author / Creator</span><select disabled={saving} value={editing.creatorSlug || ""} onChange={e => setEditing({ ...editing, creatorSlug: e.target.value })} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm"><option value="" className="bg-black">Make Better</option>{creators.map(c => <option key={c.slug} value={c.slug} className="bg-black">{c.brand_name}</option>)}</select></label>
            <p className="text-xs text-[#CFCFCF]/80">Admin edits save as draft. Publishing and rejection must use the trusted moderation actions.</p>
            <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row"><button type="button" disabled={saving} onClick={() => setEditing(null)} className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-sm disabled:opacity-50">Cancel</button><button disabled={saving} className="min-h-11 rounded-full btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save draft"}</button></div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}

function BlogCard({ post, disabled, onEdit, onReview, onDelete }: { post: BlogRow; disabled: boolean; onEdit: () => void; onReview: (status: "published" | "rejected" | "draft") => void; onDelete: () => void }) {
  return <div className="card-premium p-4"><div className="text-xs uppercase tracking-[0.14em] text-[#CFCFCF]/70">{post.creators?.brand_name || "Make Better"} • {post.category || "Uncategorized"}</div><h3 className="mt-1 text-lg font-medium">{post.title}</h3>{post.rejection_reason && <p className="mt-2 text-sm text-[#CFCFCF]">Reason: {post.rejection_reason}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><Badge status={post.status} /><Actions post={post} disabled={disabled} onEdit={onEdit} onReview={onReview} onDelete={onDelete} /></div></div>;
}
function BlogTableRow({ post, disabled, onEdit, onReview, onDelete }: { post: BlogRow; disabled: boolean; onEdit: () => void; onReview: (status: "published" | "rejected" | "draft") => void; onDelete: () => void }) {
  return <tr className="border-t border-white/5 align-top"><td className="px-5 py-4 text-white"><div className="font-medium">{post.title}</div>{post.rejection_reason && <div className="mt-1 text-xs text-[#CFCFCF]/80">Reason: {post.rejection_reason}</div>}</td><td className="px-5 py-4 text-white/65">{post.creators?.brand_name || "Make Better"}</td><td className="px-5 py-4 text-white/65">{post.category || "—"}</td><td className="px-5 py-4"><Badge status={post.status} /></td><td className="px-5 py-4 text-[#CFCFCF] text-xs">{post.submitted_at ? new Date(post.submitted_at).toLocaleDateString() : "—"}</td><td className="px-5 py-4 text-right text-xs space-x-2 whitespace-nowrap"><Actions post={post} disabled={disabled} onEdit={onEdit} onReview={onReview} onDelete={onDelete} /></td></tr>;
}
function Actions({ post, disabled, onEdit, onReview, onDelete }: { post: BlogRow; disabled: boolean; onEdit: () => void; onReview: (status: "published" | "rejected" | "draft") => void; onDelete: () => void }) {
  return <><a href={`/admin/blog/${post.id}/preview`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-white/10 px-3 text-xs text-[#FFD600]">Preview</a>{(post.status === "draft" || post.status === "rejected") && <button disabled={disabled} onClick={onEdit} className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-[#CFCFCF] disabled:opacity-50">Edit</button>}{post.status === "pending_review" && <button disabled={disabled} onClick={() => onReview("published")} className="min-h-9 rounded-full border border-[#FFD600]/40 px-3 text-xs text-[#FFD600] disabled:opacity-50">Publish</button>}{post.status === "pending_review" && <button disabled={disabled} onClick={() => onReview("rejected")} className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-[#CFCFCF] disabled:opacity-50">Reject</button>}{(post.status === "published" || post.status === "pending_review") && <button disabled={disabled} onClick={() => onReview("draft")} className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-[#CFCFCF] disabled:opacity-50">Return to draft</button>}<button disabled={disabled} onClick={onDelete} className="min-h-9 rounded-full border border-white/10 px-3 text-xs text-[#CFCFCF] disabled:opacity-50">Delete</button></>;
}
function Badge({ status }: { status: PublishStatus }) { return <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-[#CFCFCF]">{status.replace("_", " ")}</span>; }
function statusLabel(status: PublishStatus | "all") { return status === "all" ? "All" : status.replace("_", " "); }

type TextInputProps = { label: string; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean };
type TextareaInputProps = TextInputProps & { rows?: number };
function Field({ label, value, onChange, required, disabled }: TextInputProps) { return <label className="block"><span className="text-xs text-[#CFCFCF]">{label}{required && <span className="text-white/30"> *</span>}</span><input required={required} disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm disabled:opacity-60" /></label>; }
function Textarea({ label, value, onChange, rows = 3, disabled }: TextareaInputProps) { return <label className="block"><span className="text-xs text-[#CFCFCF]">{label}</span><textarea disabled={disabled} value={value} rows={rows} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm disabled:opacity-60" /></label>; }

function ReviewModal({ title, description, requireReason, reason, onReason, loading, onCancel, onConfirm }: { title: string; description: string; requireReason: boolean; reason: string; onReason: (value: string) => void; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center sm:p-4"><div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={loading ? undefined : onCancel} /><div className="relative w-full max-w-lg glass-modal p-5 sm:p-7"><h3 className="text-xl font-medium">{title}</h3><p className="mt-2 text-sm text-[#CFCFCF]">{description}</p>{requireReason && <label className="mt-4 block"><span className="text-xs text-[#CFCFCF]">Rejection reason</span><textarea autoFocus rows={4} value={reason} onChange={e => onReason(e.target.value)} disabled={loading} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm disabled:opacity-60" /></label>}<div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row"><button type="button" disabled={loading} onClick={onCancel} className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-sm disabled:opacity-50">Cancel</button><button type="button" disabled={loading || (requireReason && !reason.trim())} onClick={onConfirm} className="min-h-11 rounded-full btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50">{loading ? "Saving..." : "Confirm"}</button></div></div></div>;
}
