import { supabase } from "@/lib/supabase/client";

export type MarketplaceEvent =
  | "asset_view"
  | "free_claim_started"
  | "free_claim_completed"
  | "delivery_opened"
  | "creator_asset_submitted"
  | "admin_asset_reviewed"
  | "client_error";

const sessionStorageKey = "makebetter_analytics_session";

function sessionId() {
  try {
    let value = window.sessionStorage.getItem(sessionStorageKey);
    if (!value) {
      value = crypto.randomUUID();
      window.sessionStorage.setItem(sessionStorageKey, value);
    }
    return value;
  } catch {
    return null;
  }
}

export function trackMarketplaceEvent(eventName: MarketplaceEvent, assetId?: string | null, metadata: Record<string, string | number | boolean> = {}) {
  // Observability must never disrupt a purchase, claim, upload, or review flow.
  void Promise.resolve(supabase.rpc("track_marketplace_event", {
    target_event_name: eventName,
    target_asset_id: assetId || null,
    client_session_id: sessionId(),
    safe_metadata: metadata,
  })).then(({ error }) => {
    if (error && error.message !== "EVENT_RATE_LIMITED") console.warn("MakeBetter analytics event was not recorded", error.message);
  }).catch(() => undefined);
}

export function trackClientError(error: unknown, source: string) {
  const message = error instanceof Error ? error.message : String(error);
  trackMarketplaceEvent("client_error", null, {
    source: source.slice(0, 80),
    message: message.slice(0, 180),
  });
}
