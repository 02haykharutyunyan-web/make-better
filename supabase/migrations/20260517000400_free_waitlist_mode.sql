-- Launch-ready free/waitlist mode for paid assets while Stripe is unavailable.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'access_request_status') then
    create type public.access_request_status as enum ('new', 'contacted', 'closed');
  end if;
end $$;

create table if not exists public.asset_access_requests (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  buyer_user_id uuid references public.profiles(id) on delete set null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  status public.access_request_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, buyer_email)
);

create index if not exists asset_access_requests_asset_id_idx on public.asset_access_requests(asset_id);
create index if not exists asset_access_requests_status_idx on public.asset_access_requests(status);
create index if not exists asset_access_requests_created_at_idx on public.asset_access_requests(created_at);

drop trigger if exists asset_access_requests_set_updated_at on public.asset_access_requests;
create trigger asset_access_requests_set_updated_at before update on public.asset_access_requests
for each row execute function public.set_updated_at();

alter table public.asset_access_requests enable row level security;

drop policy if exists "anyone can request access to published paid assets" on public.asset_access_requests;
create policy "anyone can request access to published paid assets"
on public.asset_access_requests for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.assets
    where assets.id = asset_access_requests.asset_id
      and assets.status = 'published'
      and assets.is_free = false
  )
);

drop policy if exists "admins can manage all access requests" on public.asset_access_requests;
create policy "admins can manage all access requests"
on public.asset_access_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "creators can read own asset access requests" on public.asset_access_requests;
create policy "creators can read own asset access requests"
on public.asset_access_requests for select
to authenticated
using (
  exists (
    select 1
    from public.assets
    join public.creators on creators.id = assets.creator_id
    where assets.id = asset_access_requests.asset_id
      and creators.profile_id = auth.uid()
  )
);

drop policy if exists "buyers can read own access requests" on public.asset_access_requests;
create policy "buyers can read own access requests"
on public.asset_access_requests for select
to authenticated
using (
  buyer_user_id = auth.uid()
  or lower(buyer_email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
);
