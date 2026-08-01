-- MB-012: paid listings unlock only after a creator has contributed
-- three published free assets and three published creator blog posts.
-- This is enforced in trusted database transitions, not merely the browser.

create or replace function public.paid_listing_eligibility(target_creator_id uuid)
returns table (published_free_assets integer, published_blog_posts integer, eligible boolean)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*)::integer from public.assets where creator_id = target_creator_id and status = 'published' and price_type = 'free' and is_free = true and price = 0) as published_free_assets,
    (select count(*)::integer from public.blog_posts where creator_id = target_creator_id and status = 'published') as published_blog_posts,
    ((select count(*) from public.assets where creator_id = target_creator_id and status = 'published' and price_type = 'free' and is_free = true and price = 0) >= 3
      and (select count(*) from public.blog_posts where creator_id = target_creator_id and status = 'published') >= 3) as eligible;
$$;

create or replace function public.get_my_paid_listing_eligibility()
returns table (published_free_assets integer, published_blog_posts integer, eligible boolean)
language plpgsql stable security definer set search_path = public
as $$
declare owner_creator_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into owner_creator_id from public.creators where profile_id = auth.uid() and active = true and application_status = 'approved';
  if not found then raise exception 'An approved creator account is required'; end if;
  return query select * from public.paid_listing_eligibility(owner_creator_id);
end;
$$;

create or replace function public.submit_asset_for_review(target_asset_id uuid)
returns public.assets
language plpgsql security definer set search_path = public
as $$
declare current_asset public.assets; eligibility record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into current_asset from public.assets where id = target_asset_id for update;
  if not found then raise exception 'Asset not found'; end if;
  if not exists (select 1 from public.creators where creators.id = current_asset.creator_id and creators.profile_id = auth.uid() and creators.active = true and creators.application_status = 'approved') then
    raise exception 'Only the approved owner creator can submit this asset';
  end if;
  if current_asset.status not in ('draft', 'rejected') then raise exception 'Only draft or rejected assets can be submitted for review'; end if;
  if current_asset.price_type = 'paid' then
    select * into eligibility from public.paid_listing_eligibility(current_asset.creator_id);
    if not eligibility.eligible then
      raise exception 'Paid listings require 3 published free assets and 3 published blog posts (currently % free assets and % blog posts).', eligibility.published_free_assets, eligibility.published_blog_posts;
    end if;
  end if;
  update public.assets set status = 'pending_review', submitted_at = now(), reviewed_at = null, reviewed_by = null, rejection_reason = null where id = target_asset_id returning * into current_asset;
  return current_asset;
end;
$$;

create or replace function public.review_asset(target_asset_id uuid, target_status public.asset_status, rejection_reason text default null)
returns public.assets
language plpgsql security definer set search_path = public
as $$
declare current_asset public.assets; normalized_reason text; eligibility record;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if target_status not in ('published', 'rejected', 'draft') then raise exception 'Asset review target must be published, rejected, or draft'; end if;
  normalized_reason := nullif(btrim(coalesce(rejection_reason, '')), '');
  if target_status = 'rejected' and normalized_reason is null then raise exception 'A rejection reason is required'; end if;
  select * into current_asset from public.assets where id = target_asset_id for update;
  if not found then raise exception 'Asset not found'; end if;
  if target_status in ('published', 'rejected') and current_asset.status <> 'pending_review' then raise exception 'Only pending-review assets can be published or rejected'; end if;
  if target_status = 'draft' and current_asset.status not in ('published', 'pending_review') then raise exception 'Only published or pending-review assets can be returned to draft'; end if;
  if target_status = 'published' and current_asset.price_type = 'paid' then
    select * into eligibility from public.paid_listing_eligibility(current_asset.creator_id);
    if not eligibility.eligible then raise exception 'This paid listing no longer meets the 3 published free assets and 3 published blog posts requirement.'; end if;
  end if;
  update public.assets set status = target_status, reviewed_at = case when target_status = 'draft' then null else now() end, reviewed_by = case when target_status = 'draft' then null else auth.uid() end, rejection_reason = case when target_status = 'rejected' then normalized_reason else null end, published_at = case when target_status = 'published' then now() else null end where id = target_asset_id returning * into current_asset;
  return current_asset;
end;
$$;

revoke all on function public.paid_listing_eligibility(uuid) from public, anon;
revoke all on function public.get_my_paid_listing_eligibility() from public, anon;
revoke all on function public.submit_asset_for_review(uuid) from public, anon;
revoke all on function public.review_asset(uuid, public.asset_status, text) from public, anon;
grant execute on function public.get_my_paid_listing_eligibility() to authenticated;
grant execute on function public.submit_asset_for_review(uuid) to authenticated;
grant execute on function public.review_asset(uuid, public.asset_status, text) to authenticated;
