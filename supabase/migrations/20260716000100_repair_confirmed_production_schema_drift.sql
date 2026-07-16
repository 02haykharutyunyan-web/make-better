-- Forward-only repair for confirmed production schema drift from the 2026-07-16 audit.
-- Do not use this file for migration-history repair or replay of historical migrations.
-- Contains only the confirmed missing function and explicit GIN indexes.

create function public.can_access_asset_delivery(target_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.assets
      join public.creators on creators.id = assets.creator_id
      where assets.id = target_asset_id
        and creators.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.assets
      join public.asset_claims on asset_claims.asset_id = assets.id
      where assets.id = target_asset_id
        and assets.status = 'published'
        and asset_claims.user_id = auth.uid()
        and asset_claims.status in ('unlocked', 'paid_mock')
    );
$$;

revoke all on function public.can_access_asset_delivery(uuid) from public;
revoke all on function public.can_access_asset_delivery(uuid) from anon;
grant execute on function public.can_access_asset_delivery(uuid) to authenticated;

create index if not exists collections_related_tags_idx
on public.collections using gin (related_tags);

create index if not exists assets_tags_idx
on public.assets using gin (tags);
