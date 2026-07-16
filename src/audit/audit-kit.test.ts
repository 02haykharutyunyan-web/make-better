import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { splitStatements, validateKnownReadOnlyAuditAccess, validateReadOnlySelectAudit } from '../../scripts/audit-safety.mjs';
import { compareAudit, expectedFromMigrations, normalizeAudit } from '../../scripts/compare-production-audit.mjs';

async function completeMatchingExport() {
  const expected = await expectedFromMigrations('supabase/migrations');
  return {
    audit_result: {
      schemas: [],
      extensions: expected.extensions.map((name) => ({ name })),
      public_enums: expected.enums.flatMap((e) => e.values.map((value) => ({ enum_name: e.name, value }))),
      public_columns: expected.columns.map((column) => {
        const [table_name, column_name] = column.split('.');
        return { table_name, column_name };
      }),
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
      public_function_grants: [{ function_name: 'is_admin', grantee: 'PUBLIC', privilege_type: 'EXECUTE' }],
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



  it('uses matched status only when no static differences are detected', async () => {
    const report = await compareAudit({ auditJson: await completeMatchingExport() });
    expect(report.status).toBe('matched with manual review required');
  });

  it('uses differences status when drift is detected', async () => {
    const auditJson = JSON.parse(readFileSync('src/audit/fixtures/partial-production-audit.json', 'utf8'));
    const report = await compareAudit({ auditJson });
    expect(report.status).toBe('differences found');
  });

  it('preserves uppercase PUBLIC function grants in normalized audit review data', async () => {
    const exportJson = JSON.parse(readFileSync('src/audit/fixtures/partial-production-audit.json', 'utf8'));
    const normalized = normalizeAudit(exportJson);
    expect(normalized.functionGrants).toEqual(expect.arrayContaining([
      expect.objectContaining({ grantee: 'PUBLIC', privilege_type: 'EXECUTE' }),
    ]));
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
    expect(report.confirmedMatches).toContain('columns:collections.related_tags');
    expect(report.confirmedMatches.some((item) => item.startsWith('public_columns:'))).toBe(false);
    expect(report.confirmedMatches.some((item) => item.startsWith('public_constraints:'))).toBe(false);
  });
  it('ignores constraint-backed primary and unique indexes but reports unexpected explicit indexes', async () => {
    const exportJson = await completeMatchingExport();
    exportJson.audit_result.public_constraints = [
      { constraint_name: 'profiles_pkey', constraint_type: 'p' },
      { constraint_name: 'profiles_email_key', constraint_type: 'u' },
    ];
    exportJson.audit_result.public_indexes.push(
      { index_name: 'profiles_pkey' },
      { index_name: 'profiles_email_key' },
      { index_name: 'unexpected_explicit_idx' },
    );
    const report = await compareAudit({ auditJson: exportJson });
    expect(report.unexpectedObjects).not.toContain('indexes:profiles_pkey');
    expect(report.unexpectedObjects).not.toContain('indexes:profiles_email_key');
    expect(report.unexpectedObjects).toContain('indexes:unexpected_explicit_idx');
  });

  it('reports collections.related_tags from ALTER TABLE ADD COLUMN drift plus the Task 1E function and GIN indexes', async () => {
    const exportJson = await completeMatchingExport();
    exportJson.audit_result.public_columns = exportJson.audit_result.public_columns.filter((row) => !(row.table_name === 'collections' && row.column_name === 'related_tags'));
    exportJson.audit_result.public_functions = exportJson.audit_result.public_functions.filter((row) => row.function_name !== 'can_access_asset_delivery');
    exportJson.audit_result.public_indexes = exportJson.audit_result.public_indexes.filter((row) => !['collections_related_tags_idx', 'assets_tags_idx'].includes(row.index_name));
    const report = await compareAudit({ auditJson: exportJson });
    expect(report.status).toBe('differences found');
    expect(report.missingObjects).toEqual(expect.arrayContaining([
      'columns:collections.related_tags',
      'functions:can_access_asset_delivery',
      'indexes:collections_related_tags_idx',
      'indexes:assets_tags_idx',
    ]));
  });

  it('classifies auth.users trigger as not verified instead of missing public trigger', async () => {
    const expected = await expectedFromMigrations('supabase/migrations');
    expect(expected.authTriggers).toContain('users.on_auth_user_created');
    expect(expected.triggers).not.toContain('users.on_auth_user_created');
    const report = await compareAudit({ auditJson: await completeMatchingExport() });
    expect(report.missingObjects).not.toContain('triggers:users.on_auth_user_created');
    expect(report.notVerified).toContain('auth trigger not audited by public trigger audit:users.on_auth_user_created');
  });
});

describe('Task 1D repair assets', () => {
  it('preflight and verification SQL remain SELECT-only', () => {
    for (const file of ['supabase/audit/task_1d_repair_preflight.sql', 'supabase/audit/task_1d_repair_verification.sql']) {
      expect(validateReadOnlySelectAudit(readFileSync(file, 'utf8'))).toEqual([]);
    }
  });

  it('repair migration contains no migration-history repair operations or destructive SQL', () => {
    const sql = readFileSync('supabase/migrations/20260716000100_repair_confirmed_production_schema_drift.sql', 'utf8');
    expect(sql).not.toMatch(/supabase_migrations|schema_migrations|migration\s+repair|db\s+push|db\s+reset/i);
    expect(sql).not.toMatch(/\b(drop|delete|truncate|insert|update)\b/i);
    const alterStatements = sql.match(/alter\s+table[\s\S]*?;/gi) ?? [];
    expect(alterStatements).toEqual(["alter table public.collections\nadd column related_tags text[] not null default '{}'::text[];"]);
    expect(sql).not.toMatch(/add\s+column\s+if\s+not\s+exists/i);
    expect(sql).toMatch(/create function public\.can_access_asset_delivery/);
    expect(sql).not.toMatch(/create or replace function public\.can_access_asset_delivery/i);
    const addColumn = sql.indexOf("alter table public.collections\nadd column related_tags text[] not null default '{}'::text[];");
    const createFunction = sql.indexOf('create function public.can_access_asset_delivery(target_asset_id uuid)');
    const collectionsIndex = sql.indexOf('create index if not exists collections_related_tags_idx');
    const assetsIndex = sql.indexOf('create index if not exists assets_tags_idx');
    expect(addColumn).toBeGreaterThan(-1);
    expect(createFunction).toBeGreaterThan(addColumn);
    const revokePublic = sql.indexOf('revoke all on function public.can_access_asset_delivery(uuid) from public;');
    const revokeAnon = sql.indexOf('revoke all on function public.can_access_asset_delivery(uuid) from anon;');
    const grantAuthenticated = sql.indexOf('grant execute on function public.can_access_asset_delivery(uuid) to authenticated;');
    expect(revokePublic).toBeGreaterThan(-1);
    expect(revokeAnon).toBeGreaterThan(revokePublic);
    expect(grantAuthenticated).toBeGreaterThan(revokeAnon);
    expect(collectionsIndex).toBeGreaterThan(grantAuthenticated);
    expect(assetsIndex).toBeGreaterThan(collectionsIndex);
  });

  it('preflight readiness and verification privilege checks are explicit fail-closed booleans', () => {
    const preflight = readFileSync('supabase/audit/task_1d_repair_preflight.sql', 'utf8');
    expect(preflight).toMatch(/'related_tags_column_missing'/);
    expect(preflight).toMatch(/not exists \([\s\S]*table_name = 'collections'[\s\S]*column_name = 'related_tags'/);
    expect(preflight).toMatch(/'function_missing'/);
    expect(preflight).toMatch(/'collections_index_missing'/);
    expect(preflight).toMatch(/'assets_index_missing'/);
    expect(preflight).toMatch(/'base_dependencies_present'/);
    expect(preflight).toMatch(/'ready_for_repair'/);
    expect(preflight).toMatch(/state\.related_tags_column_missing and state\.function_missing and state\.collections_index_missing and state\.assets_index_missing and state\.base_dependencies_present/);

    const verification = readFileSync('supabase/audit/task_1d_repair_verification.sql', 'utf8');
    expect(verification).toMatch(/'related_tags_column_matches_expected_definition'/);
    expect(verification).toMatch(/data_type = 'ARRAY'/);
    expect(verification).toMatch(/udt_name = '_text'/);
    expect(verification).toMatch(/is_nullable = 'NO'/);
    expect(verification).toMatch(/column_default in/);
    expect(verification).toMatch(/'relevant_rls_enabled'/);
    expect(verification).toMatch(/'asset_deliverables_storage_policy_present'/);
    expect(verification).toMatch(/'asset_deliverables_bucket_private'/);
    expect(verification).toMatch(/'authenticated_has_execute'/);
    expect(verification).toMatch(/'public_execute_revoked'/);
    expect(verification).toMatch(/'anon_execute_revoked'/);
    expect(verification).toMatch(/not state\.public_has_execute/);
    expect(verification).toMatch(/not state\.anon_has_execute/);
    expect(verification).toMatch(/indexdef = 'CREATE INDEX collections_related_tags_idx ON public\.collections USING gin \(related_tags\)'/);
    expect(verification).toMatch(/indexdef = 'CREATE INDEX assets_tags_idx ON public\.assets USING gin \(tags\)'/);
  });

});
