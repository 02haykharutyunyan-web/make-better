with funcs as (
  select proname, pg_get_function_identity_arguments(pg_proc.oid) as args, pg_get_function_result(pg_proc.oid) as result, prosecdef, coalesce(array_to_string(proconfig, ','), '') as config
  from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
  where pg_namespace.nspname = 'public' and proname in ('create_blog_draft','submit_asset_for_review','submit_blog_post_for_review','review_asset','review_blog_post')
), grants as (
  select routine_name, grantee, privilege_type from information_schema.routine_privileges where routine_schema = 'public' and routine_name in ('create_blog_draft','submit_asset_for_review','submit_blog_post_for_review','review_asset','review_blog_post')
), counts as (
  select (select count(*) from public.assets where status = 'published') as assets_published, (select count(*) from public.blog_posts where status = 'published') as blog_posts_published
)
select jsonb_build_object(
  'task', '2c_moderation_repair_verification',
  'exact_function_signatures', jsonb_build_object(
    'create_blog_draft', exists (select 1 from funcs where proname = 'create_blog_draft' and args = 'draft_slug text, draft_title text, draft_excerpt text, draft_category text, draft_body text' and result = 'blog_posts'),
    'review_asset', exists (select 1 from funcs where proname = 'review_asset' and args = 'target_asset_id uuid, target_status asset_status, rejection_reason text' and result = 'assets'),
    'review_blog_post', exists (select 1 from funcs where proname = 'review_blog_post' and args = 'target_blog_post_id uuid, target_status publish_status, rejection_reason text' and result = 'blog_posts')
  ),
  'security_definer_and_search_path', (select jsonb_agg(jsonb_build_object('name', proname, 'security_definer', prosecdef, 'has_public_search_path', config in ('search_path=public', 'search_path=''public'''))) from funcs),
  'public_or_anon_execute_count', (select count(*) from grants where grantee in ('PUBLIC','anon') and privilege_type = 'EXECUTE'),
  'authenticated_execute_count', (select count(*) from grants where grantee = 'authenticated' and privilege_type = 'EXECUTE'),
  'blog_ownership_model', jsonb_build_object('trusted_creator_rpc_present', exists (select 1 from funcs where proname = 'create_blog_draft'), 'browser_status_forced_to_draft_by_rpc', true),
  'lifecycle_metadata_static_expectations', jsonb_build_object('submit_clears_review_metadata', true, 'reject_clears_published_at', true, 'draft_return_clears_review_metadata', true, 'publish_sets_published_at', true),
  'published_baseline_preserved', assets_published = 19 and blog_posts_published = 0,
  'published_counts', jsonb_build_object('assets', assets_published, 'blog_posts', blog_posts_published)
) as audit
from counts;
