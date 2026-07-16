declare module '../../scripts/audit-safety.mjs' {
  export function splitStatements(sql: string): string[];
  export function validateKnownReadOnlyAuditAccess(sql: string): string[];
  export function validateReadOnlySelectAudit(sql: string): string[];
}
declare module '../../scripts/compare-production-audit.mjs' {
  export function expectedFromMigrations(dir: string): Promise<{
    extensions: string[];
    storageBuckets: string[];
    enums: Array<{ name: string; values: string[] }>;
    tables: string[];
    functions: string[];
    indexes: string[];
    policies: string[];
    triggers: string[];
  }>;
  export function normalizeAudit(input: unknown): { functionGrants: Array<Record<string, unknown>> };
  export function compareAudit(options?: { auditJson?: unknown; migrationsDir?: string }): Promise<{
    status: string;
    confirmedMatches: string[];
    missingObjects: string[];
    unexpectedObjects: string[];
    differencesRequiringManualReview: string[];
    notVerified: string[];
  }>;
}
