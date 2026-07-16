import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { splitStatements, validateKnownReadOnlyAuditAccess, validateReadOnlySelectAudit } from '../../scripts/audit-safety.mjs';
import { compareAudit, expectedFromMigrations } from '../../scripts/compare-production-audit.mjs';

async function completeMatchingExport() {
  const expected = await expectedFromMigrations('supabase/migrations');
  return {
    audit_result: {
      schemas: [],
      extensions: expected.extensions.map((name) => ({ name })),
      public_enums: expected.enums.flatMap((e) => e.values.map((value) => ({ enum_name: e.name, value }))),
      public_columns: expected.tables.map((table_name) => ({ table_name })),
      public_constraints: [],
      public_indexes: expected.indexes.map((index_name) => ({ index_name })),
      public_triggers: expected.triggers.map((t) => {
        const [table_name, trigger_name] = t.split('.');
        return { table_name, trigger_name };
      }),
      public_rls: [],
      public_policies: expected.policies.map((p) => {
        const [table_name, ...name] = p.split('.');
        return { table_name, policy_name: name.join('.') };
      }),
      public_functions: expected.functions.map((function_name) => ({ function_name })),
      public_function_grants: [],
      asset_deliverables_bucket: expected.storageBuckets.map((id) => ({ id })),
      storage_policies: [],
      demo_seed_existence: [],
    },
  };
}

describe('production audit safety checker', () => {
  it('accepts SELECT-only statements and preserves semicolons and forbidden words in strings', () => {
    const fixture = readFileSync('src/audit/fixtures/select-only-audit.sql', 'utf8');
    expect(splitStatements(fixture)).toHaveLength(2);
    expect(validateReadOnlySelectAudit(fixture)).toEqual([]);
  });

  it('rejects schema, data, transaction, privilege changing statements, and writable CTEs', () => {
    const fixture = readFileSync('src/audit/fixtures/unsafe-audit.sql', 'utf8');
    const errors = validateReadOnlySelectAudit(fixture);
    expect(errors.join('\n')).toMatch(/alter/i);
    expect(errors.join('\n')).toMatch(/grant/i);
    expect(errors.join('\n')).toMatch(/insert/i);
    expect(errors.join('\n')).toMatch(/commit/i);
    expect(errors.join('\n')).toMatch(/writable cte update/i);
  });

  it('ignores real comments without treating comment markers inside quotes or dollar text as comments', () => {
    const sql = "select '-- not a comment; create set execute' as one; /* real ; comment */ select $$/* not comment; */ execute$$ as two; -- real comment ; create\n select 'escaped '' quote ; set' as three;";
    expect(splitStatements(sql)).toHaveLength(3);
    expect(validateReadOnlySelectAudit(sql)).toEqual([]);
  });

  it('rejects unknown relations and unknown called functions in the committed audit allowlist check', () => {
    expect(validateKnownReadOnlyAuditAccess('select unsafe_function() from public.secrets;')).toEqual([
      'Unknown audit relation: public.secrets',
      'Unknown audit function: unsafe_function',
    ]);
  });
});

describe('production audit comparison', () => {
  it('reports not verified when no production export is provided', async () => {
    await expect(compareAudit()).resolves.toMatchObject({ status: 'not verified', notVerified: ['production audit export was not provided'] });
  });

  it('complete matching export reports expected confirmed matches', async () => {
    const report = await compareAudit({ auditJson: await completeMatchingExport() });
    expect(report.missingObjects).toEqual([]);
    expect(report.unexpectedObjects).toEqual([]);
    expect(report.confirmedMatches).toContain('extensions:pgcrypto');
    expect(report.confirmedMatches).toContain('storageBuckets:asset-deliverables');
    expect(report.confirmedMatches).toContain('enums:user_role');
  });

  it('partial export reports missing and unexpected objects', async () => {
    const auditJson = JSON.parse(readFileSync('src/audit/fixtures/partial-production-audit.json', 'utf8'));
    const report = await compareAudit({ auditJson });
    expect(report.confirmedMatches).toContain('extensions:pgcrypto');
    expect(report.missingObjects).toContain('tables:assets');
    expect(report.unexpectedObjects).toContain('tables:unexpected_table');
    expect(report.differencesRequiringManualReview.join('\n')).toMatch(/enums:user_role/);
  });

  it('handles empty sections as empty arrays', async () => {
    const exportJson = await completeMatchingExport();
    exportJson.audit_result.public_indexes = [];
    const report = await compareAudit({ auditJson: exportJson });
    expect(report.missingObjects.some((item) => item.startsWith('indexes:'))).toBe(true);
  });

  it('malformed or unknown export shape fails clearly', async () => {
    await expect(compareAudit({ auditJson: { rows: [] } })).rejects.toThrow(/Malformed audit export/);
    await expect(compareAudit({ auditJson: { audit_result: { extensions: null } } })).rejects.toThrow(/section extensions must be an array/);
  });

  it('does not confirm detailed manual-review categories as matches', async () => {
    const report = await compareAudit({ auditJson: await completeMatchingExport() });
    expect(report.notVerified).toEqual(expect.arrayContaining([
      'public_columns',
      'public_constraints',
      'public_rls',
      'public_function_grants',
      'storage_policies',
      'demo_seed_existence',
    ]));
    expect(report.confirmedMatches.some((item) => item.startsWith('public_columns:'))).toBe(false);
    expect(report.confirmedMatches.some((item) => item.startsWith('public_constraints:'))).toBe(false);
  });
});
