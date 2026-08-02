import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Kind = "creator" | "asset" | "blog";
type Row = Record<string, string> & { __row: number };
type AssetDelivery = {
  delivery_type: "external_link" | "text";
  file_name: string | null;
  external_url: string | null;
  text_content: string | null;
  storage_bucket: null;
  storage_path: null;
};

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const list = (value?: string) => value?.split("|").map(item => item.trim()).filter(Boolean) || [];
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function normalizeAssetDelivery(row: Row): AssetDelivery {
  const type = (row.delivery_type || "").trim().toLowerCase();

  // `external_url` is the CSV vocabulary, while `external_link` is the
  // database enum. Normalize at the import boundary.
  if (type === "external_url" || type === "external_link") {
    const value = (row.delivery_url || "").trim();
    if (!value) throw new Error("external_url delivery requires delivery_url.");

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error("delivery_url must be a valid http or https URL.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("delivery_url must use http or https.");
    }

    return {
      delivery_type: "external_link",
      file_name: row.file_name?.trim() || null,
      external_url: parsed.toString(),
      text_content: null,
      storage_bucket: null,
      storage_path: null,
    };
  }

  if (type === "text") {
    const value = (row.delivery_text || "").trim();
    if (!value) throw new Error("text delivery requires delivery_text.");
    if (value.length > 100_000) throw new Error("delivery_text must be 100,000 characters or fewer.");

    return {
      delivery_type: "text",
      file_name: row.file_name?.trim() || null,
      external_url: null,
      text_content: value,
      storage_bucket: null,
      storage_path: null,
    };
  }

  throw new Error("Use external_url or text delivery. Private files are attached after import.");
}

async function upsertAssetDelivery(admin: ReturnType<typeof createClient>, assetId: string, delivery: AssetDelivery) {
  const { error } = await admin
    .from("asset_deliverables")
    .upsert({ asset_id: assetId, ...delivery }, { onConflict: "asset_id" });
  if (error) throw error;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = request.headers.get("Authorization") || "";
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ ok: false, error: "Sign in as an admin to import content." }, 401);

    const { data: profile } = await caller.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return json({ ok: false, error: "Only admins can import content." }, 403);

    const { kind, rows } = await request.json() as { kind: Kind; rows: Row[] };
    if (!(["creator", "asset", "blog"] as string[]).includes(kind) || !Array.isArray(rows) || rows.length < 1 || rows.length > 500) {
      return json({ ok: false, error: "Send 1–500 valid rows and an import kind." }, 400);
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    let created = 0;
    let repaired = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (const row of rows) {
      let assetCreatedThisAttempt: string | null = null;

      try {
        if (kind === "creator") {
          const email = row.email.trim().toLowerCase();
          const slug = slugify(row.slug || row.brand_name);
          const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
          if (existing) {
            skipped += 1;
            continue;
          }

          const { data: authUser, error } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { full_name: row.full_name || null, role: "creator", brand_name: row.brand_name, bio: row.description || null },
          });
          if (error || !authUser.user) throw error || new Error("Could not create account.");

          const { data: creator, error: creatorError } = await admin.from("creators").select("id").eq("profile_id", authUser.user.id).maybeSingle();
          if (creatorError || !creator) throw creatorError || new Error("Creator profile was not created.");

          const { error: updateError } = await admin
            .from("creators")
            .update({ slug, brand_name: row.brand_name, niche: row.niche || null, description: row.description || null, tags: list(row.tags), active: true })
            .eq("id", creator.id);
          if (updateError) throw updateError;
        } else {
          let creatorId: string | null = null;
          if (row.creator_email?.trim()) {
            const { data: creatorProfile } = await admin
              .from("profiles")
              .select("id")
              .eq("email", row.creator_email.trim().toLowerCase())
              .maybeSingle();
            if (!creatorProfile) throw new Error("Creator email was not found.");

            const { data: creator } = await admin.from("creators").select("id").eq("profile_id", creatorProfile.id).maybeSingle();
            if (!creator) throw new Error("This account is not a creator.");
            creatorId = creator.id;
          }

          if (kind === "asset") {
            if (!creatorId) throw new Error("Assets require creator_email.");
            const delivery = normalizeAssetDelivery(row);
            const slug = slugify(row.slug || row.title);
            const { data: existing } = await admin.from("assets").select("id").eq("slug", slug).maybeSingle();

            // Re-importing an existing asset repairs or replaces only its
            // delivery record. Listing content remains unchanged.
            if (existing) {
              await upsertAssetDelivery(admin, existing.id, delivery);
              repaired += 1;
              continue;
            }

            const priceType = row.price_type === "paid" ? "paid" : "free";
            const price = priceType === "paid" ? Number(row.price) : 0;
            const { data: asset, error } = await admin
              .from("assets")
              .insert({
                creator_id: creatorId,
                slug,
                title: row.title,
                product_type: row.product_type,
                category: row.category || null,
                short_description: row.short_description || null,
                long_description: row.long_description || null,
                tags: list(row.tags),
                status: row.status === "published" ? "published" : "draft",
                is_free: priceType === "free",
                price_type: priceType,
                price,
                featured: row.featured === "true",
                use_cases: list(row.use_cases),
                included: list(row.included),
                before: list(row.before),
                after: list(row.after),
                preview_image_path: row.preview_image_url || null,
                published_at: row.status === "published" ? new Date().toISOString() : null,
              })
              .select("id")
              .single();
            if (error || !asset) throw error || new Error("Asset was not created.");

            assetCreatedThisAttempt = asset.id;
            await upsertAssetDelivery(admin, asset.id, delivery);
          } else {
            const slug = slugify(row.slug || row.title);
            const { data: existing } = await admin.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
            if (existing) {
              skipped += 1;
              continue;
            }

            const { error } = await admin.from("blog_posts").insert({
              slug,
              title: row.title,
              creator_id: creatorId,
              category: row.category || null,
              excerpt: row.excerpt || null,
              body: row.body,
              status: row.status === "published" ? "published" : "draft",
              published_at: row.status === "published" ? new Date().toISOString() : null,
            });
            if (error) throw error;
          }
        }

        created += 1;
      } catch (error) {
        if (assetCreatedThisAttempt) {
          const { error: cleanupError } = await admin.from("assets").delete().eq("id", assetCreatedThisAttempt);
          if (cleanupError) {
            errors.push({ row: row.__row, message: `Import failed and the new asset could not be rolled back: ${cleanupError.message}` });
            continue;
          }
        }
        errors.push({ row: row.__row, message: error instanceof Error ? error.message : "Unknown import error." });
      }
    }

    return json({ ok: true, created, repaired, skipped, errors });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Import failed." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
