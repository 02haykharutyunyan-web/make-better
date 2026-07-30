import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { supabase } from "@/lib/supabase/client";
import { authCallbackError, callbackAssetId } from "@/lib/free-claim";
import { claimFreeAssetSecure } from "@/services/assets";

type State = "processing" | "success" | "already" | "invalid" | "expired" | "auth" | "not_found" | "not_published" | "not_free" | "error";

function claimFailure(message: string): State {
  if (message.includes("ASSET_NOT_FOUND")) return "not_found";
  if (message.includes("ASSET_NOT_PUBLISHED")) return "not_published";
  if (message.includes("ASSET_NOT_FREE")) return "not_free";
  if (message.includes("AUTHENTICATION_REQUIRED")) return "auth";
  return "error";
}

const copy: Record<State, { title: string; body: string }> = {
  processing: { title: "Finishing your claim", body: "Verifying your email and securely attaching the asset to your account…" },
  success: { title: "Asset claimed", body: "Your claim was confirmed and the asset is now available in My Assets." },
  already: { title: "Already claimed", body: "This asset is already safely attached to your account." },
  invalid: { title: "Invalid sign-in link", body: "This link is invalid or has already been used. Return to the asset and request a new link." },
  expired: { title: "Sign-in link expired", body: "For your security, this link can no longer be used. Return to the asset and request a new one." },
  auth: { title: "Authentication failed", body: "We could not verify the account that requested this claim. Please request a new link." },
  not_found: { title: "Asset not found", body: "The intended asset no longer exists." },
  not_published: { title: "Asset unavailable", body: "This asset is not currently approved and published, so it cannot be claimed." },
  not_free: { title: "This asset is not free", body: "Paid assets never use the free claim flow. No claim was created." },
  error: { title: "Unable to finish the claim", body: "A temporary server or network error occurred. Refresh to retry, or return to the asset later." },
};

export default function FreeClaimCallbackPage() {
  const location = useLocation();
  const [state, setState] = useState<State>("processing");

  useEffect(() => {
    let active = true;
    const run = async () => {
      const callbackError = authCallbackError(location.search, location.hash);
      if (callbackError) { setState(callbackError); return; }
      const assetId = callbackAssetId(location.search);
      if (!assetId) { setState("invalid"); return; }

      try {
        const code = new URLSearchParams(location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) { setState("auth"); return; }

        const result = await claimFreeAssetSecure(assetId);
        if (!active) return;
        window.history.replaceState({}, "", "/auth/free-claim");
        setState(result.outcome === "already_claimed" ? "already" : "success");
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setState(message.toLowerCase().includes("expired") ? "expired" : claimFailure(message));
      }
    };
    void run();
    return () => { active = false; };
  }, [location.hash, location.search]);

  const message = copy[state];
  return (
    <SiteLayout>
      <section className="container-mb pt-16 sm:pt-24 pb-24 max-w-2xl" aria-live="polite">
        <div className="card-premium p-7 sm:p-10 text-center">
          <div className="eyebrow">Free asset claim</div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-medium">{message.title}</h1>
          <p className="mt-4 text-[#CFCFCF]">{message.body}</p>
          {state !== "processing" && <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/assets" className="min-h-11 rounded-full border border-white/10 px-5 py-3 text-sm">Browse assets</Link>{(state === "success" || state === "already") && <Link to="/my-assets" className="min-h-11 rounded-full btn-primary px-5 py-3 text-sm font-medium">Open My Assets</Link>}</div>}
        </div>
      </section>
    </SiteLayout>
  );
}
