import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const filePattern = /^(\d{14})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
const errors = [];
const versions = new Map();

for (const file of files) {
  const match = file.match(filePattern);
  if (!match) {
    errors.push(`${file}: expected format YYYYMMDDHHMMSS_descriptive_name.sql`);
    continue;
  }
  const version = match[1];
  if (versions.has(version)) errors.push(`${file}: duplicate version also used by ${versions.get(version)}`);
  versions.set(version, file);
}

const orderedFiles = [...files].sort((a, b) => a.localeCompare(b));
if (files.join('\n') !== orderedFiles.join('\n')) {
  errors.push('Migration directory order is not lexicographically deterministic.');
}

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

const indexByName = new Map(files.map((file, index) => [file.replace(/^\d{14}_/, '').replace(/\.sql$/, ''), index]));
for (const [before, after] of requireBefore) {
  if (!indexByName.has(before) || !indexByName.has(after)) continue;
  if (indexByName.get(before) >= indexByName.get(after)) {
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

if (errors.length > 0) {
  console.error('Migration validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${files.length} migrations with unique deterministic versions.`);
