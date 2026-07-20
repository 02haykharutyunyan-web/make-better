with blog_grants as (
  select grantee, column_name
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'blog_posts' and privilege_type = 'UPDATE'
), routine_grants as (
  select routine_name, grantee
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name in ('create_blog_draft','submit_blog_post_for_review','review_blog_post')
    and privilege_type = 'EXECUTE'
), policies as (
  select schemaname, tablename, policyname, cmd, roles, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies
), state as (
  select
    (select count(*) from blog_grants where grantee = 'authenticated') = 5
      and (select count(*) from blog_grants where grantee = 'authenticated' and column_name in ('slug','title','excerpt','category','body')) = 5 as exact_blog_edit_grants,
    not exists (select 1 from blog_grants where grantee = 'authenticated' and column_name in ('status','submitted_at','reviewed_at','reviewed_by','rejection_reason','published_at','creator_id')) as protected_blog_columns_blocked,
    not exists (select 1 from information_schema.table_privileges where table_schema = 'public' and table_name = 'blog_posts' and grantee in ('PUBLIC','anon','authenticated') and privilege_type = 'UPDATE') as no_broad_blog_update,
    (select count(*) from routine_grants where grantee = 'authenticated') = 3 as authenticated_rpc_execute,
    not exists (select 1 from routine_grants where grantee in ('PUBLIC','anon')) as untrusted_rpc_execute_revoked,
    exists (select 1 from policies where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'approved creators can update own editable blog posts' and cmd = 'UPDATE' and qual like '%draft%' and qual like '%rejected%' and qual like '%active%' and qual like '%approved%' and with_check like '%draft%' and with_check like '%rejected%') as strict_blog_update_policy,
    (select count(*) from policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('creators upload own editable asset deliverables','creators update own editable asset deliverables') and roles = array['authenticated']::name[] and coalesce(nullif(with_check, ''), qual) like '%asset-deliverables%' and coalesce(nullif(with_check, ''), qual) like '%foldername%' and coalesce(nullif(with_check, ''), qual) like '%draft%' and coalesce(nullif(with_check, ''), qual) like '%rejected%' and coalesce(nullif(with_check, ''), qual) like '%active%' and coalesce(nullif(with_check, ''), qual) like '%approved%') = 2 as strict_storage_policies,
    exists (select 1 from policies where schemaname = 'public' and tablename = 'asset_deliverables' and policyname = 'creators can create own deliverables' and cmd = 'INSERT' and with_check like '%draft%' and with_check like '%rejected%' and with_check like '%active%' and with_check like '%approved%') as strict_deliverable_insert_policy,
    exists (select 1 from policies where schemaname = 'public' and tablename = 'asset_deliverables' and policyname = 'creators can update own deliverables' and cmd = 'UPDATE' and qual like '%draft%' and qual like '%rejected%' and with_check like '%active%' and with_check like '%approved%') as strict_deliverable_update_policy,
    exists (select 1 from information_schema.table_privileges where table_schema = 'public' and table_name = 'asset_deliverables' and grantee = 'authenticated' and privilege_type = 'INSERT') as deliverable_insert_granted,
    exists (select 1 from information_schema.table_privileges where table_schema = 'public' and table_name = 'asset_deliverables' and grantee = 'authenticated' and privilege_type = 'UPDATE') as deliverable_update_granted,
    exists (select 1 from storage.buckets where id = 'asset-deliverables' and public = false) as bucket_private,
    (select count(*) from public.assets where status = 'published') as published_assets,
    (select count(*) from public.blog_posts where status = 'published') as published_blogs
)
select jsonb_build_object(
  'task', '2d_verification',
  'verification_passed', exact_blog_edit_grants and protected_blog_columns_blocked and no_broad_blog_update and authenticated_rpc_execute and untrusted_rpc_execute_revoked and strict_blog_update_policy and strict_storage_policies and strict_deliverable_insert_policy and strict_deliverable_update_policy and deliverable_insert_granted and deliverable_update_granted and bucket_private and published_assets = 19 and published_blogs = 0,
  'blog_privileges', jsonb_build_object('authenticated_update_columns', (select jsonb_agg(column_name order by column_name) from blog_grants where grantee = 'authenticated'), 'exactly_five_editable', exact_blog_edit_grants, 'protected_blocked', protected_blog_columns_blocked, 'no_broad_update', no_broad_blog_update),
  'rpc_privileges', jsonb_build_object('authenticated_execute', authenticated_rpc_execute, 'public_and_anon_revoked', untrusted_rpc_execute_revoked),
  'policy_model', jsonb_build_object('blog_owner_draft_or_rejected', strict_blog_update_policy, 'deliverable_insert', strict_deliverable_insert_policy, 'deliverable_update', strict_deliverable_update_policy, 'private_storage_writes', strict_storage_policies),
  'deliverable_grants', jsonb_build_object('insert', deliverable_insert_granted, 'update', deliverable_update_granted),
  'bucket_private', bucket_private,
  'published_counts', jsonb_build_object('assets', published_assets, 'blogs', published_blogs)
) as audit from state;
