# Supabase migration guide

This project keeps Supabase migrations deterministic by using unique 14-digit Supabase timestamp versions in the format `YYYYMMDDHHMMSS_description.sql`. The time portion is an intra-day sequence and must increase in dependency order.

## Dependency map

| Order | Migration | Creates/changes | Depends on | Notes |
| --- | --- | --- | --- | --- |
| 1 | `20260517000100_phase_1_marketplace_schema.sql` | `pgcrypto`; enums `user_role`, `asset_status`, `price_type`, `claim_status`, `publish_status`; tables `profiles`, `creators`, `assets`, `asset_claims`, `reviews`, `blog_posts`, `collections`; foreign keys among those tables; core indexes; `set_updated_at`, `current_user_role`, `is_admin`, `handle_new_auth_user`; auth trigger; RLS policies. | Supabase `auth` and `storage` schemas supplied by the platform. | Base schema. Must run before every later migration. |
| 2 | `20260517000200_admin_creator_featured.sql` | Adds `creators.featured`; adds `creators_featured_idx`. | `creators`. | Later frontend types include this column. |
| 3 | `20260517000300_phase_3_asset_delivery.sql` | enum `delivery_type`; table `asset_deliverables`; FK to `assets`; indexes; trigger; RLS policies; private storage bucket `asset-deliverables`; storage object policies. | `assets`, `creators`, `asset_claims`, `set_updated_at`, `is_admin`, Supabase Storage. | Bucket remains private. |
| 4 | `20260517000400_free_waitlist_mode.sql` | enum `access_request_status`; table `asset_access_requests`; FKs to `assets` and `profiles`; indexes; trigger; RLS policies. | `assets`, `profiles`, `creators`, `set_updated_at`, `is_admin`. | Free/waitlist mode only; no Stripe. |
| 5 | `20260517000500_fix_admin_profiles_visibility.sql` | Replaces admin profile read/update policies. | `profiles`, `is_admin`. | Policy-only production repair. |
| 6 | `20260517000600_fix_creator_asset_submission_rls.sql` | Replaces `handle_new_auth_user`; replaces asset insert/update/select policies. | `user_role`, `profiles`, `creators`, `assets`, `is_admin`. | Keeps creator asset access scoped through `creators.profile_id = auth.uid()`. |
| 7 | `20260517000700_fix_gated_delivery_access.sql` | Adds `can_access_asset_delivery`; grants execute; replaces deliverable read policy and storage read policy. | `asset_deliverables`, `assets`, `creators`, `asset_claims`, `is_admin`, Storage policies. | Keeps delivery metadata and files gated to admins, creators, and entitled buyers. |
| 8 | `20260517000800_seed_marketplace_demo_data.sql` | Drops `creators.profile_id` NOT NULL for demo creators; upserts demo `creators` and `assets`. | `creators`, `assets`, `asset_status`, `price_type`. | Demo seed records are preserved and idempotent by slug. |
| 9 | `20260518000100_collection_related_tags.sql` | Adds `collections.related_tags`; GIN indexes on `collections.related_tags` and `assets.tags`. | `collections`, `assets`. | Supports collection discovery filters. |

## Initializing a new environment

1. Create a new Supabase project or local Supabase stack.
2. Apply migrations in lexicographic order from `supabase/migrations` only.
3. If the Supabase CLI and Docker are available, verify from zero with:

```sh
supabase db reset
npm run validate:migrations
npm run typecheck
npm run lint
npm test
npm run build
```

Do not connect these commands to the production Supabase project while testing migration changes.

## Applying future migrations

- Add one new file per schema change using Supabase’s `<timestamp>_<name>.sql` convention, with the timestamp formatted as `YYYYMMDDHHMMSS`.
- Choose a timestamp so the file sorts after everything it depends on; changes that build on earlier migrations must have later timestamps.
- Prefer idempotent `alter table ... add column if not exists`, `create index if not exists`, `drop policy if exists`, and `create or replace function` for repair migrations.
- Any `security definer` function must set an explicit `search_path`.
- Run `npm run validate:migrations` before committing.

## Production release gate

**Do not apply these migrations to production until existing migration history has been exported and reconciled.**

Supabase migration files follow the `<timestamp>_<name>.sql` convention; the CLI examples use 14-digit timestamps such as `20230306095710_schema_test.sql`, and migration history is tracked by the timestamp/version prefix. The currently verified production state is that production has no `supabase_migrations.schema_migrations` relation, and the existing schema appears to have been applied manually rather than through Supabase-managed migration history.

Because there is no recorded production migration history to reconcile against, no production `db push`, migration replay, or history repair is allowed until schema equivalence has been verified against production with read-only inspection and a reviewed baseline history has been established. Merging repository files alone does not authorize production migration execution.

If old `20260517_*` or `20260518_*` versions are later found in another environment, renamed files with new timestamp prefixes are different migration versions and may be treated as pending. Replaying them could fail on already-created objects or mutate policy/function definitions unexpectedly. If production history cannot be established safely, the safest alternative is to keep already-applied migration filenames unchanged for that environment and add a new forward-only migration that documents/repairs any remaining drift instead of replaying historical files.

## Production migration reconciliation

This branch renames migration files to deterministic unique versions. Do **not** replay these files against production while production has no `supabase_migrations.schema_migrations` relation and appears manually migrated; first verify schema equivalence and establish a reviewed baseline history.

Safe reconciliation process:

1. Confirm, using read-only inspection, that production still has no `supabase_migrations.schema_migrations` relation and capture the current schema definition.
2. Compare the production schema to the repository migrations to verify object, policy, function, storage bucket, and seed-data equivalence.
3. Establish a reviewed baseline migration history for the already-present production schema before running any future production migrations.
4. If another environment already has old filename versions applied, compare each previously applied filename to the renamed file with the same descriptive suffix in this guide and confirm SQL body equivalence.
5. Use Supabase migration repair/mark-applied workflows only after backup, peer review, and a written mapping from old filename to new filename.
6. Do not mark a version applied when its SQL body has not effectively been applied to that environment.

## Rollback and recovery precautions

- Take a fresh production backup before any migration history repair or schema migration.
- Test the same commands against a disposable Supabase project or local stack first.
- Avoid destructive down migrations; recover by restoring from backup or applying a forward repair migration.
- Never run seed or repair SQL manually against production unless the target rows and expected effects are reviewed.

## Verification notes for this change

- Static validation checks unique migration versions, filename format, required dependency ordering, and `security definer` search paths.
- Frontend database types were audited against migrations. The only type drift found was the missing `can_access_asset_delivery(target_asset_id uuid)` function type; the type definition now includes it.
- A real `supabase db reset` requires the local Supabase CLI and Docker. If either is unavailable, report the limitation rather than claiming a fresh reset passed.
