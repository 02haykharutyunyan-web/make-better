-- Narrow production repair for creator asset submission RLS.
-- Keeps public reads limited to published assets and keeps creators scoped to
-- their own creator row via creators.profile_id = auth.uid().

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
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'phone',
    requested_role
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    email = coalesce(public.profiles.email, excluded.email),
    phone = coalesce(public.profiles.phone, excluded.phone),
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      else excluded.role
    end;

  if requested_role = 'creator' then
    creator_brand := coalesce(nullif(new.raw_user_meta_data ->> 'brand_name', ''), split_part(new.email, '@', 1));
    creator_slug := lower(regexp_replace(creator_brand, '[^a-zA-Z0-9]+', '-', 'g'));
    creator_slug := trim(both '-' from creator_slug);
    if creator_slug = '' then
      creator_slug := 'creator';
    end if;
    if exists (select 1 from public.creators where slug = creator_slug and profile_id is distinct from new.id) then
      creator_slug := creator_slug || '-' || left(new.id::text, 8);
    end if;
    creator_bio := new.raw_user_meta_data ->> 'bio';

    insert into public.creators (
      profile_id,
      slug,
      brand_name,
      niche,
      description,
      monthly_revenue
    )
    values (
      new.id,
      creator_slug,
      creator_brand,
      left(coalesce(creator_bio, ''), 60),
      creator_bio,
      '-'
    )
    on conflict (profile_id) do update set
      brand_name = coalesce(public.creators.brand_name, excluded.brand_name),
      niche = coalesce(public.creators.niche, excluded.niche),
      description = coalesce(public.creators.description, excluded.description);
  end if;

  return new;
end;
$$;

drop policy if exists "creators can submit own assets" on public.assets;
create policy "creators can submit own assets"
on public.assets for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.creators
    where creators.id = assets.creator_id
      and creators.profile_id = auth.uid()
  )
);

drop policy if exists "creators can update own draft assets" on public.assets;
create policy "creators can update own draft assets"
on public.assets for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.creators
    where creators.id = assets.creator_id
      and creators.profile_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or (
    exists (
      select 1
      from public.creators
      where creators.id = assets.creator_id
        and creators.profile_id = auth.uid()
    )
    and status in ('draft', 'pending_review', 'rejected')
  )
);

drop policy if exists "public can read published assets" on public.assets;
create policy "public can read published assets"
on public.assets for select
to anon, authenticated
using (
  status = 'published'
  or public.is_admin()
  or exists (
    select 1
    from public.creators
    where creators.id = assets.creator_id
      and creators.profile_id = auth.uid()
  )
);

-- Optional targeted data repair:
-- If a creator signed up but no creators row was created, run the commented
-- statement below after replacing the email value.
--
-- insert into public.creators (profile_id, slug, brand_name, niche, description, monthly_revenue)
-- select
--   profiles.id,
--   lower(regexp_replace(split_part(profiles.email, '@', 1), '[^a-zA-Z0-9]+', '-', 'g')),
--   coalesce(profiles.full_name, split_part(profiles.email, '@', 1)),
--   'Creator',
--   'Creator profile',
--   '-'
-- from public.profiles
-- where profiles.email = 'creator@example.com'
--   and profiles.role = 'creator'
--   and not exists (select 1 from public.creators where creators.profile_id = profiles.id);
