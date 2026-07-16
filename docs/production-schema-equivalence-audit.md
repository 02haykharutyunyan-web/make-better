# Production schema equivalence audit kit

This kit compares the manually configured production Supabase schema with the repository migrations before migration history is established. It is intentionally read-only and does **not** authorize production repair.

## Safety rules

- Do not connect the CLI or scripts in this repository to production Supabase.
- Do not run remote SQL from this repository.
- Do not run `db push`, `db reset`, `migration repair`, seeds, DDL, DML, grants, revokes, or transaction-changing statements.
- Running the audit does not create a baseline, does not mark migrations as applied, and does not establish migration history.
- No production repair is authorized by this task.

## Manual audit steps in Supabase SQL Editor

1. Open the production Supabase dashboard and go to SQL Editor.
2. Copy the contents of `supabase/audit/production_schema_equivalence_audit.sql` into a new query.
3. Review that every statement begins with `select` and only reads catalog metadata, storage bucket metadata for `asset-deliverables`, storage policy metadata, and aggregate demo seed counts.
4. Run the query manually in SQL Editor.
5. Export the result grid as JSON or CSV. JSON is preferred because it can be passed directly to the comparison script.

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
- Public function `EXECUTE` grants for relevant API roles.
- Storage bucket metadata for `asset-deliverables` only.
- Storage policies relevant to `asset-deliverables`.
- Existence-only aggregate counts for expected demo seed records, without exporting row contents.

## Automated safety check

Run this before copying the audit into SQL Editor:

```sh
npm run audit:safety
```

The checker fails if any executable statement is not `SELECT`/`WITH` or contains DDL, DML, migration repair, transaction-changing, or privilege-changing tokens.

## Repository-side comparison

After exporting the SQL Editor results as JSON, run:

```sh
npm run audit:compare -- path/to/production-audit-export.json
```

If no export is provided, the script reports production as `not verified`. The script reports confirmed matches, missing objects, unexpected objects, differences requiring manual review, and items that cannot be verified statically. It does not assume production matches.

## Limitations

The comparison script can statically compare object names and enum values extracted from migrations against the exported audit. Detailed column defaults, constraint bodies, function bodies, grants, RLS expressions, storage policy expressions, and whether demo seed counts are semantically sufficient require manual review of the exported audit rows.
