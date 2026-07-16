-- Task 2A creator application lifecycle.
-- This migration has not been applied to production at the time of authoring.
-- It adds explicit application states, preserves established legacy creators, and
-- moves review/reapplication transitions into fail-closed database functions.

create type public.creator_status as enum ('pending', 'approved', 'rejected');

alter table public.creators
  add column application_status public.creator_status,
  add column application_submitted_at timestamptz,
  add column application_reviewed_at timestamptz,
  add column application_rejection_reason text;

-- Deterministic legacy backfill:
-- * established marketplace creators (unlinked seed profiles or creators with
--   published content) stay operational and are approved;
-- * linked creators without published content enter the review queue.
update public.creators creator
set
  application_status = case
    when creator.profile_id is null
      or exists (
        select 1 from public.assets
        where assets.creator_id = creator.id and assets.status = 'published'
      )
      or exists (
        select 1 from public.blog_posts
        where blog_posts.creator_id = creator.id and blog_posts.status = 'published'
      )
    then 'approved'::public.creator_status
    else 'pending'::public.creator_status
  end,
  application_submitted_at = coalesce(creator.created_at, now()),
  application_reviewed_at = case
    when creator.profile_id is null
      or exists (
        select 1 from public.assets
        where assets.creator_id = creator.id and assets.status = 'published'
      )
      or exists (
        select 1 from public.blog_posts
        where blog_posts.creator_id = creator.id and blog_posts.status = 'published'
      )
    then now()
    else null
  end;

alter table public.creators
  alter column application_status set default 'pending',
  alter column application_status set not null,
  alter column application_submitted_at set default now(),
  alter column application_submitted_at set not null,
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

create or replace function public.creator_application_status_is(
  target_creator_id uuid,
  expected_status public.creator_status
)
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
      and creators.application_status = expected_status
  )
$$;

create or replace function public.review_creator_application(
  target_creator_id uuid,
  target_status public.creator_status,
  rejection_reason text default null
)
returns public.creators
language plpgsql
security definer
set search_path = public
as $$
declare
  current_creator public.creators;
  normalized_reason text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if target_status not in ('approved', 'rejected') then
    raise exception 'Review status must be approved or rejected';
  end if;

  normalized_reason := nullif(btrim(coalesce(rejection_reason, '')), '');
  if target_status = 'rejected' and normalized_reason is null then
    raise exception 'A rejection reason is required';
  end if;

  select *
  into current_creator
  from public.creators
  where id = target_creator_id
  for update;

  if not found then
    raise exception 'Creator application not found';
  end if;

  if current_creator.profile_id = auth.uid() then
    raise exception 'Admins cannot review their own creator application';
  end if;

  if current_creator.application_status <> 'pending' then
    raise exception 'Only pending creator applications can be reviewed';
  end if;

  update public.creators
  set
    application_status = target_status,
    application_reviewed_at = now(),
    application_rejection_reason = case
      when target_status = 'rejected' then normalized_reason
      else null
    end
  where id = target_creator_id
  returning * into current_creator;

  return current_creator;
end;
$$;

create or replace function public.reapply_creator_application()
returns public.creators
language plpgsql
security definer
set search_path = public
as $$
declare
  current_creator public.creators;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into current_creator
  from public.creators
  where profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'Creator application not found';
  end if;

  if current_creator.application_status <> 'rejected' then
    raise exception 'Only rejected applications can be resubmitted';
  end if;

  update public.creators
  set
    application_status = 'pending',
    application_submitted_at = now(),
    application_reviewed_at = null,
    application_rejection_reason = null
  where id = current_creator.id
  returning * into current_creator;

  return current_creator;
end;
$$;

create or replace function public.set_creator_featured(
  target_creator_id uuid,
  target_featured boolean
)
returns public.creators
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_creator public.creators;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.creators
  set featured = target_featured
  where id = target_creator_id
  returning * into updated_creator;

  if not found then
    raise exception 'Creator not found';
  end if;

  return updated_creator;
end;
$$;

revoke all on function public.is_approved_creator(uuid) from public;
revoke all on function public.creator_application_status_is(uuid, public.creator_status) from public;
revoke all on function public.review_creator_application(uuid, public.creator_status, text) from public;
revoke all on function public.reapply_creator_application() from public;
revoke all on function public.set_creator_featured(uuid, boolean) from public;

revoke all on function public.review_creator_application(uuid, public.creator_status, text) from anon;
revoke all on function public.reapply_creator_application() from anon;
revoke all on function public.set_creator_featured(uuid, boolean) from anon;

grant execute on function public.is_approved_creator(uuid) to authenticated;
grant execute on function public.creator_application_status_is(uuid, public.creator_status) to authenticated;
grant execute on function public.review_creator_application(uuid, public.creator_status, text) to authenticated;
grant execute on function public.reapply_creator_application() to authenticated;
grant execute on function public.set_creator_featured(uuid, boolean) to authenticated;

-- Auth signup creates only a new pending application. Reapplication is handled
-- explicitly by reapply_creator_application(), never as a side effect of login.
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
    creator_slug := trim(both '-' from lower(regexp_replace(creator_brand, '[^a-zA-Z0-9]+', '-', 'g')));
    if creator_slug = '' then creator_slug := 'creator'; end if;
    if exists (select 1 from public.creators where slug = creator_slug and profile_id is distinct from new.id) then
      creator_slug := creator_slug || '-' || left(new.id::text, 8);
    end if;
    creator_bio := new.raw_user_meta_data ->> 'bio';

    insert into public.creators (
      profile_id, slug, brand_name, niche, description, monthly_revenue,
      application_status, application_submitted_at
    )
    values (
      new.id, creator_slug, creator_brand, left(coalesce(creator_bio, ''), 60),
      creator_bio, '-', 'pending', now()
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop policy if exists "creators can create own creator profile" on public.creators;
drop policy if exists "creators can create own pending creator profile" on public.creators;
create policy "creators can create own pending creator profile"
on public.creators for insert
to authenticated
with check ((profile_id = auth.uid() and application_status = 'pending') or public.is_admin());

drop policy if exists "creators can update own creator profile" on public.creators;
drop policy if exists "creators can update own pending or rejected creator profile" on public.creators;
create policy "creators can update own profile without changing application status"
on public.creators for update
to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    profile_id = auth.uid()
    and public.creator_application_status_is(id, application_status)
  )
);

-- Prevent browser clients from changing review/system fields directly. Admin
-- lifecycle and featured changes use the trusted RPC functions above.
revoke update on public.creators from authenticated;
grant update (brand_name, niche, description, tags, monthly_revenue, strengths)
on public.creators to authenticated;

drop policy if exists "creators can submit own assets" on public.assets;
drop policy if exists "approved creators can submit own assets" on public.assets;
create policy "approved creators can submit own assets"
on public.assets for insert
to authenticated
with check (public.is_admin() or public.is_approved_creator(creator_id));

drop policy if exists "creators can update own draft assets" on public.assets;
drop policy if exists "approved creators can update own draft assets" on public.assets;
create policy "approved creators can update own draft assets"
on public.assets for update
to authenticated
using (public.is_admin() or public.is_approved_creator(creator_id))
with check (
  public.is_admin()
  or (public.is_approved_creator(creator_id) and status in ('draft', 'pending_review', 'rejected'))
);

drop policy if exists "approved creators can submit own blog posts" on public.blog_posts;
create policy "approved creators can submit own blog posts"
on public.blog_posts for insert
to authenticated
with check (
  public.is_admin()
  or (creator_id is not null and public.is_approved_creator(creator_id) and status = 'draft')
);

drop policy if exists "approved creators can update own draft blog posts" on public.blog_posts;
create policy "approved creators can update own draft blog posts"
on public.blog_posts for update
to authenticated
using (public.is_admin() or (creator_id is not null and public.is_approved_creator(creator_id)))
with check (
  public.is_admin()
  or (creator_id is not null and public.is_approved_creator(creator_id) and status = 'draft')
);
