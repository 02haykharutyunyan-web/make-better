with checks as (
  select
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'assets') as assets_table_exists,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'blog_posts') as blog_posts_table_exists,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'creators') as creators_table_exists,
    exists (select 1 from pg_type join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'asset_status') as asset_status_exists,
    exists (select 1 from pg_type join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'publish_status') as publish_status_exists,
    exists (select 1 from pg_enum join pg_type on pg_type.oid = pg_enum.enumtypid join pg_namespace on pg_namespace.oid = pg_type.typnamespace where pg_namespace.nspname = 'public' and pg_type.typname = 'publish_status' and pg_enum.enumlabel = 'pending_review') as pending_blog_enum_exists,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assets' and column_name = 'reviewed_at') as asset_review_columns_exist,
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'blog_posts' and column_name = 'reviewed_at') as blog_review_columns_exist,
    exists (select 1 from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and pg_proc.proname = 'is_admin') as is_admin_exists,
    (select count(*) from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and pg_proc.proname = 'create_blog_draft') as create_blog_draft_count,
    exists (select 1 from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and pg_proc.proname = 'review_asset' and pg_get_function_identity_arguments(pg_proc.oid) = 'target_asset_id uuid, target_status asset_status, rejection_reason text') as review_asset_same_signature_exists,
    exists (select 1 from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and pg_proc.proname = 'review_blog_post' and pg_get_function_identity_arguments(pg_proc.oid) = 'target_blog_post_id uuid, target_status publish_status, rejection_reason text') as review_blog_same_signature_exists,
    (select count(*) from public.assets where status = 'published') as assets_published,
    (select count(*) from public.blog_posts where status = 'published') as blog_posts_published
)
select jsonb_build_object(
  'task', '2c_moderation_repair_preflight',
  'ready_for_migration', assets_table_exists and blog_posts_table_exists and creators_table_exists and asset_status_exists and publish_status_exists and pending_blog_enum_exists and asset_review_columns_exist and blog_review_columns_exist and is_admin_exists and create_blog_draft_count = 0 and review_asset_same_signature_exists and review_blog_same_signature_exists and assets_published = 19 and blog_posts_published = 0,
  'task_2b_schema_exists', asset_review_columns_exist and blog_review_columns_exist and pending_blog_enum_exists,
  'no_partial_task_2c_repair', create_blog_draft_count = 0,
  'same_signature_rpcs_exist_for_replace', jsonb_build_object('review_asset', review_asset_same_signature_exists, 'review_blog_post', review_blog_same_signature_exists),
  'baseline_counts', jsonb_build_object('assets_published', assets_published, 'blog_posts_published', blog_posts_published),
  'required_objects', jsonb_build_object('assets_table', assets_table_exists, 'blog_posts_table', blog_posts_table_exists, 'creators_table', creators_table_exists, 'asset_status', asset_status_exists, 'publish_status', publish_status_exists, 'is_admin', is_admin_exists)
) as audit
from checks;
