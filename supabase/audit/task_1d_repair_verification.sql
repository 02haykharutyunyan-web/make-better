-- SELECT-only verification for a future manually approved Task 1D rollout. Returns only metadata and aggregate/object state.

select jsonb_build_object(
  'function_verification', coalesce((
    select jsonb_agg(jsonb_build_object('function_name', p.proname, 'identity_arguments', pg_get_function_identity_arguments(p.oid), 'result_type', pg_get_function_result(p.oid), 'language', l.lanname, 'security_definer', p.prosecdef, 'volatility', p.provolatile, 'search_path', (select string_agg(setting, ', ' order by setting) from unnest(coalesce(p.proconfig, array[]::text[])) setting where setting like 'search_path=%')) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
    where n.nspname = 'public' and p.proname = 'can_access_asset_delivery' and pg_get_function_identity_arguments(p.oid) = 'target_asset_id uuid'
  ), '[]'::jsonb),
  'function_privileges', coalesce((
    select jsonb_agg(jsonb_build_object('function_name', routine_name, 'grantee', grantee, 'privilege_type', privilege_type) order by routine_name, grantee)
    from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'can_access_asset_delivery' and lower(grantee) in ('authenticated', 'public', 'anon', 'service_role')
  ), '[]'::jsonb),
  'index_verification', coalesce((
    select jsonb_agg(jsonb_build_object('table_name', tablename, 'index_name', indexname, 'definition', indexdef) order by tablename, indexname)
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
) as repair_verification_result;
