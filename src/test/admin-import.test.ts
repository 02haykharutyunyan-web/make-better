import { describe, expect, it } from "vitest";
import { parseImportCsv, previewImport } from "@/services/admin-import";
import { readFileSync } from "node:fs";

const edgeImporter = readFileSync("supabase/functions/admin-import/index.ts", "utf8");

describe("admin import CSV preview", () => {
  it("parses quoted CSV cells and retains original spreadsheet row numbers", () => {
    const rows = parseImportCsv('title,creator_email,product_type,delivery_type\n"Agent, v2",creator@example.com,AI Agents,text');
    expect(rows).toEqual([{ title: "Agent, v2", creator_email: "creator@example.com", product_type: "AI Agents", delivery_type: "text", __row: 2 }]);
  });

  it("blocks asset rows which cannot be delivered safely through CSV", () => {
    const preview = previewImport("asset", parseImportCsv("title,creator_email,product_type,delivery_type\nAgent,a@example.com,AI Agents,file"));
    expect(preview.valid).toHaveLength(0);
    expect(preview.errors[0].message).toContain("external_url or text");
  });

  it("requires a usable payload for every importable delivery type", () => {
    const linkPreview = previewImport("asset", parseImportCsv("title,creator_email,product_type,delivery_type,delivery_url\nAgent,a@example.com,AI Agents,external_url,not-a-url"));
    const textPreview = previewImport("asset", parseImportCsv("title,creator_email,product_type,delivery_type,delivery_text\nAgent,a@example.com,AI Agents,text,"));

    expect(linkPreview.errors[0].message).toContain("valid http or https");
    expect(textPreview.errors[0].message).toContain("requires delivery_text");
  });

  it("maps the CSV URL alias to the database enum and repairs existing asset delivery", () => {
    expect(edgeImporter).toContain('delivery_type: "external_link"');
    expect(edgeImporter).toContain('upsert({ asset_id: assetId, ...delivery }, { onConflict: "asset_id" })');
    expect(edgeImporter).toContain("Re-importing an existing asset repairs or replaces only its");
  });
});
