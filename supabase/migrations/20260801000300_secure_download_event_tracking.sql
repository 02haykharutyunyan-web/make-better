-- MB-013: count actual entitled delivery access without exposing delivery data.
-- One creator/buyer can contribute at most one count per asset per calendar day.

create table if not exists public.asset_download_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  accessed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (asset_id, user_id, accessed_on)
);

create index if not exists asset_download_events_asset_created_at_idx
  on public.asset_download_events (asset_id, created_at desc);
create index if not exists asset_download_events_created_at_idx
  on public.asset_download_events (created_at desc);

alter table public.asset_download_events enable row level security;

-- The event log is aggregate-only analytics: never expose individual activity to browsers.
revoke all on public.asset_download_events from public, anon, authenticated;

create or replace function public.record_asset_delivery_access(target_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  accessor_id uuid := auth.uid();
  inserted_rows bigint := 0;
begin
  if accessor_id is null then
    raise exception using errcode = '28000', message = 'AUTHENTICATION_REQUIRED';
  end if;

  -- Only a current, entitled buyer of a published asset can create a counted event.
  if not exists (
    select 1
    from public.assets a
    join public.asset_claims c on c.asset_id = a.id
    where a.id = target_asset_id
      and a.status = 'published'
      and c.user_id = accessor_id
      and c.status in ('unlocked', 'paid_mock')
  ) then
    raise exception using errcode = '42501', message = 'DELIVERY_ACCESS_DENIED';
  end if;

  insert into public.asset_download_events (asset_id, user_id)
  values (target_asset_id, accessor_id)
  on conflict (asset_id, user_id, accessed_on) do nothing;

  get diagnostics inserted_rows = row_count;
  if inserted_rows > 0 then
    update public.assets set downloads = coalesce(downloads, 0) + 1 where id = target_asset_id;
    update public.creators c
      set downloads = coalesce(downloads, 0) + 1
      from public.assets a
      where a.id = target_asset_id and c.id = a.creator_id;
  end if;

  return inserted_rows > 0;
end;
$$;

revoke all on function public.record_asset_delivery_access(uuid) from public, anon;
grant execute on function public.record_asset_delivery_access(uuid) to authenticated;

create or replace function public.get_admin_download_analytics()
returns table (
  downloads_7d bigint,
  downloads_30d bigint,
  top_assets jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where e.created_at >= now() - interval '7 days') as downloads_7d,
    count(*) filter (where e.created_at >= now() - interval '30 days') as downloads_30d,
    coalesce((
      select jsonb_agg(row_to_json(top_asset))
      from (
        select a.id, a.title, a.slug, a.downloads, c.brand_name as creator_name
        from public.assets a
        join public.creators c on c.id = a.creator_id
        where a.downloads > 0
        order by a.downloads desc, a.updated_at desc
        limit 5
      ) top_asset
    ), '[]'::jsonb) as top_assets
  from public.asset_download_events e
  where public.is_admin();
$$;

revoke all on function public.get_admin_download_analytics() from public, anon;
grant execute on function public.get_admin_download_analytics() to authenticated;
