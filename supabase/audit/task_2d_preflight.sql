with state as (
  select
    (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('assets','blog_posts','creators','asset_deliverables')) = 4 as tables_exist,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'blog_posts' and column_name in ('slug','title','excerpt','category','body','status','submitted_at','reviewed_at','reviewed_by','rejection_reason','published_at','creator_id')) = 12 as blog_columns_exist,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'creators' and column_name in ('id','profile_id','active','application_status')) = 4 as creator_columns_exist,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'asset_deliverables' and column_name in ('asset_id','storage_path')) = 2 as deliverable_columns_exist,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'assets' and column_name in ('id','creator_id','status')) = 3 as asset_columns_exist,
    (select count(*) from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and pg_proc.proname in ('create_blog_draft','submit_blog_post_for_review','review_blog_post')) = 3 as lifecycle_functions_exist,
    exists (select 1 from storage.buckets where id = 'asset-deliverables' and public = false) as private_bucket_exists,
    (select count(*) from public.assets where status = 'published') as published_assets,
    (select count(*) from public.blog_posts where status = 'published') as published_blogs,
    exists (select 1 from information_schema.column_privileges where table_schema = 'public' and table_name = 'blog_posts' and grantee = 'authenticated' and privilege_type = 'UPDATE' and column_name = 'status') as unsafe_blog_status_update_grant,
    exists (select 1 from information_schema.table_privileges where table_schema = 'public' and table_name = 'asset_deliverables' and grantee = 'authenticated' and privilege_type = 'INSERT') as deliverable_insert_grant_already_present,
    exists (select 1 from information_schema.table_privileges where table_schema = 'public' and table_name = 'asset_deliverables' and grantee = 'authenticated' and privilege_type = 'UPDATE') as deliverable_update_grant_already_present,
    (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('creators upload own editable asset deliverables','creators update own editable asset deliverables')) as strict_storage_policy_count
)
select jsonb_build_object(
  'task', '2d_preflight',
  'ready_for_migration', tables_exist and blog_columns_exist and creator_columns_exist and deliverable_columns_exist and asset_columns_exist and lifecycle_functions_exist and private_bucket_exists and published_assets = 19 and published_blogs = 0 and strict_storage_policy_count = 0,
  'required_dependencies_present', tables_exist and blog_columns_exist and creator_columns_exist and deliverable_columns_exist and asset_columns_exist and lifecycle_functions_exist and private_bucket_exists,
  'published_assets', published_assets,
  'published_blogs', published_blogs,
  'unsafe_blog_status_update_grant', unsafe_blog_status_update_grant,
  'strict_storage_policy_already_present', strict_storage_policy_count = 2,
  'strict_storage_policy_count', strict_storage_policy_count,
  'deliverable_insert_grant_already_present', deliverable_insert_grant_already_present,
  'deliverable_update_grant_already_present', deliverable_update_grant_already_present
) as audit from state;
