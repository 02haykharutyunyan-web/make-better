-- Task 2B content moderation preflight (SELECT-only). Returns one JSON row.
-- Save this JSON as the operator baseline; verification accepts its aggregate
-- counts as the expected preservation snapshot without writing tracking data.
with state as (
  select
    exists (select 1 from pg_type join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'asset_status') as asset_status_enum_exists,
    exists (select 1 from pg_type join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'publish_status') as publish_status_enum_exists,
    exists (select 1 from pg_enum join pg_type on pg_type.oid = pg_enum.enumtypid join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'publish_status' and pg_enum.enumlabel = 'pending_review') as blog_pending_enum_exists,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assets' and column_name = 'reviewed_by') as asset_review_columns_present,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'blog_posts' and column_name = 'rejection_reason') as blog_review_columns_present,
    (select count(*) from public.assets where status = 'published') as assets_published,
    (select count(*) from public.assets where status = 'approved') as assets_approved,
    (select count(*) from public.assets where status = 'pending_review') as assets_pending_review,
    (select count(*) from public.assets where status = 'rejected') as assets_rejected,
    (select count(*) from public.assets where status = 'draft') as assets_draft,
    (select count(*) from public.blog_posts where status = 'published') as blogs_published,
    (select count(*) from public.blog_posts where status = 'draft') as blogs_draft,
    (select count(*) from public.assets where status = 'rejected' and nullif(btrim(coalesce(rejection_reason, '')), '') is null) as rejected_assets_missing_reason
)
select jsonb_build_object(
  'ready_for_migration', asset_status_enum_exists and publish_status_enum_exists and not asset_review_columns_present and not blog_review_columns_present and rejected_assets_missing_reason = 0 and assets_approved = 0,
  'manual_review_required', rejected_assets_missing_reason > 0 or assets_approved > 0,
  'existing_schema', jsonb_build_object('asset_status_enum_exists', asset_status_enum_exists, 'publish_status_enum_exists', publish_status_enum_exists, 'blog_pending_enum_exists', blog_pending_enum_exists, 'asset_review_columns_present', asset_review_columns_present, 'blog_review_columns_present', blog_review_columns_present),
  'baseline_counts', jsonb_build_object('assets_published', assets_published, 'assets_approved', assets_approved, 'assets_pending_review', assets_pending_review, 'assets_rejected', assets_rejected, 'assets_draft', assets_draft, 'blogs_published', blogs_published, 'blogs_draft', blogs_draft),
  'verification_operator_inputs', jsonb_build_object('expected_min_published_assets', assets_published, 'expected_min_published_blogs', blogs_published, 'expected_max_published_assets_without_new_admin_approval', assets_published, 'expected_max_published_blogs_without_new_admin_approval', blogs_published),
  'instruction', case when assets_approved > 0 then 'STOP: approved assets exist. Operator must decide whether each aggregate cohort remains approved for a compatibility window, returns to draft, or is submitted to pending_review; do not silently publish or unpublish.' when rejected_assets_missing_reason > 0 then 'STOP: rejected assets without a rejection reason require manual repair before migration.' when asset_review_columns_present or blog_review_columns_present then 'STOP: lifecycle schema appears partially or fully present; do not replay.' else 'Preflight passed. Save this JSON as the baseline, apply enum migration then lifecycle migration, then run verification using the saved aggregate counts.' end
) as content_moderation_preflight
from state;
