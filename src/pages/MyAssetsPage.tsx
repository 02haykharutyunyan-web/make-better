import { Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { useStore } from "@/store/store";
import { Download, ArrowUpRight, BookOpen, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { createSignedDeliverableUrl, getClaimedAssetDelivery, listClaimedAssetDeliveryMetadata } from "@/services/assets";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { getDeliveryAction } from "@/lib/delivery-actions";
import type { DeliveryType } from "@/types/database";

export default function MyAssetsPage() {
  const { user, myClaims, refreshMyClaims } = useStore();
  const [err, setErr] = useState("");
  const [loadingClaimId, setLoadingClaimId] = useState<string | null>(null);
  const [textDelivery, setTextDelivery] = useState<{ title: string; body: string } | null>(null);
  const claims = myClaims();
  const userId = user?.id;
  const claimedAssetIds = claims.flatMap(claim => claim.asset?.id ? [claim.asset.id] : []);
  const claimedAssetIdsKey = claimedAssetIds.join("|");
  const [deliveryTypes, setDeliveryTypes] = useState<Record<string, DeliveryType>>({});

  useEffect(() => {
    if (!userId) return;
    void refreshMyClaims().catch(error => setErr(explainSupabaseError(error, "Unable to refresh your assets.")));
  }, [refreshMyClaims, userId]);

  useEffect(() => {
    let active = true;
    const assetIds = claimedAssetIdsKey ? claimedAssetIdsKey.split("|") : [];
    if (!assetIds.length) {
      setDeliveryTypes({});
      return () => { active = false; };
    }

    void listClaimedAssetDeliveryMetadata(assetIds)
      .then(rows => {
        if (active) setDeliveryTypes(Object.fromEntries(rows.map(row => [row.asset_id, row.delivery_type])));
      })
      .catch(() => {
        // The action remains safely generic until metadata can be reloaded.
      });

    return () => { active = false; };
  }, [claimedAssetIdsKey]);

  if (!user) {
    return (
      <SiteLayout>
        <section className="container-mb pt-16 sm:pt-20 pb-20 sm:pb-24 max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-normal">Sign in to see your assets</h1>
          <p className="mt-3 text-[#CFCFCF]">When you claim or purchase an asset, it appears here for instant access.</p>
          <Link to="/login" className="mt-6 inline-flex min-h-11 items-center rounded-full btn-primary px-5 py-2.5 text-sm font-medium">Sign in</Link>
        </section>
      </SiteLayout>
    );
  }

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
      <section className="container-mb pt-12 sm:pt-16 pb-20 sm:pb-24">
        <div className="eyebrow">My Assets</div>
        <h1 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-medium tracking-normal">Your library</h1>
        <p className="mt-3 text-[#CFCFCF] max-w-lg">Assets you've unlocked or claimed live here. Paid items will be released once Stripe is connected.</p>
        {err && <div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}

        {claims.length === 0 ? (
          <div className="mt-10 sm:mt-12 card-premium p-8 sm:p-10 text-center">
            <p className="text-[#CFCFCF]">You haven't claimed anything yet.</p>
            <Link to="/assets" className="mt-5 inline-flex min-h-11 items-center rounded-full btn-primary px-5 py-2.5 text-sm font-medium">Browse assets</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-4">
            {claims.map(c => (
              <div key={c.id} className="card-premium p-5 sm:p-6 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.16em] text-[#CFCFCF]/70">{c.asset?.category}</div>
                  <h3 className="mt-1 text-xl font-medium tracking-normal">{c.asset?.title}</h3>
                  <div className="mt-2 text-sm text-[#CFCFCF]">Status: <span className="text-white">{c.status}</span></div>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  {c.asset && (
                    <Link to={`/asset/${c.asset.slug}`} className="text-sm text-[#CFCFCF] hover:text-white inline-flex items-center gap-1">
                      View <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {(() => {
                    const action = getDeliveryAction(c.asset?.id ? deliveryTypes[c.asset.id] : undefined);
                    const ActionIcon = action.kind === "download" ? Download : action.kind === "read" ? BookOpen : ExternalLink;
                    return (
                      <button
                        disabled={c.status === "Pending payment"}
                        onClick={() => accessClaim(c)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full btn-primary px-5 py-2.5 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ActionIcon className="h-4 w-4" /> {loadingClaimId === c.id ? "Opening..." : c.status === "Pending payment" ? "Awaiting Stripe" : action.label}
                      </button>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        {textDelivery && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setTextDelivery(null)} />
            <div className="relative w-full max-w-2xl glass-modal p-5 sm:p-7 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-medium tracking-normal">{textDelivery.title}</h2>
              <pre className="mt-5 whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0E0E0E]/60 p-4 text-sm text-white/80 font-sans leading-relaxed">
                {textDelivery.body}
              </pre>
              <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
                <button onClick={() => navigator.clipboard?.writeText(textDelivery.body)} className="min-h-11 rounded-full border border-white/10 bg-[#0E0E0E]/80 px-4 py-2 text-sm hover:bg-[#FFD600]/15">Copy</button>
                <button onClick={() => setTextDelivery(null)} className="min-h-11 rounded-full btn-primary px-5 py-2 text-sm font-medium">Close</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
