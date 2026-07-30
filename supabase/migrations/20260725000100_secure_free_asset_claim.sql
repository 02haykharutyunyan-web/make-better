-- Task 3: transactional, idempotent claims for published free assets.
-- Private delivery remains protected by the existing RLS and storage policies.

create or replace function public.claim_free_asset(target_asset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimant_id uuid := auth.uid();
  target_asset public.assets%rowtype;
  claim_id uuid;
  inserted boolean := false;
begin
  if claimant_id is null then
    raise exception using errcode = '28000', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select * into target_asset
  from public.assets
  where id = target_asset_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'ASSET_NOT_FOUND';
  end if;
  if target_asset.status <> 'published' then
    raise exception using errcode = 'P0001', message = 'ASSET_NOT_PUBLISHED';
  end if;
  if target_asset.price_type <> 'free' or not target_asset.is_free or target_asset.price <> 0 then
    raise exception using errcode = 'P0001', message = 'ASSET_NOT_FREE';
  end if;

  insert into public.asset_claims (user_id, asset_id, status)
  values (claimant_id, target_asset.id, 'unlocked')
  on conflict (user_id, asset_id) do nothing
  returning id into claim_id;

  if claim_id is not null then
    inserted := true;
  else
    select id into claim_id
    from public.asset_claims
    where user_id = claimant_id and asset_id = target_asset.id;
  end if;

  return jsonb_build_object(
    'claim_id', claim_id,
    'asset_id', target_asset.id,
    'asset_slug', target_asset.slug,
    'outcome', case when inserted then 'claimed' else 'already_claimed' end
  );
end;
$$;

revoke all on function public.claim_free_asset(uuid) from public, anon;
grant execute on function public.claim_free_asset(uuid) to authenticated;

-- Direct browser writes could previously choose another user, paid asset, or status.
-- All buyer claims now go through the eligibility-checking function above.
revoke insert, update, delete on public.asset_claims from anon;
grant insert, update, delete on public.asset_claims to authenticated;

drop policy if exists "users can create own claims" on public.asset_claims;
drop policy if exists "users can update own claims" on public.asset_claims;
drop policy if exists "users can claim free published assets" on public.asset_claims;

-- Defense in depth: a buyer claim authorizes delivery only while the asset remains
-- published. Admin and creator access are unchanged.
create or replace function public.can_access_asset_delivery(target_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.assets
      join public.creators on creators.id = assets.creator_id
      where assets.id = target_asset_id and creators.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.asset_claims
      join public.assets on assets.id = asset_claims.asset_id
      where asset_claims.asset_id = target_asset_id
        and asset_claims.user_id = auth.uid()
        and asset_claims.status in ('unlocked', 'paid_mock')
        and assets.status = 'published'
    );
$$;

revoke all on function public.can_access_asset_delivery(uuid) from public, anon;
grant execute on function public.can_access_asset_delivery(uuid) to authenticated;
