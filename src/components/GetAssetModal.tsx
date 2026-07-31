import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useStore } from "@/store/store";
import type { Asset } from "@/data/marketplace";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { claimFreeAssetSecure, requestPaidAssetAccessBySlug, sendFreeClaimMagicLink } from "@/services/assets";
import { trackMarketplaceEvent } from "@/lib/analytics";

type Step = "form" | "sending" | "sent" | "claiming" | "checkout" | "success" | "already";
const RESEND_SECONDS = 60;

export default function GetAssetModal({ asset, assetId, open, onClose }: { asset: Asset; assetId: string; open: boolean; onClose: () => void }) {
  const { user } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const isPaid = asset.price > 0;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (!open) return null;

  const submit = async (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    setErr("");
    try {
      if (isPaid) {
        setStep("sending");
        await requestPaidAssetAccessBySlug({ slug: asset.slug, name: form.name, email: form.email, phone: form.phone, userId: user?.id });
        setStep("checkout");
      } else if (user) {
        setStep("claiming");
        trackMarketplaceEvent("free_claim_started", assetId, { signed_in: true });
        const result = await claimFreeAssetSecure(assetId);
        setStep(result.outcome === "already_claimed" ? "already" : "success");
      } else {
        if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
          setErr("Enter a valid email address.");
          setStep("form");
          return;
        }
        setStep("sending");
        trackMarketplaceEvent("free_claim_started", assetId, { signed_in: false });
        await sendFreeClaimMagicLink(form.email, assetId);
        setCooldown(RESEND_SECONDS);
        setStep("sent");
      }
    } catch (error) {
      setErr(explainSupabaseError(error, "Temporary server or network error. Please try again."));
      setStep("form");
    }
  };

  const busy = step === "sending" || step === "claiming";
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="claim-title" className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md glass-modal max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-5 sm:p-7">
        <button aria-label="Close" onClick={onClose} className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full text-[#CFCFCF] hover:bg-[#FFD600]/10"><X className="h-4 w-4" /></button>

        {(step === "success" || step === "already" || step === "checkout") ? (
          <div className="text-center py-4" aria-live="polite">
            <div className="mx-auto h-12 w-12 rounded-full border border-white/10 bg-[#0E0E0E]/70 flex items-center justify-center mb-4">✓</div>
            <h3 id="claim-title" className="text-2xl font-medium">{isPaid ? "Checkout is almost ready" : step === "already" ? "Already in your assets" : "Asset claimed"}</h3>
            <p className="mt-2 text-sm text-[#CFCFCF]">{isPaid ? `Your purchase intent for ${asset.title} is saved. Secure Stripe checkout is coming soon — no payment has been taken.` : "The server confirmed this asset is saved to your account."}</p>
            <>{isPaid && <button disabled className="mt-6 min-h-12 w-full rounded-full border border-white/15 bg-white/5 py-3 text-sm font-medium text-white/45 cursor-not-allowed">Payments are coming soon</button>}<button onClick={() => { onClose(); navigate(isPaid ? "/assets" : "/my-assets"); }} className="mt-3 min-h-12 w-full rounded-full btn-primary py-3 text-sm font-medium">{isPaid ? "Browse assets" : "Open My Assets"}</button></>
          </div>
        ) : step === "sent" ? (
          <div className="py-4" aria-live="polite">
            <h3 id="claim-title" className="text-2xl font-medium">Check your email</h3>
            <p className="mt-3 text-sm text-[#CFCFCF]">We sent a secure sign-in link to <strong className="text-white">{form.email}</strong>. Open it to finish claiming {asset.title}.</p>
            {err && <p role="alert" className="mt-4 text-sm text-[#CFCFCF]">{err}</p>}
            <button disabled={cooldown > 0} onClick={submit} className="mt-6 min-h-11 w-full rounded-full btn-primary disabled:opacity-50">{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}</button>
          </div>
        ) : (
          <>
            <div className="text-xs uppercase tracking-[0.18em] text-[#CFCFCF]">{isPaid ? "Purchase intent" : "Free asset"}</div>
            <h3 id="claim-title" className="mt-2 pr-10 text-xl sm:text-2xl font-medium">{asset.title}</h3>
            <p className="mt-2 text-sm text-[#CFCFCF]">{isPaid ? "Enter your details to reserve checkout. We will notify you when secure payments open." : user ? "Claim this free asset securely to your account." : "Enter only your email. We'll send a secure link to verify it and finish your claim."}</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {isPaid && <Field label="Full name" value={form.name} onChange={name => setForm({ ...form, name })} required />}
              {!user && <Field label="Email" type="email" value={form.email} onChange={email => setForm({ ...form, email })} required />}
              {isPaid && <Field label="Phone" type="tel" value={form.phone} onChange={phone => setForm({ ...form, phone })} />}
              {err && <p role="alert" className="text-sm text-[#CFCFCF]">{err}</p>}
              <button disabled={busy || (!isPaid && !assetId)} type="submit" className="w-full rounded-full btn-primary py-3 text-sm font-medium disabled:opacity-50">{step === "sending" ? (isPaid ? "Saving purchase intent..." : "Sending secure link...") : step === "claiming" ? "Claiming..." : isPaid ? "Continue to checkout" : user ? "Claim free asset" : "Email me a secure link"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="block"><span className="text-xs text-[#CFCFCF]">{label}</span><input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70" /></label>;
}
