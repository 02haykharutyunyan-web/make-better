import { describe, expect, it } from "vitest";
import { authCallbackError, callbackAssetId, claimCallbackUrl } from "@/lib/free-claim";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260725000100_secure_free_asset_claim.sql"), "utf8");
const callbackPage = fs.readFileSync(path.join(root, "src/pages/FreeClaimCallbackPage.tsx"), "utf8");

describe("free claim callback safety", () => {
  const assetId = "123e4567-e89b-42d3-a456-426614174000";

  it("accepts only a UUID asset intent and never an arbitrary redirect", () => {
    expect(callbackAssetId(`?asset=${assetId}`)).toBe(assetId);
    expect(callbackAssetId("?asset=../../admin&redirect=https://evil.example")).toBeNull();
    expect(claimCallbackUrl("https://makebetter.test", assetId)).toBe(`https://makebetter.test/auth/free-claim?asset=${assetId}`);
  });

  it("classifies invalid and expired callbacks", () => {
    expect(authCallbackError("?error_code=otp_expired", "")).toBe("expired");
    expect(authCallbackError("", "#error_description=invalid+token")).toBe("invalid");
  });

  it("returns a verified claimant to the exact claimed asset", () => {
    expect(callbackPage).toContain("setAssetSlug(result.asset_slug)");
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
