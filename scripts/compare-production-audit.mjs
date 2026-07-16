import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function expectedFromMigrations(dir) {
  const files = (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
  const sql = (await Promise.all(files.map(f=>readFile(path.join(dir,f),'utf8')))).join('\n');
  const enums = [...sql.matchAll(/create\s+type\s+public\.([a-z0-9_]+)\s+as\s+enum\s*\(([^)]+)\)/gi)].map(m=>({name:m[1], values:[...m[2].matchAll(/'([^']+)'/g)].map(v=>v[1])}));
  const tables = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi)].map(m=>m[1]);
  const functions = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)/gi)].map(m=>m[1]);
  const indexes = [...sql.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)/gi)].map(m=>m[1]);
  const policies = [...sql.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+public\.([a-z0-9_]+)/gi)].map(m=>`${m[2]}.${m[1]}`);
  const triggers = [...sql.matchAll(/create\s+trigger\s+([a-z0-9_]+)\s+[\s\S]*?on\s+public\.([a-z0-9_]+)/gi)].map(m=>`${m[2]}.${m[1]}`);
  return { extensions:['pgcrypto'], storageBuckets:['asset-deliverables'], enums, tables:[...new Set(tables)], functions:[...new Set(functions)], indexes:[...new Set(indexes)], policies:[...new Set(policies)], triggers:[...new Set(triggers)] };
}

export function normalizeAudit(input) {
  if (!input) return null;
  const rows = Array.isArray(input) ? input : Object.entries(input).map(([section, rows])=>({section, rows}));
  const by = new Map(rows.map(r=>[r.section, r.rows ?? []]));
  return {
    extensions: (by.get('extensions')??[]).map(r=>r.name),
    storageBuckets: (by.get('asset_deliverables_bucket')??[]).map(r=>r.id),
    enums: Object.values((by.get('public_enums')??[]).reduce((a,r)=>{(a[r.enum_name]??={name:r.enum_name,values:[]}).values.push(r.value); return a;},{})),
    tables: [...new Set((by.get('public_columns')??[]).map(r=>r.table_name))],
    functions: [...new Set((by.get('public_functions')??[]).map(r=>r.function_name))],
    indexes: [...new Set((by.get('public_indexes')??[]).map(r=>r.index_name))],
    policies: [...new Set((by.get('public_policies')??[]).map(r=>`${r.table_name}.${r.policy_name}`))],
    triggers: [...new Set((by.get('public_triggers')??[]).map(r=>`${r.table_name}.${r.trigger_name}`))],
  };
}

function diffSet(expected, actual) {
  return { missing: expected.filter(x=>!actual.includes(x)), unexpected: actual.filter(x=>!expected.includes(x)) };
}

export async function compareAudit({ auditJson, migrationsDir = path.join(process.cwd(),'supabase','migrations') } = {}) {
  const expected = await expectedFromMigrations(migrationsDir);
  const actual = normalizeAudit(auditJson);
  if (!actual) return { status:'not verified', confirmedMatches:[], missingObjects:[], unexpectedObjects:[], differencesRequiringManualReview:[], notVerified:['production audit export was not provided'] };
  const categories = ['extensions','storageBuckets','tables','functions','indexes','policies','triggers'];
  const report = { status:'verified with review items', confirmedMatches:[], missingObjects:[], unexpectedObjects:[], differencesRequiringManualReview:[], notVerified:['column types/defaults, constraint definitions, function bodies, grants, RLS expressions, storage policy expressions, and demo seed count intent require manual review against the detailed audit rows'] };
  for (const c of categories) {
    const {missing, unexpected}=diffSet(expected[c], actual[c]??[]);
    report.confirmedMatches.push(...expected[c].filter(x=>(actual[c]??[]).includes(x)).map(x=>`${c}:${x}`));
    report.missingObjects.push(...missing.map(x=>`${c}:${x}`));
    report.unexpectedObjects.push(...unexpected.map(x=>`${c}:${x}`));
  }
  for (const e of expected.enums) {
    const a = actual.enums.find(x=>x.name===e.name);
    if (!a) report.missingObjects.push(`enums:${e.name}`);
    else if (e.values.join('|') !== a.values.join('|')) report.differencesRequiringManualReview.push(`enums:${e.name} expected ${e.values.join(',')} got ${a.values.join(',')}`);
    else report.confirmedMatches.push(`enums:${e.name}`);
  }
  return report;
}

async function main(){
  const auditPath = process.argv[2];
  const auditJson = auditPath ? JSON.parse(await readFile(auditPath,'utf8')) : null;
  console.log(JSON.stringify(await compareAudit({auditJson}), null, 2));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(e=>{console.error(e);process.exit(1);});
