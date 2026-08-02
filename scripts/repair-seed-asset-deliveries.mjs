import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

const spreadsheetId = "1O90tdGioCS-v6uyq0uykwLEQ3x0pwiwuRmYnj0vvtOQ";
const deliveryBySlug = Object.freeze({
  "ai-marketing-campaign-brief-builder": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=1980571504`,
  "seo-content-brief-system": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=1389265755`,
  "keyword-clustering-search-intent-system": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=463950490`,
  "linkedin-thought-leadership-workflow": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=249918430`,
  "landing-page-conversion-copy-system": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=718849429`,
  "b2b-cold-email-personalization-system": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=1921713889`,
  "market-research-sprint-toolkit": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=1148567733`,
  "customer-support-response-library-builder": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=487684753`,
  "meeting-to-actions-workflow": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=146673100`,
  "ai-agent-specification-guardrails-template": `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=1442688545`,
});

const expectedSlugs = Object.keys(deliveryBySlug);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function checkError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

const { data: assets, error: assetError } = await admin
  .from("assets")
  .select("id, slug")
  .in("slug", expectedSlugs);
checkError(assetError, "load seed assets");

const foundSlugs = new Set((assets || []).map((asset) => asset.slug));
const missingSlugs = expectedSlugs.filter((slug) => !foundSlugs.has(slug));
if (missingSlugs.length || assets?.length !== expectedSlugs.length) {
  throw new Error(`Expected exactly ${expectedSlugs.length} seed assets; missing: ${missingSlugs.join(", ") || "none"}`);
}

const deliveries = assets.map((asset) => ({
  asset_id: asset.id,
  delivery_type: "external_link",
  external_url: deliveryBySlug[asset.slug],
  text_content: null,
  storage_bucket: null,
  storage_path: null,
  file_name: null,
}));

const { error: repairError } = await admin
  .from("asset_deliverables")
  .upsert(deliveries, { onConflict: "asset_id" });
checkError(repairError, "upsert seed asset deliveries");

const assetIdToSlug = new Map(assets.map((asset) => [asset.id, asset.slug]));
const { data: verified, error: verifyError } = await admin
  .from("asset_deliverables")
  .select("asset_id, delivery_type, external_url")
  .in("asset_id", assets.map((asset) => asset.id));
checkError(verifyError, "verify seed asset deliveries");

const invalid = (verified || []).filter((delivery) => {
  const slug = assetIdToSlug.get(delivery.asset_id);
  return delivery.delivery_type !== "external_link" || delivery.external_url !== deliveryBySlug[slug];
});
if (verified?.length !== expectedSlugs.length || invalid.length) {
  throw new Error("Delivery verification failed after repair.");
}

process.stdout.write(`Repaired and verified ${deliveries.length} seed asset deliveries.\n`);
