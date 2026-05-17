import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useStore } from "@/store/store";
import { Asset } from "@/data/marketplace";
import { explainSupabaseError } from "@/lib/supabase/errors";
import type { SubmittedAsset } from "@/store/store";
import { requestPaidAssetAccessBySlug } from "@/services/assets";

export default function GetAssetModal({ asset, open, onClose }: { asset: Asset; open: boolean; onClose: () => void }) {
  const { user, signupBuyer, claimAsset, store } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", password: "", phone: user?.phone || "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;
  const isPaid = asset.price > 0;
  const submitted: SubmittedAsset = store.assets.find(a => a.slug === asset.slug) || {
    ...asset,
    id: asset.slug,
    status: "Published",
    isFree: asset.price === 0,
    priceType: asset.price === 0 ? "free" : "paid",
    submittedAt: new Date().toISOString(),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (isPaid) {
        await requestPaidAssetAccessBySlug({
          slug: asset.slug,
          name: form.name,
          email: form.email,
          phone: form.phone,
          userId: user?.id,
        });
        setStep("success");
        return;
      }

      if (!user) {
        const nextUser = await signupBuyer({ name: form.name, email: form.email, password: form.password, phone: form.phone });
        if (!nextUser) { setErr("Account created. Confirm your email, then sign in to claim this asset."); return; }
      }
      await claimAsset(submitted);
      setStep("success");
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to unlock this asset."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md card-premium p-7">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        {step === "form" ? (
          <>
            <div className="text-xs uppercase tracking-[0.18em] text-white/50">{isPaid ? "Request access" : "Unlock free asset"}</div>
            <h3 className="mt-2 text-2xl font-medium tracking-tight">{asset.title}</h3>
            <p className="mt-1 text-sm text-white/55">
              {isPaid ? `Paid purchases are coming soon. Join the access list and we'll contact you when this asset is available.` : "Free for everyone. Instant access after signup."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
              {!user && !isPaid && <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />}
              <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              {err && <p className="text-xs text-red-400">{err}</p>}

              <button disabled={loading} type="submit" className="mt-2 w-full rounded-full bg-white text-black py-3 text-sm font-medium hover:bg-white/90 transition disabled:opacity-50">
                {loading ? "Working..." : isPaid ? "Join waitlist" : "Unlock asset"}
              </button>
              <p className="text-[11px] text-white/40 text-center">By continuing you agree to our Terms and Privacy Policy.</p>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="mx-auto h-12 w-12 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center mb-4">✓</div>
            <h3 className="text-2xl font-medium tracking-tight">{isPaid ? "You're on the list." : "You're in."}</h3>
            <p className="mt-2 text-sm text-white/60">
              {isPaid ? "We'll contact you when paid access opens. No payment has been taken." : "Your free asset is unlocked and saved to My Assets."}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button onClick={onClose} className="rounded-full border border-white/15 bg-white/[0.04] py-3 text-sm font-medium hover:bg-white/[0.08] transition">
                Close
              </button>
              <button onClick={() => { onClose(); isPaid ? navigate("/assets") : navigate("/my-assets"); }} className="rounded-full bg-white text-black py-3 text-sm font-medium hover:bg-white/90 transition">
                {isPaid ? "Browse assets" : "My Assets"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
