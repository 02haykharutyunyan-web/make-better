-- Task 2A creator lifecycle verification (SELECT-only).
-- Run manually after the migration and require verification_passed = true.

with checks as (
  select
    (
      select count(*) = 4
      from information_schema.columns
      where table_schema = 'public' and table_name = 'creators'
        and column_name in (
          'application_status',
          'application_submitted_at',
          'application_reviewed_at',
          'application_rejection_reason'
        )
    ) as lifecycle_columns_present,
    (
      select count(*) = 0 from public.creators where application_status is null
    ) as all_creators_classified,
    to_regprocedure('public.review_creator_application(uuid,public.creator_status,text)') is not null
      as review_rpc_present,
    to_regprocedure('public.reapply_creator_application()') is not null
      as reapply_rpc_present,
    to_regprocedure('public.is_approved_creator(uuid)') is not null
      as approval_helper_present,
    has_function_privilege(
      'authenticated',
      'public.review_creator_application(uuid,public.creator_status,text)',
      'EXECUTE'
    ) as authenticated_can_review_rpc,
    not has_function_privilege(
      'anon',
      'public.review_creator_application(uuid,public.creator_status,text)',
      'EXECUTE'
    ) as anon_cannot_review_rpc,
    has_function_privilege(
      'authenticated',
      'public.reapply_creator_application()',
      'EXECUTE'
    ) as authenticated_can_reapply,
    not has_function_privilege(
      'anon',
      'public.reapply_creator_application()',
      'EXECUTE'
    ) as anon_cannot_reapply,
    exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'assets'
        and policyname = 'approved creators can submit own assets'
    ) as asset_approval_policy_present,
    exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'blog_posts'
        and policyname = 'approved creators can submit own blog posts'
    ) as blog_approval_policy_present
), result as (
  select *,
    lifecycle_columns_present
    and all_creators_classified
    and review_rpc_present
    and reapply_rpc_present
    and approval_helper_present
    and authenticated_can_review_rpc
    and anon_cannot_review_rpc
    and authenticated_can_reapply
    and anon_cannot_reapply
    and asset_approval_policy_present
    and blog_approval_policy_present
    as verification_passed
  from checks
)
select jsonb_build_object(
  'lifecycle_columns_present', lifecycle_columns_present,
  'all_creators_classified', all_creators_classified,
  'review_rpc_present', review_rpc_present,
  'reapply_rpc_present', reapply_rpc_present,
  'approval_helper_present', approval_helper_present,
  'authenticated_can_review_rpc', authenticated_can_review_rpc,
  'anon_cannot_review_rpc', anon_cannot_review_rpc,
  'authenticated_can_reapply', authenticated_can_reapply,
  'anon_cannot_reapply', anon_cannot_reapply,
  'asset_approval_policy_present', asset_approval_policy_present,
  'blog_approval_policy_present', blog_approval_policy_present,
  'status_counts', (
    select coalesce(jsonb_agg(jsonb_build_object('status', application_status, 'count', total)), '[]'::jsonb)
    from (
      select application_status, count(*) as total
      from public.creators
      group by application_status
      order by application_status
    ) grouped
  ),
  'verification_passed', verification_passed
) as creator_lifecycle_verification
from result;
