import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const localDemoAsset = {
  id: "local-demo-asset",
  slug: "local-demo-asset",
  title: "Local Demo Asset Must Not Render",
  category: "Prompts",
  productType: "Prompts",
  description: "fixture",
  tags: [],
  price: 0,
  downloads: 0,
  rating: 0,
  reviewCount: 0,
  creatorSlug: "demo-creator",
  collectionSlugs: [],
  status: "Published",
  isFree: true,
  priceType: "free",
  submittedAt: new Date().toISOString(),
};

vi.mock("@/components/layout/AdminLayout", () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock("@/store/store", () => ({
  useStore: () => ({
    store: {
      assets: [localDemoAsset],
      creators: [{ slug: "demo-creator", name: "Demo Creator" }],
    },
  }),
}));

const listAdminAssets = vi.fn();
const listAssetDeliverables = vi.fn();
vi.mock("@/services/assets", () => ({
  listAdminAssets: (...args: unknown[]) => listAdminAssets(...args),
  listAssetDeliverables: (...args: unknown[]) => listAssetDeliverables(...args),
  deleteAsset: vi.fn(),
  updateAsset: vi.fn(),
  deliveryLabel: () => "No delivery",
}));

vi.mock("@/lib/asset-mappers", () => ({
  dbAssetToSubmittedAsset: (row: { id: string; slug: string; title: string }) => ({
    ...localDemoAsset,
    id: row.id,
    slug: row.slug,
    title: row.title,
    creatorSlug: "remote-creator",
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("production runtime data safety", () => {
  it("does not expose fixed demo credentials in source-controlled runtime code", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(process.cwd(), "src/store/store.tsx"), "utf8");

    expect(source).not.toContain("makebetter-demo-123");
    expect(source).not.toContain("admin@makebetter.io");
  });

  it("does not create a placeholder Supabase client when configuration is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.resetModules();

    const { publicEnv } = await import("@/lib/env");
    const { supabase } = await import("@/lib/supabase/client");

    expect(publicEnv.hasSupabaseConfig).toBe(false);
    expect(() => supabase.from("assets")).toThrow(/VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY/);
  });

  it("does not render local demo assets after admin asset loading fails", async () => {
    listAdminAssets.mockRejectedValueOnce(new Error("backend unavailable"));
    const { default: AdminAssets } = await import("@/pages/admin/AdminAssets");

    render(<MemoryRouter><AdminAssets /></MemoryRouter>);

    expect(await screen.findByText(/backend unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("Local Demo Asset Must Not Render")).not.toBeInTheDocument();
  });

  it("renders successful Supabase admin assets", async () => {
    listAdminAssets.mockResolvedValueOnce([
      { id: "remote-1", slug: "remote-asset", title: "Remote Supabase Asset", creators: { brand_name: "Remote Creator" } },
    ]);
    listAssetDeliverables.mockResolvedValueOnce([]);
    const { default: AdminAssets } = await import("@/pages/admin/AdminAssets");

    render(<MemoryRouter><AdminAssets /></MemoryRouter>);

    expect(await screen.findByText("Remote Supabase Asset")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Local Demo Asset Must Not Render")).not.toBeInTheDocument());
  });
});
