import { describe, expect, it } from "vitest";
import { authCallbackError, clearPendingFreeClaim, pendingFreeClaim, rememberPendingFreeClaim, restoreMagicLinkSession } from "@/lib/free-claim";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260725000100_secure_free_asset_claim.sql"), "utf8");
const callbackPage = fs.readFileSync(path.join(root, "src/pages/FreeClaimCallbackPage.tsx"), "utf8");
const assetService = fs.readFileSync(path.join(root, "src/services/assets.ts"), "utf8");
const appRoutes = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")) as { rewrites?: Array<{ source: string; destination: string }> };

describe("free claim callback safety", () => {
  const assetId = "123e4567-e89b-42d3-a456-426614174000";

  it("requests the exact allow-listed callback without an asset query parameter", () => {
    expect(assetService).toContain('emailRedirectTo: `${window.location.origin}/auth/free-claim`');
    expect(assetService).not.toMatch(/emailRedirectTo:.*asset/i);
  });

  it("deploys the callback as a real SPA route", () => {
    expect(appRoutes).toContain('<Route path="/auth/free-claim" element={<FreeClaimCallbackPage />} />');
    expect(vercelConfig.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
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
    expect(assetService).not.toContain("pending_free_asset_id");
  });

  it("restores a PKCE session before the callback can claim", async () => {
    const calls: string[] = [];
    const session = { user: { id: "user-1" } };
    const auth = {
      exchangeCodeForSession: async (code: string) => { calls.push(`exchange:${code}`); return { error: null }; },
      setSession: async () => { calls.push("set"); return { error: null }; },
      getSession: async () => { calls.push("get"); return { data: { session }, error: null }; },
    };
    await expect(restoreMagicLinkSession(auth as never, "?code=pkce-code", "")).resolves.toBe(session);
    expect(calls).toEqual(["exchange:pkce-code", "get"]);
  });

  it("restores an implicit-flow hash session before the callback can claim", async () => {
    const calls: string[] = [];
    const auth = {
      exchangeCodeForSession: async () => ({ error: null }),
      setSession: async ({ access_token }: { access_token: string; refresh_token: string }) => { calls.push(`set:${access_token}`); return { error: null }; },
      getSession: async () => { calls.push("get"); return { data: { session: { user: { id: "user-1" } } }, error: null }; },
    };
    await restoreMagicLinkSession(auth as never, "", "#access_token=access&refresh_token=refresh");
    expect(calls).toEqual(["set:access", "get"]);
  });

  it("classifies invalid and expired callbacks", () => {
    expect(authCallbackError("?error_code=otp_expired", "")).toBe("expired");
    expect(authCallbackError("", "#error_description=invalid+token")).toBe("invalid");
  });

  it("returns a verified claimant to the exact claimed asset", () => {
    expect(callbackPage).toContain("setAssetSlug(result.asset_slug)");
    expect(callbackPage).toContain("await restoreMagicLinkSession");
    expect(callbackPage).toContain("pendingFreeClaim(window.localStorage)");
    expect(callbackPage.indexOf("await restoreMagicLinkSession")).toBeLessThan(callbackPage.indexOf("claimFreeAssetSecure(assetId)"));
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
