import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const forbiddenTopLevel = new Set(['alter','begin','call','commit','copy','create','delete','do','drop','execute','grant','insert','merge','notify','reassign','refresh','reset','revoke','rollback','savepoint','set','truncate','update','vacuum']);
const writableCtePattern = /\bas\s*\(\s*(insert|update|delete|merge|create|alter|drop|grant|revoke|truncate)\b/i;
const forbiddenPhrasePattern = /\b(db\s+push|db\s+reset|migration\s+repair|select\s+[^;]*\binto\b)\b/i;

const allowedRelations = new Set([
  'pg_namespace','pg_extension','pg_type','pg_enum','information_schema.columns','information_schema.tables','information_schema.column_privileges','information_schema.table_privileges','pg_constraint','pg_indexes','information_schema.triggers','pg_class','pg_policies','pg_proc','pg_language','information_schema.routine_privileges','storage.buckets','public.assets','public.creators','public.collections','public.blog_posts','public.asset_deliverables','public.asset_claims','unnest'
]);
const allowedFunctions = new Set([
  'jsonb_build_object','jsonb_agg','jsonb_build_array','array_to_string','coalesce','nullif','btrim','unnest','string_agg','pg_get_constraintdef','pg_get_function_identity_arguments','pg_get_function_result','count','lower','gin'
]);
const sqlKeywords = new Set(['select','with','where','as','in','values','order','filter','and','or','from','join','on','by','case','when','then','else','end','not','exists','null','true','false']);

export function stripCommentsPreserveSql(sql) {
  let out = '';
  for (let i = 0; i < sql.length;) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "'") {
      out += ch; i++;
      while (i < sql.length) {
        out += sql[i];
        if (sql[i] === "'" && sql[i + 1] === "'") { out += sql[i + 1]; i += 2; continue; }
        if (sql[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === '"') {
      out += ch; i++;
      while (i < sql.length) {
        out += sql[i];
        if (sql[i] === '"' && sql[i + 1] === '"') { out += sql[i + 1]; i += 2; continue; }
        if (sql[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === '$') {
      const tag = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) { out += sql.slice(i); break; }
        out += sql.slice(i, end + tag.length); i = end + tag.length; continue;
      }
    }
    if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  '; i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) { out += sql[i] === '\n' ? '\n' : ' '; i++; }
      if (i < sql.length) { out += '  '; i += 2; }
      continue;
    }
    out += ch; i++;
  }
  return out;
}

export function maskQuotedContent(sql) {
  let out = '';
  for (let i = 0; i < sql.length;) {
    const ch = sql[i];
    if (ch === "'" || ch === '"') {
      const quote = ch; out += quote; i++;
      while (i < sql.length) {
        if (sql[i] === quote && sql[i + 1] === quote) { out += '  '; i += 2; continue; }
        if (sql[i] === quote) { out += quote; i++; break; }
        out += sql[i] === '\n' ? '\n' : ' '; i++;
      }
      continue;
    }
    if (ch === '$') {
      const tag = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        const text = end === -1 ? sql.slice(i) : sql.slice(i, end + tag.length);
        out += text.replace(/[^\n]/g, ' '); i += text.length; continue;
      }
    }
    out += ch; i++;
  }
  return out;
}

export function splitStatements(sql) {
  const clean = stripCommentsPreserveSql(sql);
  const statements = [];
  let start = 0;
  for (let i = 0; i < clean.length;) {
    const ch = clean[i];
    if (ch === "'" || ch === '"') {
      const quote = ch; i++;
      while (i < clean.length) {
        if (clean[i] === quote && clean[i + 1] === quote) { i += 2; continue; }
        if (clean[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === '$') {
      const tag = clean.slice(i).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
      if (tag) { const end = clean.indexOf(tag, i + tag.length); i = end === -1 ? clean.length : end + tag.length; continue; }
    }
    if (ch === ';') { const s = clean.slice(start, i).trim(); if (s) statements.push(s); start = i + 1; }
    i++;
  }
  const tail = clean.slice(start).trim(); if (tail) statements.push(tail);
  return statements;
}

function firstKeyword(statement) { return maskQuotedContent(statement).trim().match(/^\(?\s*([a-z_]+)/i)?.[1]?.toLowerCase(); }
function topLevelForbidden(statement) {
  const masked = maskQuotedContent(statement).toLowerCase();
  const first = firstKeyword(statement);
  if (first && forbiddenTopLevel.has(first)) return first;
  const phrase = masked.match(forbiddenPhrasePattern)?.[1];
  if (phrase) return phrase;
  const writable = masked.match(writableCtePattern)?.[1];
  if (writable) return `writable cte ${writable}`;
  return null;
}

export function validateKnownReadOnlyAuditAccess(sql) {
  const errors = [];
  const masked = maskQuotedContent(stripCommentsPreserveSql(sql));
  const cteNames = new Set([...masked.matchAll(/(?:with|,)\s+([a-z_][a-z0-9_]*)\s+as\s*\(/gi)].map(m => m[1].toLowerCase()));
  const relationMatches = [...masked.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi)].map(m => m[1].toLowerCase());
  for (const relation of relationMatches) if (!allowedRelations.has(relation) && !cteNames.has(relation)) errors.push(`Unknown audit relation: ${relation}`);
  const fnMatches = [...masked.matchAll(/\b([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)\s*\(/gi)].map(m => m[1].toLowerCase()).filter(name => !sqlKeywords.has(name));
  for (const fn of fnMatches) if (!allowedFunctions.has(fn)) errors.push(`Unknown audit function: ${fn}`);
  return [...new Set(errors)];
}

export function validateReadOnlySelectAudit(sql) {
  const errors = [];
  for (const [index, statement] of splitStatements(sql).entries()) {
    const keyword = firstKeyword(statement);
    if (!['select','with'].includes(keyword)) errors.push(`Statement ${index + 1} is not SELECT/WITH-only.`);
    const forbidden = topLevelForbidden(statement);
    if (forbidden) errors.push(`Statement ${index + 1} contains forbidden top-level operation: ${forbidden}.`);
  }
  errors.push(...validateKnownReadOnlyAuditAccess(sql));
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
  console.log(`Audit safety validation passed: ${splitStatements(sql).length} SELECT-only statement(s).`);
  console.log('Note: SELECT-only validation cannot prove arbitrary called functions are side-effect free; this audit is additionally restricted to a known catalog/read-only allowlist.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
