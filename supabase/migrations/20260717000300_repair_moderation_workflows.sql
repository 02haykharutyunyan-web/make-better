-- Task 2C forward-only repair for moderation workflow reliability.
-- Does not rewrite content rows or alter historical Task 2B migrations.

create or replace function public.create_blog_draft(
  draft_slug text,
  draft_title text,
  draft_excerpt text default null,
  draft_category text default null,
  draft_body text default null
)
returns public.blog_posts
language plpgsql
security definer
set search_path = public
as $$
declare owner_creator public.creators; created_post public.blog_posts;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into owner_creator
  from public.creators
  where profile_id = auth.uid()
    and active = true
    and application_status = 'approved';
  if not found then raise exception 'Exactly one approved active creator is required to create a blog draft'; end if;
  if (select count(*) from public.creators where profile_id = auth.uid() and active = true and application_status = 'approved') <> 1 then
    raise exception 'Exactly one approved active creator is required to create a blog draft';
  end if;
  insert into public.blog_posts (creator_id, slug, title, excerpt, category, body, status)
  values (owner_creator.id, draft_slug, draft_title, draft_excerpt, draft_category, draft_body, 'draft')
  returning * into created_post;
  return created_post;
end;
$$;

create or replace function public.submit_asset_for_review(target_asset_id uuid)
returns public.assets
language plpgsql
security definer
set search_path = public
as $$
declare current_asset public.assets;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into current_asset from public.assets where id = target_asset_id for update;
  if not found then raise exception 'Asset not found'; end if;
  if not exists (select 1 from public.creators where creators.id = current_asset.creator_id and creators.profile_id = auth.uid() and creators.active = true and creators.application_status = 'approved') then
    raise exception 'Only the approved owner creator can submit this asset';
  end if;
  if current_asset.status not in ('draft', 'rejected') then raise exception 'Only draft or rejected assets can be submitted for review'; end if;
  update public.assets
  set status = 'pending_review', submitted_at = now(), reviewed_at = null, reviewed_by = null, rejection_reason = null
  where id = target_asset_id returning * into current_asset;
  return current_asset;
end;
$$;

create or replace function public.submit_blog_post_for_review(target_blog_post_id uuid)
returns public.blog_posts
language plpgsql
security definer
set search_path = public
as $$
declare current_post public.blog_posts;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into current_post from public.blog_posts where id = target_blog_post_id for update;
  if not found then raise exception 'Blog post not found'; end if;
  if current_post.creator_id is null or not exists (select 1 from public.creators where creators.id = current_post.creator_id and creators.profile_id = auth.uid() and creators.active = true and creators.application_status = 'approved') then
    raise exception 'Only the approved owner creator can submit this blog post';
  end if;
  if current_post.status not in ('draft', 'rejected') then raise exception 'Only draft or rejected blog posts can be submitted for review'; end if;
  update public.blog_posts
  set status = 'pending_review', submitted_at = now(), reviewed_at = null, reviewed_by = null, rejection_reason = null
  where id = target_blog_post_id returning * into current_post;
  return current_post;
end;
$$;

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
      reviewed_at = case when target_status = 'draft' then null else now() end,
      reviewed_by = case when target_status = 'draft' then null else auth.uid() end,
      rejection_reason = case when target_status = 'rejected' then normalized_reason else null end,
      published_at = case when target_status = 'published' then now() else null end
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
      reviewed_at = case when target_status = 'draft' then null else now() end,
      reviewed_by = case when target_status = 'draft' then null else auth.uid() end,
      rejection_reason = case when target_status = 'rejected' then normalized_reason else null end,
      published_at = case when target_status = 'published' then now() else null end
  where id = target_blog_post_id returning * into current_post;
  return current_post;
end;
$$;

revoke all on function public.create_blog_draft(text, text, text, text, text) from public, anon;
revoke all on function public.submit_asset_for_review(uuid) from public, anon;
revoke all on function public.submit_blog_post_for_review(uuid) from public, anon;
revoke all on function public.review_asset(uuid, public.asset_status, text) from public, anon;
revoke all on function public.review_blog_post(uuid, public.publish_status, text) from public, anon;
grant execute on function public.create_blog_draft(text, text, text, text, text) to authenticated;
grant execute on function public.submit_asset_for_review(uuid) to authenticated;
grant execute on function public.submit_blog_post_for_review(uuid) to authenticated;
grant execute on function public.review_asset(uuid, public.asset_status, text) to authenticated;
grant execute on function public.review_blog_post(uuid, public.publish_status, text) to authenticated;

grant insert (slug, title, excerpt, category, body, creator_id, status) on public.blog_posts to authenticated;
grant update (slug, title, excerpt, category, body, status) on public.blog_posts to authenticated;
