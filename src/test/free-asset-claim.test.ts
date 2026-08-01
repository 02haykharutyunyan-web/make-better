import { describe, expect, it } from "vitest";
import { authCallbackError, clearPendingFreeClaim, pendingFreeClaim, rememberPendingFreeClaim } from "@/lib/free-claim";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260725000100_secure_free_asset_claim.sql"), "utf8");
const callbackPage = fs.readFileSync(path.join(root, "src/pages/FreeClaimCallbackPage.tsx"), "utf8");
const assetService = fs.readFileSync(path.join(root, "src/services/assets.ts"), "utf8");

describe("free claim callback safety", () => {
  const assetId = "123e4567-e89b-42d3-a456-426614174000";

  it("requests the exact allow-listed callback without an asset query parameter", () => {
    expect(assetService).toContain('emailRedirectTo: `${window.location.origin}/auth/free-claim`');
    expect(assetService).not.toMatch(/emailRedirectTo:.*asset/i);
  });

  it("keeps a validated claim intent in browser storage instead of the redirect URL", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    rememberPendingFreeClaim(storage, assetId);
    expect(pendingFreeClaim(storage)).toBe(assetId);
    expect(() => rememberPendingFreeClaim(storage, "../../admin")).toThrow();
    clearPendingFreeClaim(storage);
    expect(pendingFreeClaim(storage)).toBeNull();
  });

  it("classifies invalid and expired callbacks", () => {
    expect(authCallbackError("?error_code=otp_expired", "")).toBe("expired");
    expect(authCallbackError("", "#error_description=invalid+token")).toBe("invalid");
  });

  it("returns a verified claimant to the exact claimed asset", () => {
    expect(callbackPage).toContain("setAssetSlug(result.asset_slug)");
    expect(callbackPage).toContain("pendingFreeClaim(window.localStorage)");
    expect(callbackPage).toContain("`/asset/${assetSlug}`");
    expect(callbackPage).toContain("Return to asset");
  });
});

describe("transactional claim and delivery SQL contract", () => {
  it("allows only approved published free assets", () => {
    expect(migration).toMatch(/status <> 'published'/);
    expect(migration).toMatch(/price_type <> 'free'/);
    expect(migration).toMatch(/not target_asset\.is_free/);
    expect(migration).toMatch(/target_asset\.price <> 0/);
  });

  it("is idempotent and tied to the authenticated user", () => {
    expect(migration).toMatch(/claimant_id uuid := auth\.uid\(\)/);
    expect(migration).toMatch(/on conflict \(user_id, asset_id\) do nothing/);
    expect(migration).toMatch(/'already_claimed'/);
  });

  it("keeps anonymous and other-user delivery denied", () => {
    expect(migration).toMatch(/revoke all on function public\.can_access_asset_delivery\(uuid\) from public, anon/);
    expect(migration).toMatch(/asset_claims\.user_id = auth\.uid\(\)/);
    expect(migration).toMatch(/assets\.status = 'published'/);
  });
});
