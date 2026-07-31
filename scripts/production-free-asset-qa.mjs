import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// This workflow verifies both first-claim and idempotent terminal states in production.
const mode = process.argv[2] || "run";
const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_AUTOMATION_BYPASS_SECRET", "QA_RUN_ID"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

const root = process.cwd();
const statePath = path.join(root, ".production-qa-state.json");
const reportPath = path.join(root, "production-qa-report.md");
const runId = process.env.QA_RUN_ID.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 80);
const prefix = `codex-qa-${runId}`;
const siteUrl = "https://makebetter.im";
const bucket = "asset-deliverables";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const emptyState = { runId, prefix, userIds: [], assetIds: [], creatorIds: [], storagePaths: [] };
function readState() {
  try { return { ...emptyState, ...JSON.parse(fs.readFileSync(statePath, "utf8")) }; }
  catch { return { ...emptyState }; }
}
function saveState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}
function checkError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}
function sanitizeDetail(value) {
  let detail = String(value);
  for (const name of required) {
    const secret = process.env[name];
    if (secret) detail = detail.replaceAll(secret, `[${name}]`);
  }
  return detail
    .replaceAll(/([?&#](?:code|token|access_token|refresh_token|otp|secret)=)[^&#\s]+/gi, "$1[REDACTED]")
    .slice(0, 2000);
}
function makeReport(results, status, detail = "") {
  const lines = [
    "# Production free-asset QA",
    "",
    `**Run:** \`${runId}\``,
    `**Overall:** **${status}**`,
    "",
    "| Check | Result |",
    "|---|---|",
    ...results.map(({ name, pass }) => `| ${name} | ${pass ? "PASS" : "FAIL"} |`),
  ];
  if (detail) lines.push("", "## Failure", "", sanitizeDetail(detail));
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`);
}

async function cleanup() {
  const state = readState();
  const failures = [];
  const attempt = async (label, fn) => { try { await fn(); } catch (error) { failures.push(`${label}: ${error.message}`); } };

  if (state.storagePaths.length) await attempt("storage", async () => {
    const { error } = await admin.storage.from(bucket).remove(state.storagePaths);
    checkError(error, "remove files");
  });
  if (state.assetIds.length) await attempt("claims", async () => {
    const { error } = await admin.from("asset_claims").delete().in("asset_id", state.assetIds);
    checkError(error, "delete claims");
  });
  if (state.assetIds.length) await attempt("deliverables", async () => {
    const { error } = await admin.from("asset_deliverables").delete().in("asset_id", state.assetIds);
    checkError(error, "delete deliverables");
  });
  if (state.assetIds.length) await attempt("assets", async () => {
    const { error } = await admin.from("assets").delete().in("id", state.assetIds);
    checkError(error, "delete assets");
  });
  if (state.creatorIds.length) await attempt("creators", async () => {
    const { error } = await admin.from("creators").delete().in("id", state.creatorIds);
    checkError(error, "delete creators");
  });
  for (const id of state.userIds) await attempt(`user ${id.slice(0, 8)}`, async () => {
    const { error } = await admin.auth.admin.deleteUser(id);
    checkError(error, "delete user");
  });
  if (!failures.length) fs.rmSync(statePath, { force: true });
  if (failures.length) throw new Error(failures.join("; "));
  process.stdout.write("QA cleanup completed.\n");
}

async function run() {
  const { chromium } = await import("playwright");
  const state = readState();
  saveState(state);
  const results = [];
  const record = (name, pass) => { results.push({ name, pass: Boolean(pass) }); if (!pass) throw new Error(`Check failed: ${name}`); };
  const password = `${crypto.randomUUID()}Aa1!`;
  const emails = [`${prefix}-claimant@example.invalid`, `${prefix}-other@example.invalid`, `${prefix}-creator@example.invalid`];
  const createUser = async (email, role = "buyer") => {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role, full_name: prefix } });
    checkError(error, "create QA user");
    state.userIds.push(data.user.id); saveState(state);
    return data.user;
  };

  let browser;
  try {
    const claimant = await createUser(emails[0]);
    const other = await createUser(emails[1]);
    const creatorUser = await createUser(emails[2]);
    const { data: creator, error: creatorError } = await admin.from("creators").insert({
      profile_id: creatorUser.id, slug: `${prefix}-creator`, brand_name: prefix, active: true,
    }).select().single();
    checkError(creatorError, "create creator"); state.creatorIds.push(creator.id); saveState(state);

    const common = { creator_id: creator.id, title: prefix, product_type: "QA", category: "QA", tags: [prefix] };
    const { data: assets, error: assetError } = await admin.from("assets").insert([
      { ...common, slug: `${prefix}-free`, status: "published", price_type: "free", is_free: true, price: 0, published_at: new Date().toISOString() },
      { ...common, slug: `${prefix}-unpublished`, status: "draft", price_type: "free", is_free: true, price: 0 },
      { ...common, slug: `${prefix}-paid`, status: "published", price_type: "paid", is_free: false, price: 1, published_at: new Date().toISOString() },
    ]).select("id,slug");
    checkError(assetError, "create assets"); state.assetIds.push(...assets.map((asset) => asset.id)); saveState(state);
    const bySlug = Object.fromEntries(assets.map((asset) => [asset.slug, asset]));
    const freeAsset = bySlug[`${prefix}-free`];
    const storagePath = `${creator.id}/${freeAsset.id}/${prefix}.txt`;
    const payload = new TextEncoder().encode(`Harmless QA deliverable for ${runId}\n`);
    const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, payload, { contentType: "text/plain", upsert: false });
    checkError(uploadError, "upload deliverable"); state.storagePaths.push(storagePath); saveState(state);
    const { error: deliveryError } = await admin.from("asset_deliverables").insert({ asset_id: freeAsset.id, delivery_type: "file", storage_bucket: bucket, storage_path: storagePath, file_name: `${prefix}.txt`, file_size: payload.length });
    checkError(deliveryError, "create deliverable");

    const redirectTo = `${siteUrl}/auth/free-claim?asset=${freeAsset.id}`;
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: emails[0], options: { redirectTo } });
    checkError(linkError, "generate magic link");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route(`${siteUrl}/**`, async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        },
      });
    });
    const consoleErrors = [];
    const failedRequests = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300)); });
    page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}`));
    const rpcResponses = [];
    page.on("response", async (response) => {
      if (response.url().includes("/rpc/claim_free_asset")) {
        const rpc = { status: response.status(), outcome: null, errorCode: null };
        rpcResponses.push(rpc);
        const body = await response.json().catch(() => null);
        rpc.outcome = typeof body?.outcome === "string" ? body.outcome : null;
        rpc.errorCode = typeof body?.code === "string" ? body.code : null;
      }
    });
    const claimFailureDetail = async (expectedHeading) => {
      const heading = (await page.locator("h1").first().textContent().catch(() => null))?.trim() || "[no heading]";
      const body = (await page.locator("main, section").first().innerText().catch(() => null))?.replace(/\s+/g, " ").trim().slice(0, 500) || "[no page text]";
      const pathname = new URL(page.url()).pathname;
      return [
        `Expected heading: ${expectedHeading}`,
        `Observed heading: ${heading}`,
        `Path: ${pathname}`,
        `Claim RPC: ${JSON.stringify(rpcResponses.at(-1) || { status: "not_observed" })}`,
        `Page text: ${body}`,
        `Console errors: ${JSON.stringify(consoleErrors.slice(-3))}`,
        `Failed requests: ${JSON.stringify(failedRequests.slice(-5))}`,
      ].join("\n");
    };
    const waitForClaimState = async (expectedHeadings) => {
      const headings = Array.isArray(expectedHeadings) ? expectedHeadings : [expectedHeadings];
      try {
        await Promise.any(headings.map((heading) => page.getByRole("heading", { name: heading }).waitFor({ timeout: 30_000 })));
      } catch {
        throw new Error(await claimFailureDetail(headings.join(" or ")));
      }
    };
    const waitForRpcOutcome = async (afterIndex) => {
      const deadline = Date.now() + 5_000;
      while ((!rpcResponses[afterIndex]?.outcome) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return rpcResponses[afterIndex]?.outcome;
    };
    const firstRpcIndex = rpcResponses.length;
    await page.goto(link.properties.action_link, { waitUntil: "networkidle" });
    const firstOutcome = await waitForRpcOutcome(firstRpcIndex);
    await waitForClaimState(["Asset claimed", "Already claimed"]);
    record("magic-link authentication and first browser claim", firstOutcome === "claimed" || firstOutcome === "already_claimed");
    const duplicateRpcIndex = rpcResponses.length;
    await page.goto(`${siteUrl}/auth/free-claim?asset=${freeAsset.id}`, { waitUntil: "networkidle" });
    await waitForClaimState("Already claimed");
    record("duplicate claim", await waitForRpcOutcome(duplicateRpcIndex) === "already_claimed");
    const { count, error: countError } = await admin.from("asset_claims").select("id", { count: "exact", head: true }).eq("asset_id", freeAsset.id).eq("user_id", claimant.id);
    checkError(countError, "count claims"); record("exactly one claim row", count === 1);
    await page.goto(`${siteUrl}/my-assets`, { waitUntil: "networkidle" });
    record("My Assets visibility", await page.getByText(prefix, { exact: true }).first().isVisible());

    const sessionRaw = await page.evaluate(() => Object.values(localStorage).find((value) => value.includes('"access_token"')) || "");
    const claimantSession = JSON.parse(sessionRaw);
    const claimantClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${claimantSession.access_token}` } } });
    const { data: claimantFile, error: claimantFileError } = await claimantClient.storage.from(bucket).download(storagePath);
    record("claimant deliverable access", !claimantFileError && (await claimantFile.text()).includes(runId));
    const anonymous = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { error: anonymousError } = await anonymous.storage.from(bucket).download(storagePath);
    record("anonymous deliverable denied", Boolean(anonymousError));
    const otherClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: otherLogin, error: otherLoginError } = await otherClient.auth.signInWithPassword({ email: emails[1], password });
    checkError(otherLoginError, "sign in non-claimant");
    const authedOther = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${otherLogin.session.access_token}` } } });
    const { error: otherFileError } = await authedOther.storage.from(bucket).download(storagePath);
    record("authenticated non-claimant deliverable denied", Boolean(otherFileError));
    for (const [name, asset] of [["unpublished asset denied", bySlug[`${prefix}-unpublished`]], ["paid asset denied", bySlug[`${prefix}-paid`]]]) {
      const { error } = await claimantClient.rpc("claim_free_asset", { target_asset_id: asset.id });
      record(name, Boolean(error));
    }
    record("no browser console errors", consoleErrors.length === 0);
    record("no failed browser requests", failedRequests.length === 0);
    makeReport(results, "PASS");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!results.some((result) => !result.pass)) results.push({ name: "unexpected test failure", pass: false });
    makeReport(results, "FAIL", message);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

if (mode === "cleanup") await cleanup();
else if (mode === "run") await run();
else throw new Error(`Unknown mode: ${mode}`);
