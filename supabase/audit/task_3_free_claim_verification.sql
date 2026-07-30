-- Run after 20260725000100_secure_free_asset_claim.sql in a non-production project.
-- This is read-only verification; all booleans must be true.
select
  to_regprocedure('public.claim_free_asset(uuid)') is not null as claim_rpc_exists,
  has_function_privilege('authenticated', 'public.claim_free_asset(uuid)', 'execute') as authenticated_can_claim,
  not has_function_privilege('anon', 'public.claim_free_asset(uuid)', 'execute') as anon_cannot_claim,
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.asset_claims'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (user_id, asset_id)'
  ) as duplicate_claim_constraint_exists,
  not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'asset_claims'
      and policyname = 'users can claim free published assets'
  ) as buyer_direct_claim_policy_removed,
  (select relrowsecurity from pg_class where oid = 'public.asset_claims'::regclass) as claim_rls_enabled,
  (select relrowsecurity from pg_class where oid = 'public.asset_deliverables'::regclass) as delivery_rls_enabled;
