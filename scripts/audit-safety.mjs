import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const forbiddenPattern = /\b(alter|begin|call|commit|copy|create|delete|do|drop|execute|grant|insert|merge|notify|reassign|refresh|reset|revoke|rollback|savepoint|select\s+.*\binto\b|set|truncate|update|vacuum|db\s+push|db\s+reset|migration\s+repair)\b/i;

export function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

export function splitStatements(sql) {
  return stripSqlComments(sql).split(';').map((s) => s.trim()).filter(Boolean);
}

export function validateReadOnlySelectAudit(sql) {
  const errors = [];
  for (const [index, statement] of splitStatements(sql).entries()) {
    if (!/^\(?\s*(select|with)\b/i.test(statement)) errors.push(`Statement ${index + 1} is not SELECT/WITH-only.`);
    const forbidden = statement.match(forbiddenPattern);
    if (forbidden) errors.push(`Statement ${index + 1} contains forbidden token: ${forbidden[1]}.`);
  }
  return errors;
}

async function main() {
  const auditFile = process.argv[2] ?? path.join(process.cwd(), 'supabase', 'audit', 'production_schema_equivalence_audit.sql');
  const sql = await readFile(auditFile, 'utf8');
  const errors = validateReadOnlySelectAudit(sql);
  if (errors.length) {
    console.error('Audit safety validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Audit safety validation passed: ${splitStatements(sql).length} SELECT-only statements.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
