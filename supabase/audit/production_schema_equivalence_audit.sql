-- Read-only production schema equivalence audit for manual Supabase SQL Editor use.
-- Safety: every executable statement in this file is SELECT-only. Do not add DDL, DML, grants, revokes, repairs, or transaction controls.

select 'schemas' as section, jsonb_agg(jsonb_build_object('schema_name', nspname) order by nspname) as rows
from pg_namespace
where nspname in ('public', 'storage', 'auth', 'extensions');

select 'extensions' as section, jsonb_agg(jsonb_build_object('name', extname, 'schema', n.nspname, 'version', extversion) order by extname) as rows
from pg_extension e join pg_namespace n on n.oid = e.extnamespace
where extname in ('pgcrypto');

select 'public_enums' as section, jsonb_agg(jsonb_build_object('enum_name', t.typname, 'value', e.enumlabel, 'sort_order', e.enumsortorder) order by t.typname, e.enumsortorder) as rows
from pg_type t join pg_namespace n on n.oid = t.typnamespace join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'public';

select 'public_columns' as section, jsonb_agg(jsonb_build_object('table_name', table_name, 'column_name', column_name, 'ordinal_position', ordinal_position, 'data_type', data_type, 'udt_name', udt_name, 'is_nullable', is_nullable, 'column_default', column_default, 'character_maximum_length', character_maximum_length, 'numeric_precision', numeric_precision, 'numeric_scale', numeric_scale) order by table_name, ordinal_position) as rows
from information_schema.columns
where table_schema = 'public';

select 'public_constraints' as section, jsonb_agg(jsonb_build_object('table_name', c.conrelid::regclass::text, 'constraint_name', c.conname, 'constraint_type', c.contype, 'definition', pg_get_constraintdef(c.oid, true)) order by c.conrelid::regclass::text, c.conname) as rows
from pg_constraint c join pg_namespace n on n.oid = c.connamespace
where n.nspname = 'public' and c.contype in ('p','f','u','c');

select 'public_indexes' as section, jsonb_agg(jsonb_build_object('table_name', tablename, 'index_name', indexname, 'definition', indexdef) order by tablename, indexname) as rows
from pg_indexes where schemaname = 'public';

select 'public_triggers' as section, jsonb_agg(jsonb_build_object('table_name', event_object_table, 'trigger_name', trigger_name, 'timing', action_timing, 'event', event_manipulation, 'statement', action_statement) order by event_object_table, trigger_name, event_manipulation) as rows
from information_schema.triggers where trigger_schema = 'public';

select 'public_rls' as section, jsonb_agg(jsonb_build_object('table_name', c.relname, 'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity) order by c.relname) as rows
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

select 'public_policies' as section, jsonb_agg(jsonb_build_object('table_name', tablename, 'policy_name', policyname, 'permissive', permissive, 'roles', roles, 'command', cmd, 'using_expression', qual, 'check_expression', with_check) order by tablename, policyname) as rows
from pg_policies where schemaname = 'public';

select 'public_functions' as section, jsonb_agg(jsonb_build_object('function_name', p.proname, 'identity_arguments', pg_get_function_identity_arguments(p.oid), 'result_type', pg_get_function_result(p.oid), 'language', l.lanname, 'security_definer', p.prosecdef, 'volatility', p.provolatile, 'search_path', (select string_agg(setting, ', ' order by setting) from unnest(coalesce(p.proconfig, array[]::text[])) setting where setting like 'search_path=%')) order by p.proname, pg_get_function_identity_arguments(p.oid)) as rows
from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
where n.nspname = 'public';

select 'public_function_grants' as section, jsonb_agg(jsonb_build_object('function_name', routine_name, 'specific_name', specific_name, 'grantee', grantee, 'privilege_type', privilege_type, 'is_grantable', is_grantable) order by routine_name, grantee, privilege_type) as rows
from information_schema.routine_privileges
where routine_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role', 'public');

select 'asset_deliverables_bucket' as section, jsonb_agg(jsonb_build_object('id', id, 'name', name, 'public', public, 'file_size_limit', file_size_limit, 'allowed_mime_types', allowed_mime_types) order by id) as rows
from storage.buckets where id = 'asset-deliverables';

select 'storage_policies' as section, jsonb_agg(jsonb_build_object('table_name', tablename, 'policy_name', policyname, 'roles', roles, 'command', cmd, 'using_expression', qual, 'check_expression', with_check) order by tablename, policyname) as rows
from pg_policies where schemaname = 'storage' and tablename in ('objects', 'buckets') and (qual ilike '%asset-deliverables%' or with_check ilike '%asset-deliverables%' or policyname ilike '%asset%deliver%');

select 'demo_seed_existence' as section, jsonb_build_array(
  jsonb_build_object('check_name', 'published_assets_count', 'count', (select count(*) from public.assets where status = 'published')),
  jsonb_build_object('check_name', 'active_creators_count', 'count', (select count(*) from public.creators where active = true)),
  jsonb_build_object('check_name', 'published_collections_count', 'count', (select count(*) from public.collections where status = 'published')),
  jsonb_build_object('check_name', 'published_blog_posts_count', 'count', (select count(*) from public.blog_posts where status = 'published')),
  jsonb_build_object('check_name', 'asset_deliverables_count', 'count', (select count(*) from public.asset_deliverables))
) as rows;
