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

The audit/preflight reconciliation has confirmed exactly these four repository-expected objects are missing in production:

1. Column `public.collections.related_tags`.
2. Function `public.can_access_asset_delivery(target_asset_id uuid)`.
3. Index `collections_related_tags_idx`.
4. Index `assets_tags_idx`.

## Comparator limitations fixed

The comparator now distinguishes expected explicit migration indexes from constraint-backed primary-key and unique indexes. Constraint-backed indexes are not treated as unexpected drift merely because they were not created by an explicit `CREATE INDEX` migration statement, while genuinely unexpected explicit indexes are still reported.

The comparator also preserves trigger target schema/table while parsing migrations. The `auth.users` trigger `on_auth_user_created` is not reported as a missing public trigger because the production audit inventories public triggers only. It is now classified as not verified by this public-trigger audit and remains a manual-review item unless an explicit auth-trigger audit is added.

## Manual-review areas

Static comparison still cannot fully prove equivalence for column definitions, constraint bodies, RLS expressions, policy expressions, function bodies, function search paths/security modes, grant semantics, storage policy semantics, or seed-record sufficiency. These areas remain manual review even when object names match.

## Safe forward-only repair preparation

A new forward-only migration has been prepared with only the four confirmed missing objects: `public.collections.related_tags`, `public.can_access_asset_delivery(target_asset_id uuid)`, `collections_related_tags_idx`, and `assets_tags_idx`. It does not replay historical migrations, does not manipulate migration history, does not recreate tables, does not delete or rewrite data, and does not replace broad policies. The `related_tags` column is added first with fail-closed `ALTER TABLE ... ADD COLUMN` SQL and no `IF NOT EXISTS`. The function uses `CREATE FUNCTION` without `OR REPLACE` intentionally, so execution fails closed if a same-signature function appears before repair execution. Because PostgreSQL grants `EXECUTE` on new functions to `PUBLIC` by default, the migration explicitly revokes execution from `PUBLIC` and `anon`, then grants execution only to `authenticated`; no explicit `service_role` execute grant is included because it is not required for the gated authenticated-user access path being repaired.

## Safe rollout sequence

1. Before any production change, obtain explicit human approval for this repair and a current production backup/recovery point.
2. Run the SELECT-only preflight SQL from `supabase/audit/task_1d_repair_preflight.sql` manually in Supabase SQL Editor and save the metadata-only result.
3. Confirm the preflight returns exactly these current Task 1E readiness fields: `related_tags_column_missing`, `function_missing`, `collections_index_missing`, `assets_index_missing`, `base_dependencies_present`, and `ready_for_repair`.
4. Confirm `ready_for_repair` is true using this exact expression:

   ```text
   ready_for_repair =
     related_tags_column_missing
     AND function_missing
     AND collections_index_missing
     AND assets_index_missing
     AND base_dependencies_present
   ```

   If any readiness boolean is false, stop immediately and review; do not run the repair.
5. Apply only the forward-only repair statements from the new migration through the approved production change process. Do not run historical migrations and do not run migration-history repair.
6. Run the SELECT-only verification SQL from `supabase/audit/task_1d_repair_verification.sql` manually in Supabase SQL Editor.
7. Confirm the function signature, return type, security mode, search path, explicit privilege booleans (`authenticated` has `EXECUTE`, `PUBLIC` does not, and `anon` does not), exact index table/access-method/column definitions, RLS state, storage policy state, and bucket state.
8. Archive the preflight, executed repair SQL, verification result, approval, and backup reference in the production change record.
9. Only after schema equivalence and an approved baseline-history strategy are established should future Supabase migration-history work be considered.

## Rollback and recovery considerations

The prepared repair is additive/idempotent where reasonable, except the approved fail-closed `ALTER TABLE ... ADD COLUMN` intentionally does not use `IF NOT EXISTS`. `ALTER TABLE ... ADD COLUMN` may acquire a table lock; do not claim or assume zero downtime. Run the repair only after a fresh successful preflight, during an approved low-traffic maintenance window, and with a current production backup/recovery point. Stop immediately if any preflight readiness boolean is false. Do not run `db push`, migration replay, migration repair, or migration-history modifications. If an issue is discovered before execution, do not execute the repair. If an issue is discovered after execution, use the production backup/recovery plan and a separate reviewed rollback plan; do not improvise destructive SQL in production. Because the function is created with `CREATE FUNCTION` without `OR REPLACE`, a concurrent or unexpected same-signature function causes the repair to fail rather than overwrite production state. The indexes use `CREATE INDEX IF NOT EXISTS`, but production execution still requires approval and verification.

## Data handling

The report and new audit files intentionally avoid secrets, credentials, user rows, emails, private storage paths, customer data, storage object contents, and row-level customer records. The preflight and verification SQL return only object metadata and aggregate/catalog state.

## Task 1E preflight stop and repair amendment

The manually run SELECT-only Task 1D preflight returned `ready_for_repair=false` before the Task 1E fields existed. Interpreted against the current Task 1E model, the repaired rollout must now use `related_tags_column_missing`, `function_missing`, `collections_index_missing`, `assets_index_missing`, `base_dependencies_present`, and `ready_for_repair`. The original stop condition worked as intended: it prevented execution of an incomplete repair before any production SQL was run.

The preflight result listed only 12 of the 13 expected dependency columns. Follow-up review confirmed a newly discovered production drift object: `public.collections.related_tags` is also missing. The confirmed production drift set now totals exactly four objects:

1. Missing `public.collections.related_tags`.
2. Missing `public.can_access_asset_delivery(target_asset_id uuid)`.
3. Missing `collections_related_tags_idx`.
4. Missing `assets_tags_idx`.

The existing repair migration `supabase/migrations/20260716000100_repair_confirmed_production_schema_drift.sql` is amended in place only because it has never been executed anywhere and has not been recorded in production migration history. This is an exceptional case to avoid creating a second repair migration with a confusing dependency order. If any evidence appears that the repair migration was executed or recorded, stop immediately and create a new forward-only migration instead of editing this file.

The amended repair remains unexecuted. The current Task 1E preflight requires the exact four-object drift state before readiness is true:

```text
ready_for_repair =
  related_tags_column_missing
  AND function_missing
  AND collections_index_missing
  AND assets_index_missing
  AND base_dependencies_present
```

`base_dependencies_present` covers dependencies other than those four repair targets.
