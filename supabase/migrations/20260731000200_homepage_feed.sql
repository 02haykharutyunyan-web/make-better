-- Return the complete public homepage feed in one round trip. This function is
-- deliberately SECURITY INVOKER so the caller's existing table RLS policies
-- remain authoritative.
create or replace function public.get_homepage_feed()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'assets', coalesce((
      select jsonb_agg(to_jsonb(asset_row))
      from (
        select
          a.slug, a.title, a.product_type, a.category, a.short_description,
          a.tags, a.price, a.downloads, a.rating, a.review_count,
          jsonb_build_object('slug', c.slug, 'brand_name', c.brand_name) as creators
        from public.assets a
        left join public.creators c on c.id = a.creator_id
        where a.status = 'published'
        order by a.featured desc, a.published_at desc
        limit 6
      ) asset_row
    ), '[]'::jsonb),
    'collections', coalesce((
      select jsonb_agg(to_jsonb(collection_row))
      from (
        select slug, title, description, long_description, best_for, related_types, related_tags
        from public.collections
        where status = 'published'
        order by title asc
        limit 6
      ) collection_row
    ), '[]'::jsonb),
    'creators', coalesce((
      select jsonb_agg(to_jsonb(creator_row))
      from (
        select slug, brand_name, niche, description, tags, followers, assets_count,
          downloads, rating, monthly_revenue, strengths
        from public.creators
        where active = true
        order by featured desc, brand_name asc
        limit 3
      ) creator_row
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(to_jsonb(post_row))
      from (
        select b.slug, b.title, b.excerpt, b.category, b.published_at, b.created_at,
          case when c.id is null then null else jsonb_build_object('slug', c.slug, 'brand_name', c.brand_name) end as creators
        from public.blog_posts b
        left join public.creators c on c.id = b.creator_id
        where b.status = 'published'
        order by b.published_at desc
        limit 3
      ) post_row
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_homepage_feed() from public;
grant execute on function public.get_homepage_feed() to anon, authenticated;

