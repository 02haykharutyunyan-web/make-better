-- MakeBetter observability and public-request hardening.
-- Events deliberately exclude email, phone, IP address, storage paths and delivery data.

create table if not exists public.marketplace_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'asset_view', 'free_claim_started', 'free_claim_completed', 'delivery_opened',
    'creator_asset_submitted', 'admin_asset_reviewed', 'client_error'
  )),
  asset_id uuid references public.assets(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  session_id uuid,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint marketplace_events_metadata_safe check (
    jsonb_typeof(metadata) = 'object'
    and not (metadata ?| array['email', 'phone', 'name', 'storage_path', 'external_url', 'text_content'])
  )
);

create index if not exists marketplace_events_name_created_at_idx
  on public.marketplace_events (event_name, created_at desc);
create index if not exists marketplace_events_asset_created_at_idx
  on public.marketplace_events (asset_id, created_at desc) where asset_id is not null;

alter table public.marketplace_events enable row level security;

drop policy if exists "admins read marketplace events" on public.marketplace_events;
create policy "admins read marketplace events"
on public.marketplace_events for select to authenticated
using (public.is_admin());

-- Browser clients never receive INSERT permission on the event table. This function
-- caps a session at 60 events per 10 minutes and records only the allowlisted fields.
create or replace function public.track_marketplace_event(
  target_event_name text,
  target_asset_id uuid default null,
  client_session_id uuid default null,
  safe_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
begin
  if target_event_name not in (
    'asset_view', 'free_claim_started', 'free_claim_completed', 'delivery_opened',
    'creator_asset_submitted', 'admin_asset_reviewed', 'client_error'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_EVENT_NAME';
  end if;
  if safe_metadata is null or jsonb_typeof(safe_metadata) <> 'object'
    or safe_metadata ?| array['email', 'phone', 'name', 'storage_path', 'external_url', 'text_content'] then
    raise exception using errcode = '22023', message = 'INVALID_EVENT_METADATA';
  end if;
  if client_session_id is not null and (
    select count(*) from public.marketplace_events
    where session_id = client_session_id and created_at > now() - interval '10 minutes'
  ) >= 60 then
    raise exception using errcode = 'P0001', message = 'EVENT_RATE_LIMITED';
  end if;

  insert into public.marketplace_events (event_name, asset_id, actor_id, session_id, metadata)
  values (target_event_name, target_asset_id, actor, client_session_id, safe_metadata);
end;
$$;

revoke all on public.marketplace_events from public, anon, authenticated;
revoke all on function public.track_marketplace_event(text, uuid, uuid, jsonb) from public;
grant execute on function public.track_marketplace_event(text, uuid, uuid, jsonb) to anon, authenticated;

-- Paid checkout is not live yet; requests are still protected from mass inserts and
-- cannot set another user's identity or a non-published/free asset.
create or replace function public.request_paid_asset_access(
  target_asset_slug text,
  request_name text,
  request_email text,
  request_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_asset public.assets%rowtype;
  requester uuid := auth.uid();
  normalized_email text := lower(trim(request_email));
  request_id uuid;
begin
  if length(trim(request_name)) < 2 or length(trim(request_name)) > 120
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or (request_phone is not null and length(trim(request_phone)) > 40) then
    raise exception using errcode = '22023', message = 'INVALID_ACCESS_REQUEST';
  end if;
  select * into target_asset from public.assets where slug = target_asset_slug and status = 'published';
  if not found or target_asset.is_free or target_asset.price_type <> 'paid' then
    raise exception using errcode = 'P0001', message = 'ASSET_NOT_AVAILABLE_FOR_PAID_ACCESS';
  end if;
  if (
    select count(*) from public.asset_access_requests
    where buyer_email = normalized_email and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception using errcode = 'P0001', message = 'ACCESS_REQUEST_RATE_LIMITED';
  end if;
  insert into public.asset_access_requests (asset_id, buyer_user_id, buyer_name, buyer_email, buyer_phone, status)
  values (target_asset.id, requester, trim(request_name), normalized_email, nullif(trim(request_phone), ''), 'new')
  on conflict do nothing
  returning id into request_id;
  return request_id;
end;
$$;

revoke insert, update, delete on public.asset_access_requests from anon, authenticated;
revoke all on function public.request_paid_asset_access(text, text, text, text) from public;
grant execute on function public.request_paid_asset_access(text, text, text, text) to anon, authenticated;

create or replace function public.get_marketplace_observability()
returns table (
  asset_views bigint,
  free_claim_starts bigint,
  free_claims_completed bigint,
  deliveries_opened bigint,
  creator_submissions bigint,
  admin_reviews bigint,
  client_errors_24h bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where event_name = 'asset_view' and created_at > now() - interval '7 days'),
    count(*) filter (where event_name = 'free_claim_started' and created_at > now() - interval '7 days'),
    count(*) filter (where event_name = 'free_claim_completed' and created_at > now() - interval '7 days'),
    count(*) filter (where event_name = 'delivery_opened' and created_at > now() - interval '7 days'),
    count(*) filter (where event_name = 'creator_asset_submitted' and created_at > now() - interval '7 days'),
    count(*) filter (where event_name = 'admin_asset_reviewed' and created_at > now() - interval '7 days'),
    count(*) filter (where event_name = 'client_error' and created_at > now() - interval '24 hours')
  from public.marketplace_events
  where public.is_admin();
$$;

revoke all on function public.get_marketplace_observability() from public, anon;
grant execute on function public.get_marketplace_observability() to authenticated;
