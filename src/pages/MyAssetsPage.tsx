import { Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { useStore } from "@/store/store";
import { Download, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { createSignedDeliverableUrl, getClaimedAssetDelivery } from "@/services/assets";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function MyAssetsPage() {
  const { user, myClaims } = useStore();
  const [err, setErr] = useState("");
  const [loadingClaimId, setLoadingClaimId] = useState<string | null>(null);
  const [textDelivery, setTextDelivery] = useState<{ title: string; body: string } | null>(null);

  if (!user) {
    return (
      <SiteLayout>
        <section className="container-mb pt-20 pb-24 max-w-xl">
          <h1 className="text-4xl font-medium tracking-[-0.04em]">Sign in to see your assets</h1>
          <p className="mt-3 text-white/55">When you claim or purchase an asset, it appears here for instant access.</p>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium">Sign in</Link>
        </section>
      </SiteLayout>
    );
  }

  const claims = myClaims();

  const accessClaim = async (claim: (typeof claims)[number]) => {
    setErr("");
    if (!claim.asset) return;
    if (claim.status === "Pending payment") {
      setErr("This paid asset is waiting for Stripe checkout. Paid delivery is not enabled yet.");
      return;
    }

    setLoadingClaimId(claim.id);
    try {
      const delivery = await getClaimedAssetDelivery(claim.asset.id);

      if (delivery.delivery_type === "file") {
        if (!delivery.storage_path) throw new Error("This asset file is missing from storage.");
        const signedUrl = await createSignedDeliverableUrl(delivery.storage_path);
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      } else if (delivery.delivery_type === "external_link") {
        if (!delivery.external_url) throw new Error("This delivery link is missing.");
        window.open(delivery.external_url, "_blank", "noopener,noreferrer");
      } else {
        if (!delivery.text_content) throw new Error("This text delivery is empty.");
        setTextDelivery({ title: claim.asset.title, body: delivery.text_content });
      }
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to access this asset. Make sure it is claimed and approved."));
    } finally {
      setLoadingClaimId(null);
    }
  };

  return (
    <SiteLayout>
      <section className="container-mb pt-16 pb-24">
        <div className="eyebrow">My Assets</div>
        <h1 className="mt-5 text-4xl md:text-5xl font-medium tracking-[-0.04em]">Your library</h1>
        <p className="mt-3 text-white/55 max-w-lg">Assets you've unlocked or claimed live here. Paid items will be released once Stripe is connected.</p>
        {err && <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{err}</div>}

        {claims.length === 0 ? (
          <div className="mt-12 card-premium p-10 text-center">
            <p className="text-white/60">You haven't claimed anything yet.</p>
            <Link to="/assets" className="mt-5 inline-flex rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium">Browse assets</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-4">
            {claims.map(c => (
              <div key={c.id} className="card-premium p-6 flex items-center justify-between gap-6 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-white/40">{c.asset?.category}</div>
                  <h3 className="mt-1 text-xl font-medium tracking-tight">{c.asset?.title}</h3>
                  <div className="mt-2 text-sm text-white/55">Status: <span className="text-white">{c.status}</span></div>
                </div>
                <div className="flex items-center gap-3">
                  {c.asset && (
                    <Link to={`/asset/${c.asset.slug}`} className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1">
                      View <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  <button
                    disabled={c.status === "Pending payment"}
                    onClick={() => accessClaim(c)}
                    className="rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> {loadingClaimId === c.id ? "Opening..." : c.status === "Pending payment" ? "Awaiting Stripe" : "Access"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {textDelivery && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setTextDelivery(null)} />
            <div className="relative w-full max-w-2xl card-premium p-7 max-h-[85vh] overflow-y-auto">
              <h2 className="text-2xl font-medium tracking-tight">{textDelivery.title}</h2>
              <pre className="mt-5 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80 font-sans leading-relaxed">
                {textDelivery.body}
              </pre>
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => navigator.clipboard?.writeText(textDelivery.body)} className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm hover:bg-white/[0.08]">Copy</button>
                <button onClick={() => setTextDelivery(null)} className="rounded-full bg-white text-black px-5 py-2 text-sm font-medium">Close</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
