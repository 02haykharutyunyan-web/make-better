import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { useStore } from "@/store/store";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function CreatorSignupPage() {
  const { signupCreator } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", brand: "", bio: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await signupCreator(form);
      if (!u) { setErr("Account created. Confirm your email, then sign in."); return; }
      navigate("/creator-dashboard");
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to create creator account."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="container-mb pt-12 sm:pt-16 pb-20 sm:pb-24 grid min-w-0 gap-10 sm:gap-14 lg:grid-cols-[1.05fr_minmax(0,1fr)] items-start">
        <div>
          <div className="eyebrow">Become a creator</div>
          <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-normal leading-[1.06]">
            Apply to become a Make Better creator.
          </h1>
          <p className="mt-5 text-[#CFCFCF] text-base sm:text-lg max-w-xl leading-relaxed">
            Submit your application for admin review. You can sign in and track status while pending; asset and blog submissions unlock after approval.
          </p>
          <ul className="mt-10 grid gap-3 text-white/75">
            {["Application starts pending","Admin review before submissions","Assets and blogs still require review","Paid listings are not automatic"].map(b => (
              <li key={b} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFD600]" /> {b}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="card-premium p-5 sm:p-8 md:p-10 space-y-4">
          <h2 className="text-2xl font-medium tracking-normal">Creator application</h2>
          <Field label="Full name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
          <Field label="Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} required />
          <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <Field label="Creator / Brand name" value={form.brand} onChange={v => setForm({ ...form, brand: v })} required />
          <label className="block">
            <span className="text-xs text-[#CFCFCF]">Short bio</span>
            <textarea
              required value={form.bio} rows={3}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70"
            />
          </label>
          {err && <p className="text-xs text-[#CFCFCF]">{err}</p>}
          <button disabled={loading} className="min-h-12 w-full rounded-full btn-primary py-3 text-sm font-medium transition disabled:opacity-50">
            {loading ? "Creating..." : "Submit creator application"}
          </button>
        </form>
      </section>
    </SiteLayout>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-[#CFCFCF]">{label}{required && <span className="text-white/30"> *</span>}</span>
      <input required={required} type={type} value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70" />
    </label>
  );
}
