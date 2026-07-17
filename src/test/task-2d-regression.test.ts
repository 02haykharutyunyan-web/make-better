import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  updatePayload: undefined as unknown,
  update: vi.fn(), eq: vi.fn(), in: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ update: mocks.update })),
    storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
  },
}));

import { editableBlogPatch, updateBlogPost } from "@/services/content";
import { MAX_DELIVERABLE_FILE_SIZE, validateDeliverableFile, validateDeliveryUrl, validateTextDelivery } from "@/services/assets";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockImplementation((payload) => { mocks.updatePayload = payload; return { eq: mocks.eq }; });
  mocks.eq.mockReturnValue({ in: mocks.in });
  mocks.in.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ maybeSingle: mocks.maybeSingle });
});

describe("Task 2D blog update model", () => {
  it("sends only editable blog columns and blocks lifecycle columns", () => {
    const payload = editableBlogPatch({ title: "T", slug: "s", excerpt: null, category: "C", body: "B", status: "published", creator_id: "evil" } as never);
    expect(payload).toEqual({ title: "T", slug: "s", excerpt: null, category: "C", body: "B" });
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("creator_id");
  });

  it("requires draft/rejected rows and treats zero-row updates as an error", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(updateBlogPost("post-1", { title: "Saved" })).rejects.toThrow(/No editable blog post was updated/);
    expect(mocks.updatePayload).toEqual({ title: "Saved" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "post-1");
    expect(mocks.in).toHaveBeenCalledWith("status", ["draft", "rejected"]);
  });

  it("returns the persisted row for local dashboard/form state", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "post-1", title: "Persisted", status: "rejected", rejection_reason: "Needs work" }, error: null });
    await expect(updateBlogPost("post-1", { title: "Persisted" })).resolves.toMatchObject({ title: "Persisted", status: "rejected", rejection_reason: "Needs work" });
  });
});

describe("Task 2D delivery validation", () => {
  it("accepts safe file delivery under 50 MB", () => {
    validateDeliverableFile(new File(["ok"], "deliverable.zip", { type: "application/zip" }));
  });

  it("blocks executable/script and oversized file delivery", () => {
    expect(() => validateDeliverableFile(new File(["bad"], "run.js", { type: "text/javascript" }))).toThrow(/blocked/);
    const tooLarge = new File(["x"], "large.pdf", { type: "application/pdf" });
    Object.defineProperty(tooLarge, "size", { value: MAX_DELIVERABLE_FILE_SIZE + 1 });
    expect(() => validateDeliverableFile(tooLarge)).toThrow(/50 MB/);
  });

  it("validates URL and text delivery without requiring upload", () => {
    expect(validateDeliveryUrl("https://example.com/file")).toBe("https://example.com/file");
    expect(() => validateDeliveryUrl("http://example.com/file")).toThrow(/HTTPS/);
    expect(validateTextDelivery(" prompt ")).toBe("prompt");
    expect(() => validateTextDelivery("   ")).toThrow(/Add the private text/);
  });
});
