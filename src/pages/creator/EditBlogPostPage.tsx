import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { ArrowLeft } from "lucide-react";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { getCurrentCreatorForSubmission } from "@/services/creators";
import { getCreatorBlogPostBySlug, submitBlogPostForReview, updateBlogPost, createBlogPost } from "@/services/content";
import type { Tables } from "@/types/database";

type FormState = { title: string; slug: string; category: string; excerpt: string; body: string };
const blank: FormState = { title: "", slug: "", category: "Strategy", excerpt: "", body: "" };

export default function EditBlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Tables<"creators"> | null>(null);
  const [post, setPost] = useState<Tables<"blog_posts"> | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [loading, setLoading] = useState(Boolean(slug));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setErr("");
      try {
        const currentCreator = await getCurrentCreatorForSubmission();
        if (!cancelled) setCreator(currentCreator);
        if (!slug) return;
        const row = await getCreatorBlogPostBySlug(slug);
        if (!row || row.creator_id !== currentCreator.id) { if (!cancelled) setNotFound(true); return; }
        if (!cancelled) {
          setPost(row);
          setForm({ title: row.title, slug: row.slug, category: row.category || "Strategy", excerpt: row.excerpt || "", body: row.body || "" });
        }
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load this blog draft."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const editable = !post || post.status === "draft" || post.status === "rejected";

  const saveDraft = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!creator) return;
    if (!editable) { setErr("Pending-review and published posts cannot be edited. Ask an admin to return it to draft first."); return; }
    if (!form.title.trim()) { setErr("Add a title before saving."); return; }
    setSaving(true); setErr(""); setSuccess("");
    try {
      const cleanSlug = (form.slug || form.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const payload = { slug: cleanSlug, title: form.title.trim(), excerpt: form.excerpt.trim() || null, category: form.category.trim() || null, body: form.body.trim() || null };
      const saved = post ? await updateBlogPost(post.id, payload) : await createBlogPost(payload);
      setPost(saved);
      setForm(current => ({ ...current, slug: saved.slug }));
      setSuccess("Draft saved.");
      return saved;
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to save this blog draft."));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!creator) return;
    if (!editable) { setErr("Only draft or rejected posts can be submitted for review."); return; }
    setSubmitting(true); setErr(""); setSuccess("");
    try {
      const saved = post || await saveDraft();
      if (!saved) return;
      const submitted = await submitBlogPostForReview(saved.id);
      setPost(submitted);
      setSuccess("Blog post submitted for review.");
      window.setTimeout(() => navigate("/creator-dashboard"), 1000);
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to submit this blog post for review."));
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) return <Navigate to="/creator-dashboard" replace />;

  return (
    <SiteLayout>
      <section className="container-mb max-w-3xl pt-10 sm:pt-14 pb-20 sm:pb-24">
        <Link to="/creator-dashboard" className="inline-flex items-center gap-2 text-sm text-[#CFCFCF] hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
        <div className="mt-6 card-premium p-5 sm:p-7">
          <div className="eyebrow">Creator blog</div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-medium tracking-normal">{post ? "Edit blog draft" : "New blog draft"}</h1>
          {post?.status === "rejected" && post.rejection_reason && <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[#CFCFCF]">Rejection reason: {post.rejection_reason}</div>}
          {post && !editable && <div className="mt-4 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#CFCFCF]">This post is {post.status.replace("_", " ")} and cannot be edited unless an admin returns it to draft.</div>}
          {err && <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
          {success && <div className="mt-4 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#FFD600]">{success}</div>}
          {loading ? <div className="mt-6 text-[#CFCFCF]">Loading...</div> : (
            <form onSubmit={saveDraft} className="mt-6 space-y-4">
              <Field label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} disabled={!editable || saving || submitting} required />
              <Field label="Slug" value={form.slug} onChange={v => setForm({ ...form, slug: v })} disabled={!editable || saving || submitting} />
              <Field label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} disabled={!editable || saving || submitting} />
              <Textarea label="Excerpt" rows={3} value={form.excerpt} onChange={v => setForm({ ...form, excerpt: v })} disabled={!editable || saving || submitting} />
              <Textarea label="Post content" rows={10} value={form.body} onChange={v => setForm({ ...form, body: v })} disabled={!editable || saving || submitting} />
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="submit" disabled={!editable || saving || submitting} className="min-h-11 rounded-full border border-white/10 px-5 py-2 text-sm disabled:opacity-50">{saving ? "Saving..." : "Save draft"}</button>
                <button type="button" disabled={!editable || saving || submitting} onClick={submitForReview} className="min-h-11 rounded-full btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50">{submitting ? "Submitting..." : post?.status === "rejected" ? "Resubmit for review" : "Submit for review"}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

type FieldProps = { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; required?: boolean };
function Field({ label, value, onChange, disabled, required }: FieldProps) {
  return <label className="block"><span className="text-xs text-[#CFCFCF]">{label}{required && <span className="text-white/30"> *</span>}</span><input required={required} disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm disabled:opacity-60" /></label>;
}
function Textarea({ label, value, onChange, disabled, rows = 3 }: FieldProps & { rows?: number }) {
  return <label className="block"><span className="text-xs text-[#CFCFCF]">{label}</span><textarea disabled={disabled} value={value} rows={rows} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm disabled:opacity-60" /></label>;
}
