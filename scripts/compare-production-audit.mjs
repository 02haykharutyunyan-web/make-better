import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const manualReviewItems = [
  'schemas',
  'public_columns',
  'public_constraints',
  'public_rls',
  'public_function_grants',
  'storage_policies',
  'demo_seed_existence',
  'function definitions/search_path/security details beyond function names',
];

export async function expectedFromMigrations(dir) {
  const files = (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
  const sql = (await Promise.all(files.map(f=>readFile(path.join(dir,f),'utf8')))).join('\n');
  const enums = [...sql.matchAll(/create\s+type\s+public\.([a-z0-9_]+)\s+as\s+enum\s*\(([^)]+)\)/gi)].map(m=>({name:m[1], values:[...m[2].matchAll(/'([^']+)'/g)].map(v=>v[1])}));
  const createTableMatches = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)\s*\(([\s\S]*?)\);/gi)];
  const tables = createTableMatches.map(m=>m[1]);
  const createTableColumns = createTableMatches.flatMap(([_, table, body]) => [...body.matchAll(/^\s*([a-z0-9_]+)\s+[^,]+/gim)]
    .filter((m) => !['constraint', 'primary', 'foreign', 'unique', 'check'].includes(m[1].toLowerCase()))
    .map((m) => `${table}.${m[1]}`));
  const alterAddColumns = [...sql.matchAll(/alter\s+table\s+public\.([a-z0-9_]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)/gi)]
    .map((m) => `${m[1]}.${m[2]}`);
  const columns = [...new Set([...createTableColumns, ...alterAddColumns])];
  const functions = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)/gi)].map(m=>m[1]);
  const indexes = [...sql.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)/gi)].map(m=>m[1]);
  const policies = [...sql.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+public\.([a-z0-9_]+)/gi)].map(m=>`${m[2]}.${m[1]}`);
  const triggers = [...sql.matchAll(/create\s+trigger\s+([a-z0-9_]+)\b[\s\S]*?;(?=\s*(?:create|alter|drop|grant|revoke|insert|update|delete|$))/gi)]
    .map((m) => {
      const target = m[0].match(/\bon\s+([a-z0-9_]+)\.([a-z0-9_]+)/i);
      return target ? { schema: target[1], table: target[2], name: m[1] } : null;
    })
    .filter(Boolean);
  return { extensions:['pgcrypto'], storageBuckets:['asset-deliverables'], enums, tables:[...new Set(tables)], columns, functions:[...new Set(functions)], indexes:[...new Set(indexes)], policies:[...new Set(policies)], triggers:[...new Set(triggers.filter(t=>t.schema==='public').map(t=>`${t.table}.${t.name}`))], authTriggers:[...new Set(triggers.filter(t=>t.schema==='auth').map(t=>`${t.table}.${t.name}`))] };
}

function unwrapAuditExport(input) {
  if (!input) return null;
  if (Array.isArray(input)) {
    if (input.length === 1 && input[0] && typeof input[0] === 'object' && 'audit_result' in input[0]) return input[0].audit_result;
    if (input.every(r => r && typeof r === 'object' && 'section' in r && 'rows' in r)) {
      return Object.fromEntries(input.map(r => [r.section, r.rows]));
    }
    throw new Error('Malformed audit export: expected one SQL row with audit_result or section/rows objects.');
  }
  if (typeof input === 'object') {
    if ('audit_result' in input) return input.audit_result;
    const knownKeys = ['schemas','extensions','public_enums','public_columns','public_constraints','public_indexes','public_triggers','public_rls','public_policies','public_functions','public_function_grants','asset_deliverables_bucket','storage_policies','demo_seed_existence'];
    if (knownKeys.some(k => k in input)) return input;
  }
  throw new Error('Malformed audit export: expected top-level audit_result object or audit section object.');
}

export function normalizeAudit(input) {
  const doc = unwrapAuditExport(input);
  if (!doc) return null;
  const read = (section) => {
    const rows = doc[section];
    if (rows === undefined) throw new Error(`Malformed audit export: missing section ${section}.`);
    if (!Array.isArray(rows)) throw new Error(`Malformed audit export: section ${section} must be an array.`);
    return rows;
  };
  return {
    extensions: read('extensions').map(r=>r.name),
    storageBuckets: read('asset_deliverables_bucket').map(r=>r.id),
    enums: Object.values(read('public_enums').reduce((a,r)=>{(a[r.enum_name]??={name:r.enum_name,values:[]}).values.push(r.value); return a;},{})),
    tables: [...new Set(read('public_columns').map(r=>r.table_name))],
    columns: [...new Set(read('public_columns').filter(r=>r.table_name && r.column_name).map(r=>`${r.table_name}.${r.column_name}`))],
    functions: [...new Set(read('public_functions').map(r=>r.function_name))],
    indexes: [...new Set(read('public_indexes').map(r=>r.index_name))],
    constraintBackedIndexes: [...new Set(read('public_constraints').filter(r=>['p','u'].includes(r.constraint_type)).map(r=>r.constraint_name))],
    policies: [...new Set(read('public_policies').map(r=>`${r.table_name}.${r.policy_name}`))],
    triggers: [...new Set(read('public_triggers').map(r=>`${r.table_name}.${r.trigger_name}`))],
    functionGrants: read('public_function_grants'),
  };
}

function diffSet(expected, actual) {
  return { missing: expected.filter(x=>!actual.includes(x)), unexpected: actual.filter(x=>!expected.includes(x)) };
}

export async function compareAudit({ auditJson, migrationsDir = path.join(process.cwd(),'supabase','migrations') } = {}) {
  const expected = await expectedFromMigrations(migrationsDir);
  const actual = normalizeAudit(auditJson);
  if (!actual) return { status:'not verified', confirmedMatches:[], missingObjects:[], unexpectedObjects:[], differencesRequiringManualReview:[], notVerified:['production audit export was not provided'] };
  const categories = ['extensions','storageBuckets','tables','columns','functions','policies','triggers'];
  const report = { status:'pending comparison', confirmedMatches:[], missingObjects:[], unexpectedObjects:[], differencesRequiringManualReview:[], notVerified:manualReviewItems };
  for (const c of categories) {
    const {missing, unexpected}=diffSet(expected[c], actual[c]??[]);
    report.confirmedMatches.push(...expected[c].filter(x=>(actual[c]??[]).includes(x)).map(x=>`${c}:${x}`));
    report.missingObjects.push(...missing.map(x=>`${c}:${x}`));
    report.unexpectedObjects.push(...unexpected.map(x=>`${c}:${x}`));
  }
  const indexDiff = diffSet(expected.indexes, actual.indexes ?? []);
  report.confirmedMatches.push(...expected.indexes.filter(x=>(actual.indexes??[]).includes(x)).map(x=>`indexes:${x}`));
  report.missingObjects.push(...indexDiff.missing.map(x=>`indexes:${x}`));
  const expectedOrConstraintBackedIndexes = new Set([...(expected.indexes ?? []), ...(actual.constraintBackedIndexes ?? [])]);
  report.unexpectedObjects.push(...(actual.indexes ?? []).filter(x=>!expectedOrConstraintBackedIndexes.has(x)).map(x=>`indexes:${x}`));
  if ((expected.authTriggers ?? []).length) {
    report.notVerified.push(...expected.authTriggers.map(x=>`auth trigger not audited by public trigger audit:${x}`));
  }
  for (const e of expected.enums) {
    const a = actual.enums.find(x=>x.name===e.name);
    if (!a) report.missingObjects.push(`enums:${e.name}`);
    else if (e.values.join('|') !== a.values.join('|')) report.differencesRequiringManualReview.push(`enums:${e.name} expected ${e.values.join(',')} got ${a.values.join(',')}`);
    else report.confirmedMatches.push(`enums:${e.name}`);
  }
  report.status = report.missingObjects.length || report.unexpectedObjects.length || report.differencesRequiringManualReview.length
    ? 'differences found'
    : 'matched with manual review required';
  return report;
}

async function main(){
  const auditPath = process.argv[2];
  const auditJson = auditPath ? JSON.parse(await readFile(auditPath,'utf8')) : null;
  console.log(JSON.stringify(await compareAudit({auditJson}), null, 2));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(e=>{console.error(e.message || e);process.exit(1);});
