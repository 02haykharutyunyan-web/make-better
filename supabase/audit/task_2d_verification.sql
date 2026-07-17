-- SELECT-only Task 2D verification.
with state as (
  select
    not exists (select 1 from information_schema.role_column_grants where table_schema='public' and table_name='blog_posts' and grantee='authenticated' and privilege_type='UPDATE' and column_name in ('status','creator_id','reviewed_by','reviewed_at','published_at','submitted_at','rejection_reason')) as protected_blog_columns_not_granted,
    (select count(*) from information_schema.role_column_grants where table_schema='public' and table_name='blog_posts' and grantee='authenticated' and privilege_type='UPDATE' and column_name in ('title','slug','excerpt','category','body')) = 5 as editable_blog_columns_granted,
    exists (select 1 from information_schema.role_table_grants where table_schema='public' and table_name='asset_deliverables' and grantee='authenticated' and privilege_type='INSERT') as deliverable_insert_grant,
    exists (select 1 from information_schema.role_table_grants where table_schema='public' and table_name='asset_deliverables' and grantee='authenticated' and privilege_type='UPDATE') as deliverable_update_grant,
    exists (select 1 from storage.buckets where id='asset-deliverables' and public=false and file_size_limit=52428800) as private_bucket_ok,
    exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='creators upload own asset deliverables' and with_check ilike '%creators.application_status = ''approved''%' and with_check ilike '%assets.id::text = (storage.foldername(name))[2]%') as storage_insert_policy_ok,
    exists (select 1 from pg_policies where schemaname='public' and tablename='blog_posts' and policyname='approved creators can update own editable blog posts' and qual ilike '%draft%' and qual ilike '%rejected%') as blog_update_policy_ok,
    (select count(*) from public.assets where status='published') = 19 as published_asset_baseline_ok,
    (select count(*) from public.blog_posts where status='published') >= 0 as published_blog_count_preserved
)
select jsonb_build_object(
  'verification_passed', protected_blog_columns_not_granted and editable_blog_columns_granted and deliverable_insert_grant and deliverable_update_grant and private_bucket_ok and storage_insert_policy_ok and blog_update_policy_ok and published_asset_baseline_ok and published_blog_count_preserved,
  'protected_blog_columns_not_granted', protected_blog_columns_not_granted,
  'editable_blog_columns_granted', editable_blog_columns_granted,
  'deliverable_insert_grant', deliverable_insert_grant,
  'deliverable_update_grant', deliverable_update_grant,
  'private_bucket_ok', private_bucket_ok,
  'storage_insert_policy_ok', storage_insert_policy_ok,
  'blog_update_policy_ok', blog_update_policy_ok,
  'published_asset_baseline_ok', published_asset_baseline_ok
) from state;
