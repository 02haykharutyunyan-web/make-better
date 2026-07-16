# Production schema equivalence audit kit

This kit compares the manually configured production Supabase schema with the repository migrations before migration history is established. It is intentionally read-only and does **not** authorize production repair.

## Safety rules

- Do not connect the CLI or scripts in this repository to production Supabase.
- Do not run remote SQL from this repository.
- Do not run `db push`, `db reset`, `migration repair`, seeds, DDL, DML, grants, revokes, or transaction-changing statements.
- Running the audit does not create a baseline, does not mark migrations as applied, and does not establish migration history.
- No production repair is authorized by this task.
- SELECT-only validation cannot prove arbitrary called functions are side-effect free; the committed audit is additionally restricted by `npm run audit:safety` to known catalog/read-only relations and functions.

## Manual audit steps in Supabase SQL Editor

1. Run `npm run audit:safety` locally against the committed audit file.
2. Open the production Supabase dashboard and go to SQL Editor.
3. Copy the contents of `supabase/audit/production_schema_equivalence_audit.sql` into a new query.
4. Confirm the query contains exactly one executable statement and that it starts with `select jsonb_build_object(...)`.
5. Run the query manually in SQL Editor.
6. The result grid should contain exactly one row and one column named `audit_result`.
7. Open the JSON cell value, copy the full JSON object, and save it as `production-audit-export.json`. If Supabase exports the grid as an array with one row, keep the shape `[ { "audit_result": { ... } } ]`; the comparator accepts both that exported grid shape and the direct JSON object.
8. Run `npm run audit:compare -- path/to/production-audit-export.json` locally.

## Expected top-level JSON shape

Preferred direct JSON document:

```json
{
  "schemas": [],
  "extensions": [],
  "public_enums": [],
  "public_columns": [],
  "public_constraints": [],
  "public_indexes": [],
  "public_triggers": [],
  "public_rls": [],
  "public_policies": [],
  "public_functions": [],
  "public_function_grants": [],
  "asset_deliverables_bucket": [],
  "storage_policies": [],
  "demo_seed_existence": []
}
```

Supabase grid export shape also accepted:

```json
[
  {
    "audit_result": {
      "schemas": [],
      "extensions": [],
      "public_enums": [],
      "public_columns": [],
      "public_constraints": [],
      "public_indexes": [],
      "public_triggers": [],
      "public_rls": [],
      "public_policies": [],
      "public_functions": [],
      "public_function_grants": [],
      "asset_deliverables_bucket": [],
      "storage_policies": [],
      "demo_seed_existence": []
    }
  }
]
```

Every section is always an array; sections with no rows export as `[]`, not `null`.

## Safe export and redaction

The audit is designed not to export customer/user rows, emails, credentials, tokens, secrets, asset contents, storage object contents, or private files. Before sharing results, still redact:

- Any accidental user/customer identifiers or emails included by manual edits.
- Project URLs, access tokens, service-role keys, JWT secrets, database passwords, API keys, or connection strings.
- Private storage object names or file contents if someone adds extra queries.
- Any business-sensitive counts you do not want shared outside the review group.

## Audit coverage

The audit inventories:

- Required schemas and `pgcrypto` extension state.
- Public enum names and ordered values.
- Public table columns, data types, nullability, defaults, precision, and scale.
- Primary keys, foreign keys, unique constraints, and check constraints.
- Public indexes.
- Public triggers.
- RLS enabled and forced state for public tables.
- Public RLS policies, commands, roles, `using`, and `with check` expressions.
- Public functions, identity arguments, return types, language, volatility, security-definer state, and configured `search_path`.
- Public function privileges for relevant API roles.
- Storage bucket metadata for `asset-deliverables` only.
- Storage policies relevant to `asset-deliverables`.
- Exact aggregate/existence checks for seed migration slugs: three creator slugs and nine asset slugs; no customer rows, private content, or full seeded rows are exported.

## Automated safety check

Run this before copying the audit into SQL Editor:

```sh
npm run audit:safety
```

The checker uses a small lexical scanner/state machine to recognize statement boundaries outside strings, comments, quoted identifiers, and dollar-quoted text. It fails if any executable statement is not `SELECT`/`WITH`, contains writable CTEs, uses DDL, DML, migration repair, transaction-changing, or privilege-changing operations, or references audit relations/functions outside the known catalog/read-only allowlist.

## Repository-side comparison

After exporting the SQL Editor results as JSON, run:

```sh
npm run audit:compare -- path/to/production-audit-export.json
```

If no export is provided, the script reports production as `not verified`. The script reports confirmed matches, missing objects, unexpected objects, differences requiring manual review, and items that cannot be verified statically. It does not assume production matches.

## Limitations

The comparison script can statically compare object names and enum values extracted from migrations against the exported audit. Detailed schemas, column definitions, constraint bodies, RLS state/expressions, function definitions/search path/security details, grants, storage policy expressions, and whether demo seed counts are semantically sufficient remain explicitly listed as manual review and are never reported as confirmed matches.
