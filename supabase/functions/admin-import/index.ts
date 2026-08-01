import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Kind = "creator" | "asset" | "blog";
type Row = Record<string, string> & { __row: number };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const list = (value?: string) => value?.split("|").map(item => item.trim()).filter(Boolean) || [];
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
    if (!(["creator", "asset", "blog"] as string[]).includes(kind) || !Array.isArray(rows) || rows.length < 1 || rows.length > 500) return json({ ok: false, error: "Send 1–500 valid rows and an import kind." }, 400);
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    let created = 0; let skipped = 0; const errors: { row: number; message: string }[] = [];
    for (const row of rows) {
      try {
        if (kind === "creator") {
          const email = row.email.trim().toLowerCase(); const slug = slugify(row.slug || row.brand_name);
          const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
          if (existing) { skipped += 1; continue; }
          const { data: authUser, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: row.full_name || null, role: "creator", brand_name: row.brand_name, bio: row.description || null } });
          if (error || !authUser.user) throw error || new Error("Could not create account.");
          const { data: creator, error: creatorError } = await admin.from("creators").select("id").eq("profile_id", authUser.user.id).maybeSingle();
          if (creatorError || !creator) throw creatorError || new Error("Creator profile was not created.");
          const { error: updateError } = await admin.from("creators").update({ slug, brand_name: row.brand_name, niche: row.niche || null, description: row.description || null, tags: list(row.tags), active: true }).eq("id", creator.id);
          if (updateError) throw updateError;
        } else {
          let creatorId: string | null = null;
          if (row.creator_email?.trim()) { const { data: profile } = await admin.from("profiles").select("id").eq("email", row.creator_email.trim().toLowerCase()).maybeSingle(); if (!profile) throw new Error("Creator email was not found."); const { data: creator } = await admin.from("creators").select("id").eq("profile_id", profile.id).maybeSingle(); if (!creator) throw new Error("This account is not a creator."); creatorId = creator.id; }
          if (kind === "asset") {
            if (!creatorId) throw new Error("Assets require creator_email.");
            const slug = slugify(row.slug || row.title); const priceType = row.price_type === "paid" ? "paid" : "free"; const price = priceType === "paid" ? Number(row.price) : 0;
            const { data: existing } = await admin.from("assets").select("id").eq("slug", slug).maybeSingle(); if (existing) { skipped += 1; continue; }
            const { data: asset, error } = await admin.from("assets").insert({ creator_id: creatorId, slug, title: row.title, product_type: row.product_type, category: row.category || null, short_description: row.short_description || null, long_description: row.long_description || null, tags: list(row.tags), status: row.status === "published" ? "published" : "draft", is_free: priceType === "free", price_type: priceType, price, featured: row.featured === "true", use_cases: list(row.use_cases), included: list(row.included), before: list(row.before), after: list(row.after), preview_image_path: row.preview_image_url || null, published_at: row.status === "published" ? new Date().toISOString() : null }).select("id").single();
            if (error || !asset) throw error || new Error("Asset was not created.");
            const delivery = row.delivery_type;
            if (delivery !== "external_url" && delivery !== "text") throw new Error("Use external_url or text delivery. Private files are attached after import.");
            const payload = delivery === "external_url" ? { external_url: row.delivery_url } : delivery === "text" ? { text_content: row.delivery_text } : { storage_path: null };
            const { error: deliveryError } = await admin.from("asset_deliverables").insert({ asset_id: asset.id, delivery_type: delivery, file_name: row.file_name || null, ...payload });
            if (deliveryError) throw deliveryError;
          } else {
            const slug = slugify(row.slug || row.title); const { data: existing } = await admin.from("blog_posts").select("id").eq("slug", slug).maybeSingle(); if (existing) { skipped += 1; continue; }
            const { error } = await admin.from("blog_posts").insert({ slug, title: row.title, creator_id: creatorId, category: row.category || null, excerpt: row.excerpt || null, body: row.body, status: row.status === "published" ? "published" : "draft", published_at: row.status === "published" ? new Date().toISOString() : null }); if (error) throw error;
          }
        }
        created += 1;
      } catch (error) { errors.push({ row: row.__row, message: error instanceof Error ? error.message : "Unknown import error." }); }
    }
    return json({ ok: true, created, skipped, errors });
  } catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "Import failed." }, 500); }
});

function json(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } }); }
