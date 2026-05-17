import { useState } from "react";
import SiteLayout from "@/components/layout/SiteLayout";
import { Check, Upload } from "lucide-react";

const benefits = [
  "SEO-ready asset pages",
  "Creator profiles",
  "Buyer discovery",
  "Reviews and downloads",
  "Stripe payments later",
];

export default function SubmitPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    title: "", productType: "Prompts", description: "", price: "", creator: "", email: "",
  });

  return (
    <SiteLayout>
      <section className="container-mb pt-16 md:pt-24 grid gap-14 lg:grid-cols-[1.1fr_1fr] items-start">
        <div>
          <div className="eyebrow">List your asset</div>
          <h1 className="mt-5 text-4xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.04]">
            What you already use to work faster can become a product.
          </h1>
          <p className="mt-5 text-white/60 text-lg max-w-xl">
            Package your prompt system, agent, workflow, or template and let buyers discover it on Make Better.
          </p>

          <div className="mt-10 grid gap-3">
            {benefits.map(b => (
              <div key={b} className="flex items-center gap-3 text-white/80">
                <span className="h-7 w-7 rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center"><Check className="h-3.5 w-3.5 text-emerald-300" /></span>
                {b}
              </div>
            ))}
          </div>
        </div>

        <div className="card-premium p-8 md:p-10">
          {submitted ? (
            <div className="text-center py-10">
              <div className="mx-auto h-12 w-12 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center mb-4">✓</div>
              <h3 className="text-2xl font-medium tracking-tight">Submitted for review</h3>
              <p className="mt-2 text-white/60">We'll email you within 48 hours with next steps.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-medium tracking-tight">Submit your asset</h2>
              <Field label="Asset title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />

              <label className="block">
                <span className="text-xs text-white/55">Product type</span>
                <select
                  value={form.productType}
                  onChange={e => setForm({ ...form, productType: e.target.value })}
                  className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30"
                >
                  {["Prompts", "AI Agents", "AI Assistants", "API Tools", "Workflows", "Templates", "Automation Assets", "Creator Resources"].map(t => (
                    <option key={t} className="bg-black">{t}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-white/55">Short description</span>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (USD, 0 = free)" value={form.price} onChange={v => setForm({ ...form, price: v })} type="number" />
                <Field label="Creator name" value={form.creator} onChange={v => setForm({ ...form, creator: v })} required />
              </div>
              <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />

              <div className="grid grid-cols-2 gap-3">
                <UploadField label="Preview image" />
                <UploadField label="Asset file" />
              </div>

              <button type="submit" className="w-full rounded-full bg-white text-black py-3 text-sm font-medium hover:bg-white/90 transition">
                Submit asset
              </button>
              <p className="text-[11px] text-white/40 text-center">Reviewed within 48h. We'll be in touch with payout setup.</p>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-white/55">{label}{required && <span className="text-white/30"> *</span>}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30 transition"
      />
    </label>
  );
}

function UploadField({ label }: { label: string }) {
  return (
    <label className="block">
      <span className="text-xs text-white/55">{label}</span>
      <div className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-5 text-sm text-white/55 cursor-pointer hover:border-white/30 hover:text-white transition">
        <Upload className="h-4 w-4" /> Upload
        <input type="file" className="hidden" />
      </div>
    </label>
  );
}
