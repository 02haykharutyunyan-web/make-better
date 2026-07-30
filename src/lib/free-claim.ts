export type FreeClaimOutcome = "claimed" | "already_claimed";

export interface FreeClaimResult {
  claim_id: string;
  asset_id: string;
  asset_slug: string;
  outcome: FreeClaimOutcome;
}

export function claimCallbackUrl(origin: string, assetId: string) {
  const url = new URL("/auth/free-claim", origin);
  url.searchParams.set("asset", assetId);
  return url.toString();
}

export function callbackAssetId(search: string) {
  const value = new URLSearchParams(search).get("asset") || "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function authCallbackError(search: string, hash: string) {
  const params = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const code = params.get("error_code") || hashParams.get("error_code");
  const description = params.get("error_description") || hashParams.get("error_description");
  if (!code && !description) return null;
  const normalized = `${code || ""} ${description || ""}`.toLowerCase();
  return normalized.includes("expired") ? "expired" : "invalid";
}
