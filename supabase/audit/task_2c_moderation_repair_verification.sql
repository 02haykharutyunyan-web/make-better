-- SELECT-only Task 2C repair verification.
select jsonb_build_object(
  'task', '2c_moderation_repair_verification',
  'rpc_signatures', jsonb_build_object(
    'review_asset', exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='review_asset' and pg_get_function_identity_arguments(p.oid) = 'target_asset_id uuid, target_status asset_status, rejection_reason text'),
    'review_blog_post', exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='review_blog_post' and pg_get_function_identity_arguments(p.oid) = 'target_blog_post_id uuid, target_status publish_status, rejection_reason text')
  ),
  'anon_rpc_execute_count', (select count(*) from information_schema.routine_privileges where grantee in ('anon','PUBLIC') and routine_schema='public' and routine_name in ('review_asset','review_blog_post')),
  'published_counts', jsonb_build_object('assets', (select count(*) from public.assets where status = 'published'), 'blog_posts', (select count(*) from public.blog_posts where status = 'published')),
  'rejected_without_reason', jsonb_build_object('assets', (select count(*) from public.assets where status='rejected' and nullif(btrim(coalesce(rejection_reason,'')),'') is null), 'blog_posts', (select count(*) from public.blog_posts where status='rejected' and nullif(btrim(coalesce(rejection_reason,'')),'') is null))
) as audit;
