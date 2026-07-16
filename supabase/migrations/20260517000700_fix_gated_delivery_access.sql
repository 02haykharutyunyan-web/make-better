-- Production repair for gated buyer delivery access.
-- Keeps public pages from reading private delivery metadata, while allowing
-- claimed buyers to read delivery records and generate signed URLs only for
-- published assets they have unlocked.

create or replace function public.can_access_asset_delivery(target_asset_id uuid)
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

grant execute on function public.can_access_asset_delivery(uuid) to authenticated;

drop policy if exists "creators and claimed buyers can read deliverables" on public.asset_deliverables;
create policy "creators and claimed buyers can read deliverables"
on public.asset_deliverables for select
to authenticated
using (public.can_access_asset_delivery(asset_id));

drop policy if exists "entitled users read asset deliverable files" on storage.objects;
create policy "entitled users read asset deliverable files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1
    from public.asset_deliverables
    where asset_deliverables.storage_path = storage.objects.name
      and public.can_access_asset_delivery(asset_deliverables.asset_id)
  )
);
