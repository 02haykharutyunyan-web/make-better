import type { DeliveryType } from "@/types/database";

export type DeliveryAction = {
  label: "Download" | "Access" | "Read";
  kind: "download" | "access" | "read";
};

/**
 * The buyer-facing action must describe what opens next, rather than the
 * generic entitlement state. Unknown is intentionally treated as an access
 * action while the protected delivery metadata is loading.
 */
export function getDeliveryAction(type?: DeliveryType | null): DeliveryAction {
  if (type === "file") return { label: "Download", kind: "download" };
  if (type === "text") return { label: "Read", kind: "read" };
  return { label: "Access", kind: "access" };
}
