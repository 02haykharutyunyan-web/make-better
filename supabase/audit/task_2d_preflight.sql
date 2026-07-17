-- SELECT-only Task 2D preflight. Fails closed if the repair is partially present.
with state as (
  select
    exists (select 1 from information_schema.role_column_grants where table_schema='public' and table_name='blog_posts' and grantee='authenticated' and privilege_type='UPDATE' and column_name='status') as unsafe_blog_status_update_grant,
    (select count(*) from information_schema.role_column_grants where table_schema='public' and table_name='blog_posts' and grantee='authenticated' and privilege_type='UPDATE' and column_name in ('title','slug','excerpt','category','body')) as blog_edit_grants,
    exists (select 1 from information_schema.role_table_grants where table_schema='public' and table_name='asset_deliverables' and grantee='authenticated' and privilege_type='INSERT') as deliverable_insert_grant,
    exists (select 1 from information_schema.role_table_grants where table_schema='public' and table_name='asset_deliverables' and grantee='authenticated' and privilege_type='UPDATE') as deliverable_update_grant,
    exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='creators upload own asset deliverables' and with_check ilike '%assets.id::text = (storage.foldername(name))[2]%') as strict_storage_policy_present,
    (select count(*) from public.assets where status='published') as published_assets,
    (select count(*) from public.blog_posts where status='published') as published_blogs
)
select jsonb_build_object(
  'preflight_passed', not (deliverable_insert_grant or deliverable_update_grant or strict_storage_policy_present) and blog_edit_grants in (0,5),
  'unsafe_blog_status_update_grant', unsafe_blog_status_update_grant,
  'blog_edit_grants', blog_edit_grants,
  'deliverable_insert_grant_already_present', deliverable_insert_grant,
  'deliverable_update_grant_already_present', deliverable_update_grant,
  'strict_storage_policy_already_present', strict_storage_policy_present,
  'published_assets', published_assets,
  'published_blogs', published_blogs
) from state;
