import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260801000300_secure_download_event_tracking.sql", "utf8");
const assetsService = readFileSync("src/services/assets.ts", "utf8");
const adminDashboard = readFileSync("src/pages/admin/AdminDashboard.tsx", "utf8");

describe("secure download event tracking", () => {
  it("authorizes an entitled claim server-side and deduplicates daily access before incrementing counters", () => {
    expect(migration).toContain("create table if not exists public.asset_download_events");
    expect(migration).toContain("unique (asset_id, user_id, accessed_on)");
    expect(migration).toContain("c.status in ('unlocked', 'paid_mock')");
    expect(migration).toContain("a.status = 'published'");
    expect(migration).toContain("on conflict (asset_id, user_id, accessed_on) do nothing");
    expect(migration).toContain("if inserted_rows > 0 then");
  });

  it("records access before private delivery is returned and surfaces aggregate admin analytics", () => {
    expect(assetsService).toContain('supabase.rpc("record_asset_delivery_access", { target_asset_id: assetId })');
    expect(adminDashboard).toContain("Real delivery access");
    expect(adminDashboard).toContain("Top assets");
  });
});
