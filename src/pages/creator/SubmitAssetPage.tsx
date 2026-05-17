import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { useStore } from "@/store/store";
import { ProductType } from "@/data/marketplace";
import { Upload } from "lucide-react";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { getCurrentCreatorForSubmission } from "@/services/creators";
import {
  ASSET_DELIVERABLES_BUCKET,
  submitAsset as submitAssetToSupabase,
  uploadAssetDeliverableFile,
  upsertAssetDeliverable,
} from "@/services/assets";
import type { DeliveryType } from "@/types/database";

const productTypes: ProductType[] = ["Prompts","AI Agents","AI Assistants","API Tools","Workflows","Templates","Automation Assets","Creator Resources"];

export default function SubmitAssetPage() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", productType: "Prompts" as ProductType, description: "", fullDescription: "",
    tags: "", priceType: "free" as "free" | "paid", price: "",
    useCases: "", included: "", before: "", after: "",
    deliveryType: "file" as DeliveryType,
    externalUrl: "",
    textContent: "",
  });
  const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (!user) throw new Error("Sign in as a creator before submitting an asset.");
      const creator = await getCurrentCreatorForSubmission();

      const price = form.priceType === "paid" ? Number(form.price) || 0 : 0;
      if (form.priceType === "paid" && price <= 0) throw new Error("Paid assets need a price greater than 0.");

      const baseSlug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset";
      if (form.deliveryType === "file" && !deliverableFile) throw new Error("Upload a deliverable file before submitting.");
      if (form.deliveryType === "external_link" && !form.externalUrl.trim()) throw new Error("Add the external delivery link before submitting.");
      if (form.deliveryType === "text" && !form.textContent.trim()) throw new Error("Add the private text or prompt content before submitting.");

      const asset = await submitAssetToSupabase({
        creator_id: creator.id,
        slug: `${baseSlug}-${Date.now().toString(36)}`,
        title: form.title,
        product_type: form.productType,
        category: form.productType,
        short_description: form.description,
        long_description: form.fullDescription,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        price,
        is_free: form.priceType === "free",
        price_type: form.priceType,
        status: "pending_review",
        use_cases: form.useCases.split("\n").map(t => t.trim()).filter(Boolean),
        included: form.included.split("\n").map(t => t.trim()).filter(Boolean),
        before: form.before.split("\n").map(t => t.trim()).filter(Boolean),
        after: form.after.split("\n").map(t => t.trim()).filter(Boolean),
      });

      if (form.deliveryType === "file" && deliverableFile) {
        const storagePath = await uploadAssetDeliverableFile(creator.id, asset.id, deliverableFile);
        await upsertAssetDeliverable({
          asset_id: asset.id,
          delivery_type: "file",
          storage_bucket: ASSET_DELIVERABLES_BUCKET,
          storage_path: storagePath,
          file_name: deliverableFile.name,
          file_size: deliverableFile.size,
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

      setDone(true);
      setTimeout(() => navigate("/creator-dashboard"), 1200);
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to submit this asset."));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SiteLayout>
        <section className="container-mb pt-20 sm:pt-24 pb-20 sm:pb-24 max-w-md mx-auto text-center">
          <div className="mx-auto h-12 w-12 rounded-full border border-[#1E293B] bg-[#111827]/70 flex items-center justify-center mb-4">✓</div>
          <h1 className="text-3xl font-medium tracking-tight">Submitted for review</h1>
          <p className="mt-3 text-[#94A3B8]">Our team will review your asset within 48 hours.</p>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="container-mb pt-12 sm:pt-16 pb-20 sm:pb-24 max-w-3xl mx-auto">
        <div className="eyebrow">Submit asset</div>
        <h1 className="mt-5 text-3xl sm:text-4xl font-medium tracking-[-0.04em]">New asset submission</h1>
        <p className="mt-3 text-[#94A3B8]">Fill in the details below. Your asset will be submitted for review.</p>

        <form onSubmit={submit} className="mt-8 sm:mt-10 card-premium p-5 sm:p-8 space-y-5">
          <Field label="Asset title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />

          <label className="block">
            <span className="text-xs text-[#94A3B8]">Product type</span>
            <select value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value as ProductType })}
              className="mt-1 w-full rounded-xl bg-[#111827]/75 border border-[#1E293B] px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#3B82F6]/70">
              {productTypes.map(t => <option key={t} className="bg-black">{t}</option>)}
            </select>
          </label>

          <Textarea label="Short description" rows={2} value={form.description} onChange={v => setForm({ ...form, description: v })} required />
          <Textarea label="Full description" rows={5} value={form.fullDescription} onChange={v => setForm({ ...form, fullDescription: v })} />
          <Field label="Tags (comma separated)" value={form.tags} onChange={v => setForm({ ...form, tags: v })} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-[#94A3B8]">Price type</span>
              <select value={form.priceType} onChange={e => setForm({ ...form, priceType: e.target.value as "free" | "paid" })}
                className="mt-1 w-full rounded-xl bg-[#111827]/75 border border-[#1E293B] px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#3B82F6]/70">
                <option className="bg-black" value="free">Free</option>
                <option className="bg-black" value="paid">Paid</option>
              </select>
            </label>
            {form.priceType === "paid" && (
              <Field label="Price (USD)" type="number" value={form.price} onChange={v => setForm({ ...form, price: v })} />
            )}
          </div>

          <div className="rounded-2xl border border-[#1E293B] bg-[#0B1020]/70 p-5 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[#94A3B8]/70">Private delivery</div>
              <p className="mt-1 text-sm text-[#94A3B8]">Only approved buyers who claim this asset can access this.</p>
            </div>
            <label className="block">
              <span className="text-xs text-[#94A3B8]">Delivery type</span>
              <select value={form.deliveryType} onChange={e => setForm({ ...form, deliveryType: e.target.value as DeliveryType })}
                className="mt-1 w-full rounded-xl bg-[#111827]/75 border border-[#1E293B] px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#3B82F6]/70">
                <option className="bg-black" value="file">Upload file</option>
                <option className="bg-black" value="external_link">External delivery link</option>
                <option className="bg-black" value="text">Text / prompt content</option>
              </select>
            </label>

            {form.deliveryType === "file" && (
              <UploadField label="Asset file" file={deliverableFile} onChange={setDeliverableFile} />
            )}
            {form.deliveryType === "external_link" && (
              <Field label="Delivery link" type="url" value={form.externalUrl} onChange={v => setForm({ ...form, externalUrl: v })} required />
            )}
            {form.deliveryType === "text" && (
              <Textarea label="Private text / prompt / template content" rows={7} value={form.textContent} onChange={v => setForm({ ...form, textContent: v })} required />
            )}
          </div>

          <Textarea label="Use cases (one per line)" rows={3} value={form.useCases} onChange={v => setForm({ ...form, useCases: v })} />
          <Textarea label="What's included (one per line)" rows={3} value={form.included} onChange={v => setForm({ ...form, included: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Textarea label="Before (one per line)" rows={3} value={form.before} onChange={v => setForm({ ...form, before: v })} />
            <Textarea label="After (one per line)" rows={3} value={form.after} onChange={v => setForm({ ...form, after: v })} />
          </div>

          {err && <p className="text-sm text-red-300">{err}</p>}
          <button disabled={loading} className="min-h-12 w-full rounded-full btn-primary py-3 text-sm font-medium transition disabled:opacity-50">
            {loading ? "Submitting..." : "Submit for review"}
          </button>
        </form>
      </section>
    </SiteLayout>
  );
}

function Field({ label, value, onChange, required, type = "text" }: any) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8]">{label}{required && <span className="text-white/30"> *</span>}</span>
      <input required={required} type={type} value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-[#111827]/75 border border-[#1E293B] px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#3B82F6]/70" />
    </label>
  );
}

function Textarea({ label, value, onChange, required, rows = 3 }: any) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8]">{label}{required && <span className="text-white/30"> *</span>}</span>
      <textarea required={required} value={value} rows={rows} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-[#111827]/75 border border-[#1E293B] px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#3B82F6]/70" />
    </label>
  );
}

function UploadField({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      <div className="mt-1 flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed border-[#1E293B] bg-[#0B1020]/70 px-3 py-5 text-sm text-[#94A3B8] cursor-pointer hover:border-[#3B82F6]/60 hover:text-white transition">
        <Upload className="h-4 w-4" /> {file ? file.name : "Upload file"}
        <input type="file" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
      </div>
      <p className="mt-2 text-xs text-white/35">Max 50 MB. Executable/script files are blocked.</p>
    </label>
  );
}
