-- Task 2B content moderation preflight (SELECT-only). Returns one JSON row.
with state as (
  select
    exists (select 1 from pg_type join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'asset_status') as asset_status_enum_exists,
    exists (select 1 from pg_type join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'publish_status') as publish_status_enum_exists,
    exists (select 1 from pg_enum join pg_type on pg_type.oid = pg_enum.enumtypid join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'publish_status' and pg_enum.enumlabel = 'pending_review') as blog_pending_enum_exists,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assets' and column_name = 'reviewed_by') as asset_review_columns_present,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'blog_posts' and column_name = 'rejection_reason') as blog_review_columns_present,
    (select count(*) from public.assets where status = 'published') as assets_preserved_published,
    (select count(*) from public.blog_posts where status = 'published') as blogs_preserved_published,
    (select count(*) from public.assets where status = 'approved') as assets_reclassified_from_approved_to_pending_review,
    (select count(*) from public.assets where status in ('draft','pending_review','rejected')) as assets_remaining_non_published,
    (select count(*) from public.blog_posts where status = 'draft') as blogs_remaining_draft,
    (select count(*) from public.assets where status = 'rejected' and nullif(btrim(coalesce(rejection_reason, '')), '') is null) as rejected_assets_missing_reason
)
select jsonb_build_object(
  'ready_for_migration', asset_status_enum_exists and publish_status_enum_exists and not asset_review_columns_present and not blog_review_columns_present and rejected_assets_missing_reason = 0,
  'manual_review_required', rejected_assets_missing_reason > 0,
  'existing_schema', jsonb_build_object('asset_status_enum_exists', asset_status_enum_exists, 'publish_status_enum_exists', publish_status_enum_exists, 'blog_pending_enum_exists', blog_pending_enum_exists, 'asset_review_columns_present', asset_review_columns_present, 'blog_review_columns_present', blog_review_columns_present),
  'classification_counts', jsonb_build_object('assets_preserved_published', assets_preserved_published, 'blogs_preserved_published', blogs_preserved_published, 'assets_reclassified_from_approved_to_pending_review', assets_reclassified_from_approved_to_pending_review, 'assets_remaining_non_published', assets_remaining_non_published, 'blogs_remaining_draft', blogs_remaining_draft),
  'instruction', case when rejected_assets_missing_reason > 0 then 'STOP: rejected assets without a rejection reason require manual repair before migration.' when asset_review_columns_present or blog_review_columns_present then 'STOP: lifecycle schema appears partially or fully present; do not replay.' else 'Preflight passed. Apply the forward-only migration, then run verification.' end
) as content_moderation_preflight
from state;
