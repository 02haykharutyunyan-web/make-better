-- Task 2B content moderation verification (SELECT-only). Returns one JSON row.
with checks as (
  select
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assets' and column_name = 'reviewed_by') as asset_review_columns_present,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'blog_posts' and column_name = 'rejection_reason') as blog_review_columns_present,
    exists (select 1 from pg_enum join pg_type on pg_type.oid = pg_enum.enumtypid join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'publish_status' and pg_enum.enumlabel = 'pending_review') as blog_pending_enum_exists,
    exists (select 1 from pg_enum join pg_type on pg_type.oid = pg_enum.enumtypid join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'publish_status' and pg_enum.enumlabel = 'rejected') as blog_rejected_enum_exists,
    (select count(*) from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and pg_proc.proname in ('submit_asset_for_review','submit_blog_post_for_review','review_asset','review_blog_post')) as rpc_count,
    (select count(*) from information_schema.routine_privileges where routine_schema = 'public' and routine_name in ('submit_asset_for_review','submit_blog_post_for_review','review_asset','review_blog_post') and grantee in ('PUBLIC','anon')) as unsafe_rpc_grants,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'assets' and policyname = 'approved creators can update own editable assets') as asset_owner_policy_present,
    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'approved creators can update own editable blog posts') as blog_owner_policy_present,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'assets' and indexname = 'assets_moderation_queue_idx') as asset_queue_index_present,
    exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'blog_posts' and indexname = 'blog_posts_moderation_queue_idx') as blog_queue_index_present,
    (select count(*) from public.assets where status = 'published') as published_assets_after,
    (select count(*) from public.blog_posts where status = 'published') as published_blogs_after
)
select jsonb_build_object(
  'verification_passed', asset_review_columns_present and blog_review_columns_present and blog_pending_enum_exists and blog_rejected_enum_exists and rpc_count = 4 and unsafe_rpc_grants = 0 and asset_owner_policy_present and blog_owner_policy_present and asset_queue_index_present and blog_queue_index_present,
  'lifecycle_columns_enums', jsonb_build_object('asset_review_columns_present', asset_review_columns_present, 'blog_review_columns_present', blog_review_columns_present, 'blog_pending_enum_exists', blog_pending_enum_exists, 'blog_rejected_enum_exists', blog_rejected_enum_exists),
  'rpc_privileges', jsonb_build_object('rpc_count', rpc_count, 'unsafe_rpc_grants', unsafe_rpc_grants),
  'rls_policies', jsonb_build_object('asset_owner_policy_present', asset_owner_policy_present, 'blog_owner_policy_present', blog_owner_policy_present),
  'indexes', jsonb_build_object('asset_queue_index_present', asset_queue_index_present, 'blog_queue_index_present', blog_queue_index_present),
  'published_content_counts_after', jsonb_build_object('assets', published_assets_after, 'blogs', published_blogs_after)
) as content_moderation_verification
from checks;
