-- Task 2A creator application lifecycle.
-- Adds explicit creator approval states and enforces creator submission access in RLS.

create type public.creator_status as enum ('pending', 'approved', 'rejected');

alter table public.creators
  add column application_status public.creator_status not null default 'pending',
  add column application_submitted_at timestamptz not null default now(),
  add column application_reviewed_at timestamptz,
  add column application_rejection_reason text,
  add constraint creators_rejection_reason_required check (
    application_status <> 'rejected'
    or nullif(btrim(coalesce(application_rejection_reason, '')), '') is not null
  );

create index creators_application_status_idx on public.creators(application_status);
create index creators_application_submitted_at_idx on public.creators(application_submitted_at);

create or replace function public.is_approved_creator(target_creator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.creators
    where creators.id = target_creator_id
      and creators.profile_id = auth.uid()
      and creators.application_status = 'approved'
      and creators.active = true
  )
$$;

create or replace function public.set_creator_application_review_fields()
returns trigger
language plpgsql
as $$
begin
  if new.application_status <> old.application_status then
    new.application_reviewed_at = case
      when new.application_status in ('approved', 'rejected') then now()
      else null
    end;
  end if;

  if new.application_status <> 'rejected' then
    new.application_rejection_reason = null;
  end if;

  return new;
end;
$$;

create trigger creators_set_application_review_fields
before update on public.creators
for each row execute function public.set_creator_application_review_fields();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  creator_brand text;
  creator_slug text;
  creator_bio text;
begin
  requested_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'buyer');
  if requested_role = 'admin' then
    requested_role := 'buyer';
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email, new.raw_user_meta_data ->> 'phone', requested_role)
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    email = coalesce(public.profiles.email, excluded.email),
    phone = coalesce(public.profiles.phone, excluded.phone),
    role = case when public.profiles.role = 'admin' then public.profiles.role else excluded.role end;

  if requested_role = 'creator' then
    creator_brand := coalesce(nullif(new.raw_user_meta_data ->> 'brand_name', ''), split_part(new.email, '@', 1));
    creator_slug := lower(regexp_replace(creator_brand, '[^a-zA-Z0-9]+', '-', 'g'));
    creator_slug := trim(both '-' from creator_slug);
    if creator_slug = '' then creator_slug := 'creator'; end if;
    if exists (select 1 from public.creators where slug = creator_slug and profile_id is distinct from new.id) then
      creator_slug := creator_slug || '-' || left(new.id::text, 8);
    end if;
    creator_bio := new.raw_user_meta_data ->> 'bio';

    insert into public.creators (profile_id, slug, brand_name, niche, description, monthly_revenue, application_status, application_submitted_at)
    values (new.id, creator_slug, creator_brand, left(coalesce(creator_bio, ''), 60), creator_bio, '-', 'pending', now())
    on conflict (profile_id) do update set
      brand_name = case when public.creators.application_status = 'rejected' then excluded.brand_name else public.creators.brand_name end,
      niche = case when public.creators.application_status = 'rejected' then excluded.niche else public.creators.niche end,
      description = case when public.creators.application_status = 'rejected' then excluded.description else public.creators.description end,
      application_status = case when public.creators.application_status = 'rejected' then 'pending'::public.creator_status else public.creators.application_status end,
      application_submitted_at = case when public.creators.application_status = 'rejected' then now() else public.creators.application_submitted_at end,
      application_rejection_reason = case when public.creators.application_status = 'rejected' then null else public.creators.application_rejection_reason end;
  end if;

  return new;
end;
$$;

drop policy if exists "creators can create own creator profile" on public.creators;
create policy "creators can create own pending creator profile"
on public.creators for insert
to authenticated
with check ((profile_id = auth.uid() and application_status = 'pending') or public.is_admin());

drop policy if exists "creators can update own creator profile" on public.creators;
create policy "creators can update own pending or rejected creator profile"
on public.creators for update
to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    profile_id = auth.uid()
    and application_status in ('pending', 'rejected')
    and application_rejection_reason is not distinct from (select application_rejection_reason from public.creators existing where existing.id = creators.id)
  )
);

drop policy if exists "creators can submit own assets" on public.assets;
create policy "approved creators can submit own assets"
on public.assets for insert
to authenticated
with check (public.is_admin() or public.is_approved_creator(creator_id));

drop policy if exists "creators can update own draft assets" on public.assets;
create policy "approved creators can update own draft assets"
on public.assets for update
to authenticated
using (public.is_admin() or public.is_approved_creator(creator_id))
with check (public.is_admin() or (public.is_approved_creator(creator_id) and status in ('draft', 'pending_review', 'rejected')));

drop policy if exists "approved creators can submit own blog posts" on public.blog_posts;
create policy "approved creators can submit own blog posts"
on public.blog_posts for insert
to authenticated
with check (creator_id is not null and public.is_approved_creator(creator_id) and status = 'draft');

drop policy if exists "approved creators can update own draft blog posts" on public.blog_posts;
create policy "approved creators can update own draft blog posts"
on public.blog_posts for update
to authenticated
using (creator_id is not null and public.is_approved_creator(creator_id))
with check (creator_id is not null and public.is_approved_creator(creator_id) and status = 'draft');
