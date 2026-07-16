-- SELECT-only preflight for Task 1D repair. Returns only metadata and aggregate/object state.

select jsonb_build_object(
  'function_state', coalesce((
    select jsonb_agg(jsonb_build_object('function_name', p.proname, 'identity_arguments', pg_get_function_identity_arguments(p.oid), 'result_type', pg_get_function_result(p.oid), 'security_definer', p.prosecdef, 'search_path', (select string_agg(setting, ', ' order by setting) from unnest(coalesce(p.proconfig, array[]::text[])) setting where setting like 'search_path=%')) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'can_access_asset_delivery'
  ), '[]'::jsonb),
  'index_state', coalesce((
    select jsonb_agg(jsonb_build_object('table_name', tablename, 'index_name', indexname, 'definition', indexdef) order by tablename, indexname)
    from pg_indexes where schemaname = 'public' and indexname in ('collections_related_tags_idx', 'assets_tags_idx')
  ), '[]'::jsonb),
  'required_columns', coalesce((
    select jsonb_agg(jsonb_build_object('table_name', table_name, 'column_name', column_name, 'data_type', data_type, 'udt_name', udt_name) order by table_name, column_name)
    from information_schema.columns
    where table_schema = 'public' and ((table_name = 'collections' and column_name = 'related_tags') or (table_name = 'assets' and column_name in ('id', 'creator_id', 'status', 'tags')) or (table_name = 'creators' and column_name in ('id', 'profile_id')) or (table_name = 'asset_claims' and column_name in ('asset_id', 'user_id', 'status')) or (table_name = 'asset_deliverables' and column_name in ('asset_id', 'storage_path')))
  ), '[]'::jsonb),
  'rls_state', coalesce((
    select jsonb_agg(jsonb_build_object('table_name', c.relname, 'rls_enabled', c.relrowsecurity) order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('assets', 'collections', 'creators', 'asset_claims', 'asset_deliverables')
  ), '[]'::jsonb),
  'relevant_policies', coalesce((
    select jsonb_agg(jsonb_build_object('schema_name', schemaname, 'table_name', tablename, 'policy_name', policyname, 'command', cmd) order by schemaname, tablename, policyname)
    from pg_policies where (schemaname = 'public' and tablename in ('assets', 'collections', 'creators', 'asset_claims', 'asset_deliverables')) or (schemaname = 'storage' and tablename in ('objects', 'buckets') and (policyname ilike '%asset%deliver%' or qual ilike '%asset-deliverables%' or with_check ilike '%asset-deliverables%'))
  ), '[]'::jsonb),
  'bucket_state', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'public', public) order by id)
    from storage.buckets where id = 'asset-deliverables'
  ), '[]'::jsonb)
) as repair_preflight_result;
