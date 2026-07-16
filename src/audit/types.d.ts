declare module '../../scripts/audit-safety.mjs' {
  export function validateReadOnlySelectAudit(sql: string): string[];
}
declare module '../../scripts/compare-production-audit.mjs' {
  export function compareAudit(options?: { auditJson?: unknown; migrationsDir?: string }): Promise<{
    status: string;
    confirmedMatches: string[];
    missingObjects: string[];
    unexpectedObjects: string[];
    differencesRequiringManualReview: string[];
    notVerified: string[];
  }>;
}
