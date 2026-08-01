export type FreeClaimOutcome = "claimed" | "already_claimed";

export interface FreeClaimResult {
  claim_id: string;
  asset_id: string;
  asset_slug: string;
  outcome: FreeClaimOutcome;
}

const pendingClaimKey = "makebetter.pending-free-claim";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function rememberPendingFreeClaim(storage: Pick<Storage, "setItem">, assetId: string) {
  if (!uuidPattern.test(assetId)) throw new Error("Invalid free asset claim intent.");
  storage.setItem(pendingClaimKey, assetId);
}

export function pendingFreeClaim(storage: Pick<Storage, "getItem">) {
  const value = storage.getItem(pendingClaimKey) || "";
  return uuidPattern.test(value) ? value : null;
}

export function clearPendingFreeClaim(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(pendingClaimKey);
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
