-- Phase 3: private asset delivery through Supabase Storage and gated metadata.
-- Public asset pages must not read this table. Buyers get access only after a claim.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'delivery_type') then
    create type public.delivery_type as enum ('file', 'external_link', 'text');
  end if;
end $$;

create table if not exists public.asset_deliverables (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references public.assets(id) on delete cascade,
  delivery_type public.delivery_type not null,
  storage_bucket text,
  storage_path text,
  file_name text,
  file_size bigint,
  external_url text,
  text_content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_deliverables_payload_check check (
    (delivery_type = 'file' and storage_bucket is not null and storage_path is not null)
    or
    (delivery_type = 'external_link' and external_url is not null)
    or
    (delivery_type = 'text' and text_content is not null)
  )
);

create index if not exists asset_deliverables_asset_id_idx on public.asset_deliverables(asset_id);
create index if not exists asset_deliverables_storage_path_idx on public.asset_deliverables(storage_path);

drop trigger if exists asset_deliverables_set_updated_at on public.asset_deliverables;
create trigger asset_deliverables_set_updated_at before update on public.asset_deliverables
for each row execute function public.set_updated_at();

alter table public.asset_deliverables enable row level security;

drop policy if exists "creators and claimed buyers can read deliverables" on public.asset_deliverables;
create policy "creators and claimed buyers can read deliverables"
on public.asset_deliverables for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.assets
    join public.creators on creators.id = assets.creator_id
    where assets.id = asset_deliverables.asset_id
      and creators.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.asset_claims
    where asset_claims.asset_id = asset_deliverables.asset_id
      and asset_claims.user_id = auth.uid()
      and asset_claims.status in ('unlocked', 'paid_mock')
  )
);

drop policy if exists "creators can create own deliverables" on public.asset_deliverables;
create policy "creators can create own deliverables"
on public.asset_deliverables for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.assets
    join public.creators on creators.id = assets.creator_id
    where assets.id = asset_deliverables.asset_id
      and creators.profile_id = auth.uid()
      and assets.status in ('draft', 'pending_review', 'rejected')
  )
);

drop policy if exists "creators can update own deliverables" on public.asset_deliverables;
create policy "creators can update own deliverables"
on public.asset_deliverables for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.assets
    join public.creators on creators.id = assets.creator_id
    where assets.id = asset_deliverables.asset_id
      and creators.profile_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.assets
    join public.creators on creators.id = assets.creator_id
    where assets.id = asset_deliverables.asset_id
      and creators.profile_id = auth.uid()
      and assets.status in ('draft', 'pending_review', 'rejected')
  )
);

drop policy if exists "admins can delete deliverables" on public.asset_deliverables;
create policy "admins can delete deliverables"
on public.asset_deliverables for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('asset-deliverables', 'asset-deliverables', false, 52428800)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800;

drop policy if exists "creators upload own asset deliverables" on storage.objects;
create policy "creators upload own asset deliverables"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1
    from public.creators
    where creators.id::text = (storage.foldername(name))[1]
      and creators.profile_id = auth.uid()
  )
);

drop policy if exists "entitled users read asset deliverable files" on storage.objects;
create policy "entitled users read asset deliverable files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'asset-deliverables'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.asset_deliverables
      join public.assets on assets.id = asset_deliverables.asset_id
      join public.creators on creators.id = assets.creator_id
      where asset_deliverables.storage_path = storage.objects.name
        and creators.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.asset_deliverables
      join public.asset_claims on asset_claims.asset_id = asset_deliverables.asset_id
      where asset_deliverables.storage_path = storage.objects.name
        and asset_claims.user_id = auth.uid()
        and asset_claims.status in ('unlocked', 'paid_mock')
    )
  )
);

drop policy if exists "creators update own asset deliverable files" on storage.objects;
create policy "creators update own asset deliverable files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1
    from public.creators
    where creators.id::text = (storage.foldername(name))[1]
      and creators.profile_id = auth.uid()
  )
)
with check (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1
    from public.creators
    where creators.id::text = (storage.foldername(name))[1]
      and creators.profile_id = auth.uid()
  )
);

drop policy if exists "admins delete asset deliverable files" on storage.objects;
create policy "admins delete asset deliverable files"
on storage.objects for delete
to authenticated
using (bucket_id = 'asset-deliverables' and public.is_admin());
