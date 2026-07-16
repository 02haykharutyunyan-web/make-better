import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filePattern = /^(\d{14})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;
const requireBefore = [
  ['phase_1_marketplace_schema', 'admin_creator_featured'],
  ['phase_1_marketplace_schema', 'phase_3_asset_delivery'],
  ['phase_1_marketplace_schema', 'free_waitlist_mode'],
  ['phase_1_marketplace_schema', 'fix_admin_profiles_visibility'],
  ['phase_1_marketplace_schema', 'fix_creator_asset_submission_rls'],
  ['phase_3_asset_delivery', 'fix_gated_delivery_access'],
  ['phase_1_marketplace_schema', 'seed_marketplace_demo_data'],
  ['phase_1_marketplace_schema', 'collection_related_tags'],
];

export async function validateMigrationDirectory(migrationsDir) {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
  const errors = [];
  const versions = new Map();
  const indexByName = new Map();
  let previousVersion = null;

  for (const [index, file] of files.entries()) {
    const match = file.match(filePattern);
    if (!match) {
      errors.push(`${file}: expected format YYYYMMDDHHMMSS_descriptive_name.sql`);
      continue;
    }

    const version = match[1];
    const name = file.replace(/^\d{14}_/, '').replace(/\.sql$/, '');

    if (versions.has(version)) {
      errors.push(`${file}: duplicate version also used by ${versions.get(version)}`);
    }
    versions.set(version, file);

    if (previousVersion !== null && version <= previousVersion) {
      errors.push(`${file}: migration versions must be strictly increasing in lexicographic apply order`);
    }
    previousVersion = version;

    if (indexByName.has(name)) {
      errors.push(`${file}: duplicate migration name also used by ${indexByName.get(name).file}`);
    }
    indexByName.set(name, { file, index });
  }

  for (const [before, after] of requireBefore) {
    const beforeEntry = indexByName.get(before);
    const afterEntry = indexByName.get(after);

    if (!beforeEntry) {
      errors.push(`Missing required migration: ${before}`);
      continue;
    }
    if (!afterEntry) {
      errors.push(`Missing required migration: ${after}`);
      continue;
    }
    if (beforeEntry.index >= afterEntry.index) {
      errors.push(`Ordering regression: ${before} must run before ${after}.`);
    }
  }

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    if (/create\s+(?:or\s+replace\s+)?function/i.test(sql)) {
      const functionBlocks = sql.split(/create\s+(?:or\s+replace\s+)?function/i).slice(1);
      for (const block of functionBlocks) {
        const header = block.split('$$')[0] ?? block;
        const fnName = header.trim().split(/\s|\(/)[0];
        if (/security\s+definer/i.test(header) && !/set\s+search_path\s*=/i.test(header)) {
          errors.push(`${file}: SECURITY DEFINER function ${fnName} must set search_path.`);
        }
      }
    }
  }

  return { files, errors };
}

async function main() {
  const migrationsDir = process.argv[2] ?? path.join(process.cwd(), 'supabase', 'migrations');
  const { files, errors } = await validateMigrationDirectory(migrationsDir);

  if (errors.length > 0) {
    console.error('Migration validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Validated ${files.length} migrations with unique deterministic versions.`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
