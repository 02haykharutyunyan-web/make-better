-- Task 2A creator lifecycle preflight (SELECT-only).
-- Run manually in production before the migration. Do not run the migration when
-- ready_for_migration is false; inspect the details first.

with state as (
  select
    not exists (
      select 1 from pg_type
      join pg_namespace on pg_namespace.oid = pg_type.typnamespace
      where pg_namespace.nspname = 'public' and pg_type.typname = 'creator_status'
    ) as creator_status_enum_missing,
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'creators'
        and column_name = 'application_status'
    ) as lifecycle_columns_missing,
    (
      select count(*) from public.creators
      where profile_id is not null
        and id not in (
          '6b6a8889-07bc-4cc0-a21e-c9c54769c56e'::uuid,
          'f6841040-f99f-4020-8b96-69fea85d3cbb'::uuid,
          '8c64ec1b-d99f-4549-a59b-c6afb121003f'::uuid
        )
        and not exists (
          select 1 from public.assets
          where assets.creator_id = creators.id and assets.status = 'published'
        )
        and not exists (
          select 1 from public.blog_posts
          where blog_posts.creator_id = creators.id and blog_posts.status = 'published'
        )
    ) as linked_creators_entering_review,
    (
      select count(*) from public.creators
      where profile_id is null
        or id in (
          '6b6a8889-07bc-4cc0-a21e-c9c54769c56e'::uuid,
          'f6841040-f99f-4020-8b96-69fea85d3cbb'::uuid,
          '8c64ec1b-d99f-4549-a59b-c6afb121003f'::uuid
        )
        or exists (
          select 1 from public.assets
          where assets.creator_id = creators.id and assets.status = 'published'
        )
        or exists (
          select 1 from public.blog_posts
          where blog_posts.creator_id = creators.id and blog_posts.status = 'published'
        )
    ) as legacy_creators_preserved_as_approved
)
select jsonb_build_object(
  'creator_status_enum_missing', creator_status_enum_missing,
  'lifecycle_columns_missing', lifecycle_columns_missing,
  'linked_creators_entering_review', linked_creators_entering_review,
  'legacy_creators_preserved_as_approved', legacy_creators_preserved_as_approved,
  'manual_review_required', linked_creators_entering_review > 0,
  'ready_for_migration',
    creator_status_enum_missing
    and lifecycle_columns_missing
    and linked_creators_entering_review = 0,
  'instruction',
    case
      when linked_creators_entering_review > 0
        then 'STOP: review linked creator rows before migration; they would enter pending status.'
      when not creator_status_enum_missing or not lifecycle_columns_missing
        then 'STOP: lifecycle schema appears partially or fully present; do not replay.'
      else 'Preflight passed. Execute only during an approved low-traffic maintenance window.'
    end
) as creator_lifecycle_preflight
from state;
