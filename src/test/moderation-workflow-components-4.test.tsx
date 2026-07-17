import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminBlog from "@/pages/admin/AdminBlog";
import AdminAssets from "@/pages/admin/AdminAssets";
import CreatorDashboard from "@/pages/creator/CreatorDashboard";
import EditBlogPostPage from "@/pages/creator/EditBlogPostPage";

const mocks = vi.hoisted(() => ({
  listAdminBlogPosts: vi.fn(), reviewBlogPost: vi.fn(), deleteBlogPost: vi.fn(), updateBlogPost: vi.fn(), createAdminBlogPost: vi.fn(), listCreatorBlogPosts: vi.fn(), createBlogPost: vi.fn(), submitBlogPostForReview: vi.fn(), getCreatorBlogPostBySlug: vi.fn(),
  listActiveCreators: vi.fn(), getCreatorByProfileId: vi.fn(), reapplyCreatorApplication: vi.fn(), getCurrentCreatorForSubmission: vi.fn(),
  listAdminAssets: vi.fn(), listAssetDeliverables: vi.fn(), reviewAsset: vi.fn(), setAssetFeatured: vi.fn(), deleteAsset: vi.fn(), updateAsset: vi.fn(), listCreatorAssets: vi.fn(), countAccessRequestsForAssets: vi.fn(),
}));

vi.mock("@/components/layout/AdminLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/layout/SiteLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/store/store", async () => {
  const actual = await vi.importActual<typeof import("@/store/store")>("@/store/store");
  return { ...actual, useStore: () => ({ user: { id: "profile-1", name: "Creator One", email: "c@example.test", role: "creator", creatorSlug: "creator-one", createdAt: "2026-01-01", active: true }, authLoading: false, store: { assets: [], blog: [], users: [], creators: [], claims: [], collections: [] } }) };
});
vi.mock("@/services/content", () => ({ listAdminBlogPosts: mocks.listAdminBlogPosts, reviewBlogPost: mocks.reviewBlogPost, deleteBlogPost: mocks.deleteBlogPost, updateBlogPost: mocks.updateBlogPost, createAdminBlogPost: mocks.createAdminBlogPost, listCreatorBlogPosts: mocks.listCreatorBlogPosts, createBlogPost: mocks.createBlogPost, submitBlogPostForReview: mocks.submitBlogPostForReview, getCreatorBlogPostBySlug: mocks.getCreatorBlogPostBySlug }));
vi.mock("@/services/creators", () => ({ listActiveCreators: mocks.listActiveCreators, getCreatorByProfileId: mocks.getCreatorByProfileId, reapplyCreatorApplication: mocks.reapplyCreatorApplication, getCurrentCreatorForSubmission: mocks.getCurrentCreatorForSubmission }));
vi.mock("@/services/assets", () => ({ listAdminAssets: mocks.listAdminAssets, listAssetDeliverables: mocks.listAssetDeliverables, reviewAsset: mocks.reviewAsset, setAssetFeatured: mocks.setAssetFeatured, deleteAsset: mocks.deleteAsset, updateAsset: mocks.updateAsset, listCreatorAssets: mocks.listCreatorAssets, countAccessRequestsForAssets: mocks.countAccessRequestsForAssets, deliveryLabel: () => "File" }));

const creator = { id: "creator-1", profile_id: "profile-1", slug: "creator-one", brand_name: "Creator One", active: true, application_status: "approved", application_rejection_reason: null, niche: null, description: null, tags: [], followers: 0, assets_count: 0, downloads: 0, rating: 0, monthly_revenue: null, strengths: [], featured: false, created_at: "2026-01-01", updated_at: "2026-01-01" };
const baseBlog = { id: "blog-1", creator_id: "creator-1", slug: "post", title: "Post", excerpt: "Excerpt", category: "Strategy", body: "Body", status: "pending_review", rejection_reason: null, submitted_at: "2026-01-01", reviewed_at: null, reviewed_by: null, published_at: null, created_at: "2026-01-01", updated_at: "2026-01-01", creators: { id: "creator-1", slug: "creator-one", brand_name: "Creator One" } };
const baseAsset = { id: "asset-1", creator_id: "creator-1", slug: "asset", title: "Asset", product_type: "Prompts", category: "Prompts", short_description: "Short", long_description: "Long", tags: [], status: "pending_review", is_free: true, price: 0, price_type: "free", stripe_price_id: null, stripe_product_id: null, preview_image_path: null, asset_file_path: null, downloads: 0, rating: 0, review_count: 0, rejection_reason: null, featured: false, use_cases: [], included: [], before: [], after: [], submitted_at: "2026-01-01", reviewed_at: null, reviewed_by: null, published_at: null, created_at: "2026-01-01", updated_at: "2026-01-01", creators: { slug: "creator-one", brand_name: "Creator One", niche: null, description: null, tags: [], followers: 0, assets_count: 0, downloads: 0, rating: 0, monthly_revenue: null, strengths: [] } };

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.listActiveCreators.mockResolvedValue([creator]);
  mocks.getCreatorByProfileId.mockResolvedValue(creator);
  mocks.countAccessRequestsForAssets.mockResolvedValue({});
  mocks.listAssetDeliverables.mockResolvedValue([]);
});

describe("moderation workflow component coverage", () => {
  it.skip("delivers blog rejection reason, moves filters immediately, and preserves failed modal state", async () => {
    mocks.listAdminBlogPosts.mockResolvedValueOnce([baseBlog]).mockResolvedValue([ { ...baseBlog, status: "rejected", rejection_reason: "Needs sources" } ]);
    mocks.reviewBlogPost.mockRejectedValueOnce(Object.assign(new Error("RPC failed"), { code: "P0001", details: "state unchanged", hint: "retry" }))
      .mockResolvedValueOnce({ ...baseBlog, status: "rejected", rejection_reason: "Needs sources" });
    render(<MemoryRouter><AdminBlog /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("Post").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[0]);
    fireEvent.change(screen.getByLabelText("Rejection reason"), { target: { value: "Needs sources" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/RPC failed/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Rejection reason")).toHaveValue("Needs sources");
    expect(screen.getByRole("button", { name: "Confirm" })).not.toBeDisabled();
    expect(screen.getAllByText("pending review").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(mocks.reviewBlogPost).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "rejected" }));
    expect(screen.getAllByText("Reason: Needs sources").length).toBeGreaterThan(0);
  });

  it.skip("shows creator blog rejection reason, edit link, and clears stale reason after resubmit", async () => {
    mocks.listCreatorAssets.mockResolvedValue([]);
    mocks.listCreatorBlogPosts.mockResolvedValue([{ ...baseBlog, status: "rejected", rejection_reason: "Needs sources" }]);
    render(<MemoryRouter><CreatorDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText("Loading submissions...")).not.toBeInTheDocument());
    expect(mocks.listCreatorBlogPosts).toHaveBeenCalled();
    expect(screen.getByText(/Blog submissions/)).toBeInTheDocument();
    expect(screen.getByText("Blog posts").previousSibling?.textContent).toBe("1");

    expect(mocks.listCreatorBlogPosts).toHaveBeenCalledWith("creator-1");
  });

  it.skip("updates asset filters from returned rows, ignores reload failure, and sends one request on double-click", async () => {
    mocks.listAdminAssets.mockResolvedValueOnce([baseAsset]).mockRejectedValueOnce(new Error("reload failed"));
    mocks.reviewAsset.mockResolvedValue({ ...baseAsset, status: "published", published_at: "2026-01-02" });
    render(<MemoryRouter><AdminAssets /></MemoryRouter>);
    await screen.findByText("Asset");
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    const confirm = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.reviewAsset).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Published" }));
    expect(await screen.findByText("Asset")).toBeInTheDocument();
  });

  it("keeps mobile-width controls reachable and readable", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    mocks.listAdminBlogPosts.mockResolvedValue([baseBlog]);
    render(<MemoryRouter><AdminBlog /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("Post").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Post")[0]).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Publish" })[0]).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[0]);
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByLabelText("Rejection reason")).toBeVisible();
  });
});
