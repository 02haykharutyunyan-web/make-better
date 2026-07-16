import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const { validateMigrationDirectory } = await import("../../scripts/validate-migrations.mjs");

const requiredNames = [
  "phase_1_marketplace_schema",
  "admin_creator_featured",
  "phase_3_asset_delivery",
  "free_waitlist_mode",
  "fix_admin_profiles_visibility",
  "fix_creator_asset_submission_rls",
  "fix_gated_delivery_access",
  "seed_marketplace_demo_data",
  "collection_related_tags",
];

const tempDirs: string[] = [];

async function createFixture(files: Record<string, string>) {
  const dir = await mkdtemp(path.join(tmpdir(), "migration-validator-"));
  tempDirs.push(dir);
  await Promise.all(Object.entries(files).map(([file, sql]) => writeFile(path.join(dir, file), sql)));
  return dir;
}

function validFiles(overrides: Record<string, string> = {}) {
  const files: Record<string, string> = {};
  requiredNames.forEach((name, index) => {
    files[`20260517000${index + 1}00_${name}.sql`] = "-- valid fixture\n";
  });
  return { ...files, ...overrides };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("validateMigrationDirectory", () => {
  it("passes valid migrations", async () => {
    const dir = await createFixture(validFiles());

    await expect(validateMigrationDirectory(dir)).resolves.toMatchObject({ errors: [] });
  });

  it("fails invalid filenames", async () => {
    const dir = await createFixture(validFiles({ "20260517_bad_name.sql": "-- invalid timestamp\n" }));

    const result = await validateMigrationDirectory(dir);

    expect(result.errors).toContain("20260517_bad_name.sql: expected format YYYYMMDDHHMMSS_descriptive_name.sql");
  });

  it("fails duplicate versions", async () => {
    const dir = await createFixture(validFiles({ "20260517000100_duplicate_version.sql": "-- duplicate version\n" }));

    const result = await validateMigrationDirectory(dir);

    expect(result.errors.some((error: string) => error.includes("duplicate version"))).toBe(true);
  });

  it("fails missing required migrations", async () => {
    const files = validFiles();
    delete files["20260517000500_fix_admin_profiles_visibility.sql"];
    const dir = await createFixture(files);

    const result = await validateMigrationDirectory(dir);

    expect(result.errors).toContain("Missing required migration: fix_admin_profiles_visibility");
  });

  it("fails reversed dependency order", async () => {
    const files = validFiles();
    delete files["20260517000100_phase_1_marketplace_schema.sql"];
    delete files["20260517000200_admin_creator_featured.sql"];
    files["20260517000100_admin_creator_featured.sql"] = "-- admin before base\n";
    files["20260517000200_phase_1_marketplace_schema.sql"] = "-- base after admin\n";
    const dir = await createFixture(files);

    const result = await validateMigrationDirectory(dir);

    expect(result.errors).toContain("Ordering regression: phase_1_marketplace_schema must run before admin_creator_featured.");
  });

  it("fails SECURITY DEFINER functions without search_path", async () => {
    const dir = await createFixture(validFiles({
      "20260517001000_security_definer_without_search_path.sql": `
        create or replace function public.unsafe_fn()
        returns boolean
        language sql
        stable
        security definer
        as $$ select true $$;
      `,
    }));

    const result = await validateMigrationDirectory(dir);

    expect(result.errors.some((error: string) => error.includes("SECURITY DEFINER function public.unsafe_fn must set search_path"))).toBe(true);
  });
});
