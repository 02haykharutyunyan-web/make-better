import { supabase } from "@/lib/supabase/client";

export type ImportKind = "creator" | "asset" | "blog";
export type ImportRow = Record<string, string> & { __row: number };
export type ImportPreview = { kind: ImportKind; valid: ImportRow[]; errors: { row: number; message: string }[] };

const required: Record<ImportKind, string[]> = {
  creator: ["email", "brand_name"],
  asset: ["title", "creator_email", "product_type", "delivery_type"],
  blog: ["title", "body"],
};

export function parseImportCsv(source: string): ImportRow[] {
  const rows: string[][] = []; let cell = ""; let row: string[] = []; let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]; const next = source[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") i += 1; row.push(cell.trim()); cell = ""; if (row.some(Boolean)) rows.push(row); row = []; continue; }
    cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); if (!rows.length) return [];
  const headers = rows[0].map(header => header.trim().toLowerCase());
  return rows.slice(1).map((values, index) => Object.fromEntries([...headers.map((header, column) => [header, values[column] || ""] as const), ["__row", index + 2]]) as ImportRow);
}

export function previewImport(kind: ImportKind, rows: ImportRow[]): ImportPreview {
  const errors: ImportPreview["errors"] = [];
  const valid = rows.filter(row => {
    const missing = required[kind].filter(key => !row[key]?.trim());
    if (missing.length) { errors.push({ row: row.__row, message: `Missing: ${missing.join(", ")}` }); return false; }
    if (kind === "creator" && !/^\S+@\S+\.\S+$/.test(row.email)) { errors.push({ row: row.__row, message: "Invalid email" }); return false; }
    if (kind === "asset") {
      const deliveryType = row.delivery_type.trim().toLowerCase();
      if (!["external_url", "text"].includes(deliveryType)) { errors.push({ row: row.__row, message: "delivery_type must be external_url or text. Attach private files from the asset editor after import." }); return false; }
      if (deliveryType === "external_url") {
        try {
          const url = new URL(row.delivery_url.trim());
          if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
        } catch {
          errors.push({ row: row.__row, message: "external_url delivery requires a valid http or https delivery_url." });
          return false;
        }
      }
      if (deliveryType === "text" && !row.delivery_text.trim()) { errors.push({ row: row.__row, message: "text delivery requires delivery_text." }); return false; }
    }
    return true;
  });
  return { kind, valid, errors };
}

export async function runAdminImport(kind: ImportKind, rows: ImportRow[]) {
  const { data, error } = await supabase.functions.invoke("admin-import", { body: { kind, rows } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Import failed.");
  return data as { ok: true; created: number; repaired: number; skipped: number; errors: { row: number; message: string }[] };
}
