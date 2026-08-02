import { describe, expect, it } from "vitest";
import { getDeliveryAction } from "@/lib/delivery-actions";

describe("buyer delivery actions", () => {
  it("uses the action that matches the configured delivery type", () => {
    expect(getDeliveryAction("file")).toEqual({ label: "Download", kind: "download" });
    expect(getDeliveryAction("external_link")).toEqual({ label: "Access", kind: "access" });
    expect(getDeliveryAction("text")).toEqual({ label: "Read", kind: "read" });
  });

  it("keeps an unknown delivery safe while metadata is loading", () => {
    expect(getDeliveryAction()).toEqual({ label: "Access", kind: "access" });
  });
});
