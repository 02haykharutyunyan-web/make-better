-- Task 2C forward-only repair for moderation workflow reliability.
-- Does not rewrite content rows or alter historical Task 2B migrations.

create or replace function public.review_asset(target_asset_id uuid, target_status public.asset_status, rejection_reason text default null)
returns public.assets
language plpgsql
security definer
set search_path = public
as $$
declare current_asset public.assets; normalized_reason text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_status not in ('published', 'rejected', 'draft') then raise exception 'Asset review target must be published, rejected, or draft'; end if;
  normalized_reason := nullif(btrim(coalesce(rejection_reason, '')), '');
  if target_status = 'rejected' and normalized_reason is null then raise exception 'A rejection reason is required'; end if;
  select * into current_asset from public.assets where id = target_asset_id for update;
  if not found then raise exception 'Asset not found'; end if;
  if target_status in ('published', 'rejected') and current_asset.status <> 'pending_review' then raise exception 'Only pending-review assets can be published or rejected'; end if;
  if target_status = 'draft' and current_asset.status not in ('published', 'pending_review') then raise exception 'Only published or pending-review assets can be returned to draft'; end if;
  update public.assets
  set status = target_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = case when target_status = 'rejected' then normalized_reason when target_status = 'draft' then rejection_reason else null end,
      published_at = case when target_status = 'published' then now() when target_status = 'draft' then null else published_at end
  where id = target_asset_id returning * into current_asset;
  return current_asset;
end;
$$;

create or replace function public.review_blog_post(target_blog_post_id uuid, target_status public.publish_status, rejection_reason text default null)
returns public.blog_posts
language plpgsql
security definer
set search_path = public
as $$
declare current_post public.blog_posts; normalized_reason text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_status not in ('published', 'rejected', 'draft') then raise exception 'Blog review target must be published, rejected, or draft'; end if;
  normalized_reason := nullif(btrim(coalesce(rejection_reason, '')), '');
  if target_status = 'rejected' and normalized_reason is null then raise exception 'A rejection reason is required'; end if;
  select * into current_post from public.blog_posts where id = target_blog_post_id for update;
  if not found then raise exception 'Blog post not found'; end if;
  if target_status in ('published', 'rejected') and current_post.status <> 'pending_review' then raise exception 'Only pending-review blog posts can be published or rejected'; end if;
  if target_status = 'draft' and current_post.status not in ('published', 'pending_review') then raise exception 'Only published or pending-review blog posts can be returned to draft'; end if;
  update public.blog_posts
  set status = target_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = case when target_status = 'rejected' then normalized_reason when target_status = 'draft' then rejection_reason else null end,
      published_at = case when target_status = 'published' then now() when target_status = 'draft' then null else published_at end
  where id = target_blog_post_id returning * into current_post;
  return current_post;
end;
$$;

revoke all on function public.review_asset(uuid, public.asset_status, text) from public, anon;
revoke all on function public.review_blog_post(uuid, public.publish_status, text) from public, anon;
grant execute on function public.review_asset(uuid, public.asset_status, text) to authenticated;
grant execute on function public.review_blog_post(uuid, public.publish_status, text) to authenticated;

grant insert (slug, title, excerpt, category, body, creator_id, status) on public.blog_posts to authenticated;
grant update (slug, title, excerpt, category, body, status) on public.blog_posts to authenticated;
