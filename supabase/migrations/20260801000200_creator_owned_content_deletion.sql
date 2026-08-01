-- MB-013: creators can permanently delete only their own content.
--
-- Eligibility is always calculated from rows that still exist and remain
-- published. When a creator deletes one of those qualifying rows, any of
-- their paid listings that no longer meet the rule are immediately returned
-- to draft so they cannot remain publicly available without the prerequisite.

create or replace function public.delete_own_asset(target_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_asset public.assets;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select assets.* into owned_asset
  from public.assets
  join public.creators on creators.id = assets.creator_id
  where assets.id = target_asset_id
    and creators.profile_id = auth.uid()
  for update of assets;

  if not found then raise exception 'Asset not found or not owned by you'; end if;

  delete from public.assets where id = owned_asset.id;

  if not (select eligible from public.paid_listing_eligibility(owned_asset.creator_id)) then
    update public.assets
    set status = 'draft',
        published_at = null,
        reviewed_at = null,
        reviewed_by = null,
        rejection_reason = null
    where creator_id = owned_asset.creator_id
      and price_type = 'paid'
      and status in ('published', 'pending_review');
  end if;
end;
$$;

create or replace function public.delete_own_blog_post(target_blog_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_post public.blog_posts;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select blog_posts.* into owned_post
  from public.blog_posts
  join public.creators on creators.id = blog_posts.creator_id
  where blog_posts.id = target_blog_post_id
    and creators.profile_id = auth.uid()
  for update of blog_posts;

  if not found then raise exception 'Blog post not found or not owned by you'; end if;

  delete from public.blog_posts where id = owned_post.id;

  if not (select eligible from public.paid_listing_eligibility(owned_post.creator_id)) then
    update public.assets
    set status = 'draft',
        published_at = null,
        reviewed_at = null,
        reviewed_by = null,
        rejection_reason = null
    where creator_id = owned_post.creator_id
      and price_type = 'paid'
      and status in ('published', 'pending_review');
  end if;
end;
$$;

-- File removal happens before the asset row is deleted, while the ownership
-- relationship is still verifiable by Storage RLS. This only grants a creator
-- access to delete a file in their own creator-id/asset-id folder.
drop policy if exists "creators delete own asset deliverable files" on storage.objects;
create policy "creators delete own asset deliverable files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1
    from public.assets
    join public.creators on creators.id = assets.creator_id
    where creators.id::text = (storage.foldername(storage.objects.name))[1]
      and assets.id::text = (storage.foldername(storage.objects.name))[2]
      and creators.profile_id = auth.uid()
  )
);

revoke all on function public.delete_own_asset(uuid) from public, anon;
revoke all on function public.delete_own_blog_post(uuid) from public, anon;
grant execute on function public.delete_own_asset(uuid) to authenticated;
grant execute on function public.delete_own_blog_post(uuid) to authenticated;
