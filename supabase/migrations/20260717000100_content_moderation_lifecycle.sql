-- Task 2B content moderation lifecycle for assets and creator blog posts.
-- Forward-only: preserves existing published content and classifies non-published
-- records into editable draft/rejected or admin-review states without publishing.

alter type public.publish_status add value if not exists 'pending_review';
alter type public.publish_status add value if not exists 'rejected';

alter table public.assets
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.blog_posts
  add column if not exists rejection_reason text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

-- Existing published records stay published. Existing legitimate non-published
-- records remain non-published; old approved assets become pending_review because
-- every asset now requires explicit publish approval.
update public.assets
set
  submitted_at = coalesce(submitted_at, created_at, now()),
  reviewed_at = case when status = 'published' then coalesce(reviewed_at, published_at, updated_at, now()) else reviewed_at end,
  rejection_reason = case when status <> 'rejected' then null else rejection_reason end
where submitted_at is null or (status = 'published' and reviewed_at is null) or (status <> 'rejected' and rejection_reason is not null);

update public.assets
set status = 'pending_review'
where status = 'approved';

update public.blog_posts
set
  submitted_at = case when status in ('published', 'pending_review') then coalesce(submitted_at, created_at, now()) else submitted_at end,
  reviewed_at = case when status = 'published' then coalesce(reviewed_at, published_at, updated_at, now()) else reviewed_at end,
  rejection_reason = case when status <> 'rejected' then null else rejection_reason end
where submitted_at is null or (status = 'published' and reviewed_at is null) or (status <> 'rejected' and rejection_reason is not null);

alter table public.assets
  alter column submitted_at drop not null,
  add constraint assets_rejection_reason_required check (
    status <> 'rejected' or nullif(btrim(coalesce(rejection_reason, '')), '') is not null
  );

alter table public.blog_posts
  add constraint blog_posts_rejection_reason_required check (
    status <> 'rejected' or nullif(btrim(coalesce(rejection_reason, '')), '') is not null
  );

create index if not exists assets_moderation_queue_idx on public.assets(status, submitted_at desc, creator_id) where status in ('pending_review', 'rejected', 'published');
create index if not exists blog_posts_moderation_queue_idx on public.blog_posts(status, submitted_at desc, creator_id) where status in ('pending_review', 'rejected', 'published');
create index if not exists assets_reviewed_by_idx on public.assets(reviewed_by);
create index if not exists blog_posts_reviewed_by_idx on public.blog_posts(reviewed_by);

create or replace function public.content_is_creator_editable(content_status text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select content_status in ('draft', 'rejected')
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
  if not public.is_approved_creator(current_asset.creator_id) then raise exception 'Only the approved owner creator can submit this asset'; end if;
  if current_asset.status not in ('draft', 'rejected') then raise exception 'Only draft or rejected assets can be submitted for review'; end if;
  update public.assets set status = 'pending_review', submitted_at = now(), reviewed_at = null, reviewed_by = null, rejection_reason = null
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
  if current_post.creator_id is null or not public.is_approved_creator(current_post.creator_id) then raise exception 'Only the approved owner creator can submit this blog post'; end if;
  if current_post.status not in ('draft', 'rejected') then raise exception 'Only draft or rejected blog posts can be submitted for review'; end if;
  update public.blog_posts set status = 'pending_review', submitted_at = now(), reviewed_at = null, reviewed_by = null, rejection_reason = null
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
  if target_status in ('published', 'rejected') and current_asset.status <> 'pending_review' then raise exception 'Only pending-review assets can be approved or rejected'; end if;
  if target_status = 'draft' and current_asset.status not in ('published', 'pending_review') then raise exception 'Only published or pending-review assets can be returned for changes'; end if;
  update public.assets set status = target_status, reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = case when target_status = 'rejected' then normalized_reason else null end, published_at = case when target_status = 'published' then now() when target_status = 'draft' then null else published_at end
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
  if target_status in ('published', 'rejected') and current_post.status <> 'pending_review' then raise exception 'Only pending-review blog posts can be approved or rejected'; end if;
  if target_status = 'draft' and current_post.status not in ('published', 'pending_review') then raise exception 'Only published or pending-review blog posts can be returned for changes'; end if;
  update public.blog_posts set status = target_status, reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = case when target_status = 'rejected' then normalized_reason else null end, published_at = case when target_status = 'published' then now() when target_status = 'draft' then null else published_at end
  where id = target_blog_post_id returning * into current_post;
  return current_post;
end;
$$;

revoke all on function public.content_is_creator_editable(text) from public;
revoke all on function public.submit_asset_for_review(uuid) from public;
revoke all on function public.submit_blog_post_for_review(uuid) from public;
revoke all on function public.review_asset(uuid, public.asset_status, text) from public;
revoke all on function public.review_blog_post(uuid, public.publish_status, text) from public;
revoke all on function public.submit_asset_for_review(uuid) from anon;
revoke all on function public.submit_blog_post_for_review(uuid) from anon;
revoke all on function public.review_asset(uuid, public.asset_status, text) from anon;
revoke all on function public.review_blog_post(uuid, public.publish_status, text) from anon;
grant execute on function public.content_is_creator_editable(text) to authenticated;
grant execute on function public.submit_asset_for_review(uuid) to authenticated;
grant execute on function public.submit_blog_post_for_review(uuid) to authenticated;
grant execute on function public.review_asset(uuid, public.asset_status, text) to authenticated;
grant execute on function public.review_blog_post(uuid, public.publish_status, text) to authenticated;

-- Direct lifecycle writes are blocked; creators can edit only own draft/rejected
-- content columns. Trusted RPCs perform submission/review transitions.
revoke update on public.assets from authenticated;
grant update (slug, title, product_type, category, short_description, long_description, tags, is_free, price, price_type, preview_image_path, asset_file_path, use_cases, included, before, after)
on public.assets to authenticated;
revoke update on public.blog_posts from authenticated;
grant update (slug, title, excerpt, category, body)
on public.blog_posts to authenticated;

drop policy if exists "approved creators can submit own assets" on public.assets;
create policy "approved creators can create own editable assets"
on public.assets for insert to authenticated
with check (public.is_admin() or (public.is_approved_creator(creator_id) and status in ('draft', 'pending_review')));

drop policy if exists "approved creators can update own draft assets" on public.assets;
create policy "approved creators can update own editable assets"
on public.assets for update to authenticated
using (public.is_admin() or (public.is_approved_creator(creator_id) and public.content_is_creator_editable(status::text)))
with check (public.is_admin() or (public.is_approved_creator(creator_id) and public.content_is_creator_editable(status::text)));

drop policy if exists "public can read published blog posts" on public.blog_posts;
create policy "public and owners can read blog posts"
on public.blog_posts for select to anon, authenticated
using (status = 'published' or public.is_admin() or (creator_id is not null and creator_id in (select id from public.creators where profile_id = auth.uid())));

drop policy if exists "approved creators can submit own blog posts" on public.blog_posts;
create policy "approved creators can create own editable blog posts"
on public.blog_posts for insert to authenticated
with check (public.is_admin() or (creator_id is not null and public.is_approved_creator(creator_id) and status in ('draft', 'pending_review')));

drop policy if exists "approved creators can update own draft blog posts" on public.blog_posts;
create policy "approved creators can update own editable blog posts"
on public.blog_posts for update to authenticated
using (public.is_admin() or (creator_id is not null and public.is_approved_creator(creator_id) and public.content_is_creator_editable(status::text)))
with check (public.is_admin() or (creator_id is not null and public.is_approved_creator(creator_id) and public.content_is_creator_editable(status::text)));
