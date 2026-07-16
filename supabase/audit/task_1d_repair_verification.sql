-- SELECT-only verification for a future manually approved Task 1D rollout. Returns only metadata, aggregate/object state, and explicit success booleans.

with state as (
  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'collections'
        and column_name = 'related_tags'
        and data_type = 'ARRAY'
        and udt_name = '_text'
        and is_nullable = 'NO'
        and column_default in ('''{}''::text[]', 'ARRAY[]::text[]')
    ) as related_tags_column_matches_expected_definition,
    exists (
      select 1
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
      where n.nspname = 'public'
        and p.proname = 'can_access_asset_delivery'
        and pg_get_function_identity_arguments(p.oid) = 'target_asset_id uuid'
        and pg_get_function_result(p.oid) = 'boolean'
        and l.lanname = 'sql'
        and p.prosecdef = true
        and p.provolatile = 's'
        and exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting where setting = 'search_path=public')
    ) as function_matches_expected_metadata,
    exists (
      select 1 from information_schema.routine_privileges
      where routine_schema = 'public' and routine_name = 'can_access_asset_delivery' and lower(grantee) = 'authenticated' and privilege_type = 'EXECUTE'
    ) as authenticated_has_execute,
    exists (
      select 1 from information_schema.routine_privileges
      where routine_schema = 'public' and routine_name = 'can_access_asset_delivery' and lower(grantee) = 'public' and privilege_type = 'EXECUTE'
    ) as public_has_execute,
    exists (
      select 1 from information_schema.routine_privileges
      where routine_schema = 'public' and routine_name = 'can_access_asset_delivery' and lower(grantee) = 'anon' and privilege_type = 'EXECUTE'
    ) as anon_has_execute,
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'collections'
        and indexname = 'collections_related_tags_idx'
        and indexdef = 'CREATE INDEX collections_related_tags_idx ON public.collections USING gin (related_tags)'
    ) as collections_index_matches_expected_definition,
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'assets'
        and indexname = 'assets_tags_idx'
        and indexdef = 'CREATE INDEX assets_tags_idx ON public.assets USING gin (tags)'
    ) as assets_index_matches_expected_definition,
    (
      select count(*) = 5
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('assets', 'collections', 'creators', 'asset_claims', 'asset_deliverables')
        and c.relrowsecurity = true
    ) as relevant_rls_enabled,
    exists (
      select 1 from pg_policies
      where schemaname = 'storage'
        and tablename in ('objects', 'buckets')
        and (policyname ilike '%asset%deliver%' or qual ilike '%asset-deliverables%' or with_check ilike '%asset-deliverables%')
    ) as asset_deliverables_storage_policy_present,
    exists (
      select 1 from storage.buckets where id = 'asset-deliverables' and public = false
    ) as asset_deliverables_bucket_private
), metadata as (
  select jsonb_build_object(
    'related_tags_column_verification', coalesce((
      select jsonb_agg(jsonb_build_object('table_name', table_name, 'column_name', column_name, 'data_type', data_type, 'udt_name', udt_name, 'is_nullable', is_nullable, 'column_default', column_default) order by table_name, column_name)
      from information_schema.columns
      where table_schema = 'public' and table_name = 'collections' and column_name = 'related_tags'
    ), '[]'::jsonb),
    'function_verification', coalesce((
      select jsonb_agg(jsonb_build_object('function_name', p.proname, 'identity_arguments', pg_get_function_identity_arguments(p.oid), 'result_type', pg_get_function_result(p.oid), 'language', l.lanname, 'security_definer', p.prosecdef, 'volatility', p.provolatile, 'search_path', (select string_agg(setting, ', ' order by setting) from unnest(coalesce(p.proconfig, array[]::text[])) setting where setting like 'search_path=%')) order by p.proname)
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
      where n.nspname = 'public' and p.proname = 'can_access_asset_delivery' and pg_get_function_identity_arguments(p.oid) = 'target_asset_id uuid'
    ), '[]'::jsonb),
    'index_verification', coalesce((
      select jsonb_agg(jsonb_build_object('table_name', tablename, 'index_name', indexname, 'access_method', case when indexdef ilike '% using gin %' then 'gin' else 'unexpected' end, 'indexed_expression', case when indexname = 'collections_related_tags_idx' then 'related_tags' when indexname = 'assets_tags_idx' then 'tags' else 'unexpected' end, 'definition', indexdef) order by tablename, indexname)
      from pg_indexes where schemaname = 'public' and indexname in ('collections_related_tags_idx', 'assets_tags_idx')
    ), '[]'::jsonb),
    'rls_state', coalesce((
      select jsonb_agg(jsonb_build_object('table_name', c.relname, 'rls_enabled', c.relrowsecurity) order by c.relname)
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in ('assets', 'collections', 'creators', 'asset_claims', 'asset_deliverables')
    ), '[]'::jsonb),
    'storage_policy_state', coalesce((
      select jsonb_agg(jsonb_build_object('table_name', tablename, 'policy_name', policyname, 'command', cmd) order by tablename, policyname)
      from pg_policies where schemaname = 'storage' and tablename in ('objects', 'buckets') and (policyname ilike '%asset%deliver%' or qual ilike '%asset-deliverables%' or with_check ilike '%asset-deliverables%')
    ), '[]'::jsonb),
    'bucket_state', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'public', public) order by id)
      from storage.buckets where id = 'asset-deliverables'
    ), '[]'::jsonb)
  ) as details
)
select jsonb_build_object(
  'related_tags_column_matches_expected_definition', state.related_tags_column_matches_expected_definition,
  'function_matches_expected_metadata', state.function_matches_expected_metadata,
  'authenticated_has_execute', state.authenticated_has_execute,
  'public_has_execute', state.public_has_execute,
  'anon_has_execute', state.anon_has_execute,
  'public_execute_revoked', not state.public_has_execute,
  'anon_execute_revoked', not state.anon_has_execute,
  'collections_index_matches_expected_definition', state.collections_index_matches_expected_definition,
  'assets_index_matches_expected_definition', state.assets_index_matches_expected_definition,
  'relevant_rls_enabled', state.relevant_rls_enabled,
  'asset_deliverables_storage_policy_present', state.asset_deliverables_storage_policy_present,
  'asset_deliverables_bucket_private', state.asset_deliverables_bucket_private,
  'verification_passed', state.related_tags_column_matches_expected_definition and state.function_matches_expected_metadata and state.authenticated_has_execute and not state.public_has_execute and not state.anon_has_execute and state.collections_index_matches_expected_definition and state.assets_index_matches_expected_definition and state.relevant_rls_enabled and state.asset_deliverables_storage_policy_present and state.asset_deliverables_bucket_private,
  'details', metadata.details
) as repair_verification_result
from state cross join metadata;
