import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { useStore } from "@/store/store";
import type { ProductType } from "@/data/marketplace";
import { ArrowLeft, Upload } from "lucide-react";
import { explainDeliverableError, explainSupabaseError } from "@/lib/supabase/errors";
import { getCurrentCreatorForSubmission } from "@/services/creators";
import {
  ASSET_DELIVERABLES_BUCKET,
  getAssetDeliverable,
  getCreatorAssetBySlug,
  updateAsset,
  submitAssetForReview,
  uploadAssetDeliverableFile,
  upsertAssetDeliverable,
} from "@/services/assets";
import type { DeliveryType, Tables } from "@/types/database";

const productTypes: ProductType[] = ["Prompts", "AI Agents", "AI Assistants", "API Tools", "Workflows", "Templates", "Automation Assets", "Creator Resources"];

type FormState = {
  title: string;
  productType: ProductType;
  description: string;
  fullDescription: string;
  tags: string;
  priceType: "free" | "paid";
  price: string;
  useCases: string;
  included: string;
  before: string;
  after: string;
  deliveryType: DeliveryType;
  externalUrl: string;
  textContent: string;
};

export default function EditAssetPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useStore();
  const [asset, setAsset] = useState<Tables<"assets"> | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [deliverable, setDeliverable] = useState<Tables<"asset_deliverables"> | null>(null);
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      setNotFound(false);
      try {
        const row = await getCreatorAssetBySlug(slug || "");
        if (!row || row.creators?.profile_id !== user?.id) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const delivery = await getAssetDeliverable(row.id);
        if (!cancelled) {
          setAsset(row);
          setDeliverable(delivery);
          setForm({
            title: row.title,
            productType: row.product_type as ProductType,
            description: row.short_description || "",
            fullDescription: row.long_description || "",
            tags: (row.tags || []).join(", "),
            priceType: row.price_type,
            price: String(Number(row.price || 0)),
            useCases: (row.use_cases || []).join("\n"),
            included: (row.included || []).join("\n"),
            before: (row.before || []).join("\n"),
            after: (row.after || []).join("\n"),
            deliveryType: delivery?.delivery_type || "file",
            externalUrl: delivery?.external_url || "",
            textContent: delivery?.text_content || "",
          });
        }
      } catch (error) {
        if (!cancelled) setErr(explainSupabaseError(error, "Unable to load this asset for editing."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (user) load();
    return () => { cancelled = true; };
  }, [slug, user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !form) return;
    setErr("");
    setSuccess("");
    setWarning("");
    setSaving(true);

    try {
      const creator = await getCurrentCreatorForSubmission();
      if (creator.id !== asset.creator_id) throw new Error("You can only edit assets that belong to your creator account.");

      const price = form.priceType === "paid" ? Number(form.price) || 0 : 0;
      if (!form.title.trim()) throw new Error("Add an asset title.");
      if (!form.description.trim()) throw new Error("Add a short description.");
      if (form.priceType === "paid" && price <= 0) throw new Error("Paid assets need a price greater than 0.");
      if (form.deliveryType === "file" && !deliverable?.storage_path && !deliverableFile) throw new Error("Upload a deliverable file before saving.");
      if (form.deliveryType === "external_link" && !form.externalUrl.trim()) throw new Error("Add the external delivery link before saving.");
      if (form.deliveryType === "text" && !form.textContent.trim()) throw new Error("Add the private text or prompt content before saving.");

      await updateAsset(asset.id, {
        title: form.title.trim(),
        product_type: form.productType,
        category: form.productType,
        short_description: form.description.trim(),
        long_description: form.fullDescription.trim() || null,
        tags: form.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        price,
        is_free: form.priceType === "free",
        price_type: form.priceType,
        status: "draft",
        rejection_reason: null,
        published_at: null,
        use_cases: lines(form.useCases),
        included: lines(form.included),
        before: lines(form.before),
        after: lines(form.after),
      });

      try {
        if (form.deliveryType === "file") {
          const storagePath = deliverableFile
            ? await uploadAssetDeliverableFile(creator.id, asset.id, deliverableFile)
            : deliverable?.storage_path;
          await upsertAssetDeliverable({
            asset_id: asset.id,
            delivery_type: "file",
            storage_bucket: ASSET_DELIVERABLES_BUCKET,
            storage_path: storagePath || "",
            file_name: deliverableFile?.name || deliverable?.file_name || "Deliverable file",
            file_size: deliverableFile?.size || deliverable?.file_size || null,
          });
        } else if (form.deliveryType === "external_link") {
          await upsertAssetDeliverable({
            asset_id: asset.id,
            delivery_type: "external_link",
            external_url: form.externalUrl.trim(),
          });
        } else {
          await upsertAssetDeliverable({
            asset_id: asset.id,
            delivery_type: "text",
            text_content: form.textContent,
          });
        }
      } catch (deliveryError) {
        setWarning(explainDeliverableError(deliveryError));
      }

      await submitAssetForReview(asset.id);
      setSuccess("Asset saved and returned to review.");
      window.setTimeout(() => navigate("/creator-dashboard"), 1400);
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to save this asset."));
    } finally {
      setSaving(false);
    }
  };

  if (notFound) return <Navigate to="/creator-dashboard" replace />;

  return (
    <SiteLayout>
      <section className="container-mb pt-12 sm:pt-16 pb-20 sm:pb-24 max-w-3xl mx-auto">
        <Link to="/creator-dashboard" className="inline-flex items-center gap-2 text-sm text-[#CFCFCF] hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="eyebrow mt-8">Edit asset</div>
        <h1 className="mt-5 text-3xl sm:text-4xl font-medium tracking-normal">Update your submission</h1>
        <p className="mt-3 text-[#CFCFCF]">Saving changes returns the asset to admin review before it appears publicly again.</p>

        {loading && <div className="mt-8 card-premium p-6 text-[#CFCFCF]">Loading asset...</div>}
        {err && <div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
        {success && <div className="mt-6 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#CFCFCF]">{success}</div>}
        {warning && <div className="mt-6 rounded-xl border border-[#FFD600]/20 bg-[#FFD600]/10 p-4 text-sm text-[#CFCFCF]">{warning}</div>}

        {form && (
          <form onSubmit={save} className="mt-8 sm:mt-10 card-premium p-5 sm:p-8 space-y-5">
            <Field label="Asset title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />
            <label className="block">
              <span className="text-xs text-[#CFCFCF]">Product type</span>
              <select value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value as ProductType })} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70">
                {productTypes.map(t => <option key={t} className="bg-black">{t}</option>)}
              </select>
            </label>
            <Textarea label="Short description" rows={2} value={form.description} onChange={v => setForm({ ...form, description: v })} required />
            <Textarea label="Full description" rows={5} value={form.fullDescription} onChange={v => setForm({ ...form, fullDescription: v })} />
            <Field label="Tags (comma separated)" value={form.tags} onChange={v => setForm({ ...form, tags: v })} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-[#CFCFCF]">Price type</span>
                <select value={form.priceType} onChange={e => setForm({ ...form, priceType: e.target.value as "free" | "paid" })} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70">
                  <option className="bg-black" value="free">Free</option>
                  <option className="bg-black" value="paid">Paid</option>
                </select>
              </label>
              {form.priceType === "paid" && <Field label="Price (USD)" type="number" value={form.price} onChange={v => setForm({ ...form, price: v })} />}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0E0E0E]/70 p-5 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">Private delivery</div>
                <p className="mt-1 text-sm text-[#CFCFCF]">Only approved buyers who claim this asset can access this.</p>
              </div>
              <label className="block">
                <span className="text-xs text-[#CFCFCF]">Delivery type</span>
                <select value={form.deliveryType} onChange={e => setForm({ ...form, deliveryType: e.target.value as DeliveryType })} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70">
                  <option className="bg-black" value="file">Upload file</option>
                  <option className="bg-black" value="external_link">External delivery link</option>
                  <option className="bg-black" value="text">Text / prompt content</option>
                </select>
              </label>
              {form.deliveryType === "file" && <UploadField file={deliverableFile} existingName={deliverable?.file_name} onChange={setDeliverableFile} />}
              {form.deliveryType === "external_link" && <Field label="Delivery link" type="url" value={form.externalUrl} onChange={v => setForm({ ...form, externalUrl: v })} required />}
              {form.deliveryType === "text" && <Textarea label="Private text / prompt / template content" rows={7} value={form.textContent} onChange={v => setForm({ ...form, textContent: v })} required />}
            </div>

            <Textarea label="Use cases (one per line)" rows={3} value={form.useCases} onChange={v => setForm({ ...form, useCases: v })} />
            <Textarea label="What's included (one per line)" rows={3} value={form.included} onChange={v => setForm({ ...form, included: v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Textarea label="Before (one per line)" rows={3} value={form.before} onChange={v => setForm({ ...form, before: v })} />
              <Textarea label="After (one per line)" rows={3} value={form.after} onChange={v => setForm({ ...form, after: v })} />
            </div>

            <button disabled={saving} className="min-h-12 w-full rounded-full btn-primary py-3 text-sm font-medium transition disabled:opacity-50">
              {saving ? "Saving..." : "Save and return to review"}
            </button>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}

function lines(value: string) {
  return value.split("\n").map(item => item.trim()).filter(Boolean);
}

type TextInputProps = { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string };
type TextareaInputProps = Omit<TextInputProps, "type"> & { rows?: number };

function Field({ label, value, onChange, required, type = "text" }: TextInputProps) {
  return (
    <label className="block">
      <span className="text-xs text-[#CFCFCF]">{label}{required && <span className="text-white/30"> *</span>}</span>
      <input required={required} type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70" />
    </label>
  );
}

function Textarea({ label, value, onChange, required, rows = 3 }: TextareaInputProps) {
  return (
    <label className="block">
      <span className="text-xs text-[#CFCFCF]">{label}{required && <span className="text-white/30"> *</span>}</span>
      <textarea required={required} value={value} rows={rows} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70" />
    </label>
  );
}

function UploadField({ file, existingName, onChange }: { file: File | null; existingName?: string | null; onChange: (file: File | null) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-[#CFCFCF]">Asset file</span>
      <div className="mt-1 flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-[#0E0E0E]/70 px-3 py-5 text-sm text-[#CFCFCF] cursor-pointer hover:border-[#FFD600]/60 hover:text-white transition">
        <Upload className="h-4 w-4" /> {file?.name || existingName || "Upload file"}
        <input type="file" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
      </div>
      <p className="mt-2 text-xs text-white/35">Max 50 MB. Executable/script files are blocked.</p>
    </label>
  );
}
