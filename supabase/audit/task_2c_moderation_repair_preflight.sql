-- SELECT-only Task 2C repair preflight. Run before the repair migration.
select jsonb_build_object(
  'task', '2c_moderation_repair_preflight',
  'historical_migrations_present', jsonb_build_object(
    'blog_enum', exists (select 1 from supabase_migrations.schema_migrations where version = '20260717000100'),
    'lifecycle', exists (select 1 from supabase_migrations.schema_migrations where version = '20260717000200')
  ),
  'repair_already_present', exists (select 1 from supabase_migrations.schema_migrations where version = '20260717000300'),
  'published_counts', jsonb_build_object(
    'assets', (select count(*) from public.assets where status = 'published'),
    'blog_posts', (select count(*) from public.blog_posts where status = 'published')
  ),
  'production_baseline', jsonb_build_object('assets_published', 19, 'blog_posts_published', 0),
  'instruction', 'Fail closed if historical migrations are missing, repair is already partially applied, or published counts differ from the saved production baseline unless explicitly explained.'
) as audit;
