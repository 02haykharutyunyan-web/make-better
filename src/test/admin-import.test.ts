import { describe, expect, it } from "vitest";
import { parseImportCsv, previewImport } from "@/services/admin-import";

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
});
