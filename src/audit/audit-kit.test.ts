import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateReadOnlySelectAudit } from '../../scripts/audit-safety.mjs';
import { compareAudit } from '../../scripts/compare-production-audit.mjs';

describe('production audit safety checker', () => {
  it('accepts SELECT-only statements', () => {
    const fixture = readFileSync('src/audit/fixtures/select-only-audit.sql', 'utf8');
    expect(validateReadOnlySelectAudit(fixture)).toEqual([]);
  });

  it('rejects schema, data, transaction, and privilege changing statements', () => {
    const fixture = readFileSync('src/audit/fixtures/unsafe-audit.sql', 'utf8');
    const errors = validateReadOnlySelectAudit(fixture);
    expect(errors.join('\n')).toMatch(/forbidden token: alter/i);
    expect(errors.join('\n')).toMatch(/forbidden token: grant/i);
    expect(errors.join('\n')).toMatch(/forbidden token: insert/i);
    expect(errors.join('\n')).toMatch(/forbidden token: commit/i);
  });
});

describe('production audit comparison', () => {
  it('reports not verified when no production export is provided', async () => {
    await expect(compareAudit()).resolves.toMatchObject({ status: 'not verified', notVerified: ['production audit export was not provided'] });
  });

  it('reports matches, missing objects, unexpected objects, and enum differences', async () => {
    const auditJson = JSON.parse(readFileSync('src/audit/fixtures/partial-production-audit.json', 'utf8'));
    const report = await compareAudit({ auditJson });

    expect(report.confirmedMatches).toContain('extensions:pgcrypto');
    expect(report.missingObjects).toContain('tables:assets');
    expect(report.unexpectedObjects).toContain('tables:unexpected_table');
    expect(report.differencesRequiringManualReview.join('\n')).toMatch(/enums:user_role/);
  });
});
