# Production schema reconciliation report — 2026-07-16

## Safety boundary

This report is repository-only preparation for a future, separately approved production repair. Production Supabase must not be connected to from this task, and no remote SQL, `supabase db push`, `db reset`, migration repair, migration up, seed, linked-project command, migration-history modification, data change, schema change, policy change, grant change, storage change, bucket change, or PR merge is authorized by this work.

## Production migration-history state

Production was originally configured manually through the Supabase SQL Editor. The relation `supabase_migrations.schema_migrations` does not exist in production. Because production has no Supabase-managed migration-history relation, historical repository migrations must not be replayed, marked as applied, or repaired blindly.

## Audit source

PR #3 added a SELECT-only production schema equivalence audit and repository-side comparator. The production audit was run manually in Supabase SQL Editor and returned one `audit_result` JSON object. That export was reviewed outside this repository task; no production connection was made here.

## Confirmed matching production objects

The manual audit result confirmed these objects are present and match the repository expectations at the static inventory level:

- Required schemas: `auth`, `extensions`, `public`, and `storage`.
- `pgcrypto` extension.
- Public tables: `profiles`, `creators`, `assets`, `asset_claims`, `reviews`, `blog_posts`, `collections`, `asset_deliverables`, and `asset_access_requests`.
- Enums and values: `user_role`, `asset_status`, `price_type`, `claim_status`, `publish_status`, `delivery_type`, and `access_request_status`.
- RLS enabled on every audited public table.
- Private `asset-deliverables` storage bucket.
- Storage access policies for the deliverables bucket.
- Expected demo seed slugs: three creator slugs and nine asset slugs.
- Main public policies and public `updated_at` triggers.

## Confirmed production differences

The audit did not find these repository-expected objects:

1. Function `public.can_access_asset_delivery(target_asset_id uuid)`.
2. Index `collections_related_tags_idx`.
3. Index `assets_tags_idx`.

## Comparator limitations fixed

The comparator now distinguishes expected explicit migration indexes from constraint-backed primary-key and unique indexes. Constraint-backed indexes are not treated as unexpected drift merely because they were not created by an explicit `CREATE INDEX` migration statement, while genuinely unexpected explicit indexes are still reported.

The comparator also preserves trigger target schema/table while parsing migrations. The `auth.users` trigger `on_auth_user_created` is not reported as a missing public trigger because the production audit inventories public triggers only. It is now classified as not verified by this public-trigger audit and remains a manual-review item unless an explicit auth-trigger audit is added.

## Manual-review areas

Static comparison still cannot fully prove equivalence for column definitions, constraint bodies, RLS expressions, policy expressions, function bodies, function search paths/security modes, grant semantics, storage policy semantics, or seed-record sufficiency. These areas remain manual review even when object names match.

## Safe forward-only repair preparation

A new forward-only migration has been prepared with only the confirmed missing objects. It does not replay historical migrations, does not manipulate migration history, does not recreate tables, does not delete or rewrite data, and does not replace broad policies. The function uses `CREATE FUNCTION` without `OR REPLACE` intentionally, so execution fails closed if a same-signature function appears before repair execution. Because PostgreSQL grants `EXECUTE` on new functions to `PUBLIC` by default, the migration explicitly revokes execution from `PUBLIC` and `anon`, then grants execution only to `authenticated`; no explicit `service_role` execute grant is included because it is not required for the gated authenticated-user access path being repaired.

## Safe rollout sequence

1. Before any production change, obtain explicit human approval for this repair and a current production backup/recovery point.
2. Run the SELECT-only preflight SQL from `supabase/audit/task_1d_repair_preflight.sql` manually in Supabase SQL Editor and save the metadata-only result.
3. Confirm `ready_for_repair` is true. This requires `function_missing`, `collections_index_missing`, `assets_index_missing`, and `required_dependencies_present` all to be true. If any readiness boolean is false, stop and review; do not run the repair.
4. Apply only the forward-only repair statements from the new migration through the approved production change process. Do not run historical migrations and do not run migration-history repair.
5. Run the SELECT-only verification SQL from `supabase/audit/task_1d_repair_verification.sql` manually in Supabase SQL Editor.
6. Confirm the function signature, return type, security mode, search path, explicit privilege booleans (`authenticated` has `EXECUTE`, `PUBLIC` does not, and `anon` does not), exact index table/access-method/column definitions, RLS state, storage policy state, and bucket state.
7. Archive the preflight, executed repair SQL, verification result, approval, and backup reference in the production change record.
8. Only after schema equivalence and an approved baseline-history strategy are established should future Supabase migration-history work be considered.

## Rollback and recovery considerations

The prepared repair is additive/idempotent where reasonable. If an issue is discovered before execution, do not execute the repair. If an issue is discovered after execution, use the production backup/recovery plan and a separate reviewed rollback plan; do not improvise destructive SQL in production. Because the function is created with `CREATE FUNCTION` without `OR REPLACE`, a concurrent or unexpected same-signature function causes the repair to fail rather than overwrite production state. The indexes use `CREATE INDEX IF NOT EXISTS`, but production execution still requires approval and verification.

## Data handling

The report and new audit files intentionally avoid secrets, credentials, user rows, emails, private storage paths, customer data, storage object contents, and row-level customer records. The preflight and verification SQL return only object metadata and aggregate/catalog state.
