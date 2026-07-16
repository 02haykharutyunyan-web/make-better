-- Make Better Phase 1 production backend foundation.
-- This migration creates the core marketplace schema, role enums, timestamps,
-- indexes, and starter RLS policies. Stripe is intentionally not connected yet.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('buyer', 'creator', 'admin');
create type public.asset_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'published');
create type public.price_type as enum ('free', 'paid');
create type public.claim_status as enum ('unlocked', 'pending_payment', 'paid_mock');
create type public.publish_status as enum ('draft', 'published');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  phone text,
  role public.user_role not null default 'buyer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  brand_name text not null,
  niche text,
  description text,
  tags text[] not null default '{}',
  followers integer not null default 0 check (followers >= 0),
  assets_count integer not null default 0 check (assets_count >= 0),
  downloads integer not null default 0 check (downloads >= 0),
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  monthly_revenue text,
  strengths text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  slug text not null unique,
  title text not null,
  product_type text not null,
  category text,
  short_description text,
  long_description text,
  tags text[] not null default '{}',
  status public.asset_status not null default 'pending_review',
  is_free boolean not null default true,
  price numeric(10, 2) not null default 0 check (price >= 0),
  price_type public.price_type not null default 'free',
  stripe_price_id text,
  stripe_product_id text,
  preview_image_path text,
  asset_file_path text,
  downloads integer not null default 0 check (downloads >= 0),
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  rejection_reason text,
  featured boolean not null default false,
  use_cases text[] not null default '{}',
  included text[] not null default '{}',
  before text[] not null default '{}',
  after text[] not null default '{}',
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_price_consistency check (
    (price_type = 'free' and is_free = true and price = 0)
    or
    (price_type = 'paid' and is_free = false and price > 0)
  )
);

create table public.asset_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  status public.claim_status not null default 'unlocked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  category text,
  body text,
  creator_id uuid references public.creators(id) on delete set null,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  long_description text,
  best_for text[] not null default '{}',
  related_types text[] not null default '{}',
  selected_asset_ids uuid[] not null default '{}',
  related_blog_post_ids uuid[] not null default '{}',
  status public.publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index creators_profile_id_idx on public.creators(profile_id);
create index creators_slug_idx on public.creators(slug);
create index assets_creator_id_idx on public.assets(creator_id);
create index assets_slug_idx on public.assets(slug);
create index assets_status_idx on public.assets(status);
create index assets_product_type_idx on public.assets(product_type);
create index assets_featured_idx on public.assets(featured);
create index asset_claims_user_id_idx on public.asset_claims(user_id);
create index asset_claims_asset_id_idx on public.asset_claims(asset_id);
create index reviews_asset_id_idx on public.reviews(asset_id);
create index blog_posts_slug_idx on public.blog_posts(slug);
create index blog_posts_status_idx on public.blog_posts(status);
create index collections_slug_idx on public.collections(slug);
create index collections_status_idx on public.collections(status);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger creators_set_updated_at before update on public.creators
for each row execute function public.set_updated_at();

create trigger assets_set_updated_at before update on public.assets
for each row execute function public.set_updated_at();

create trigger asset_claims_set_updated_at before update on public.asset_claims
for each row execute function public.set_updated_at();

create trigger reviews_set_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

create trigger blog_posts_set_updated_at before update on public.blog_posts
for each row execute function public.set_updated_at();

create trigger collections_set_updated_at before update on public.collections
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

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
  on conflict (id) do nothing;

  if requested_role = 'creator' then
    creator_brand := coalesce(nullif(new.raw_user_meta_data ->> 'brand_name', ''), split_part(new.email, '@', 1));
    creator_slug := lower(regexp_replace(creator_brand, '[^a-zA-Z0-9]+', '-', 'g'));
    creator_slug := trim(both '-' from creator_slug);
    if creator_slug = '' then
      creator_slug := 'creator';
    end if;
    if exists (select 1 from public.creators where slug = creator_slug) then
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
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.creators enable row level security;
alter table public.assets enable row level security;
alter table public.asset_claims enable row level security;
alter table public.reviews enable row level security;
alter table public.blog_posts enable row level security;
alter table public.collections enable row level security;

-- RLS policy plan:
-- 1. Public visitors can read only published public content.
-- 2. Buyers can manage their own profile, claims, and reviews.
-- 3. Creators can manage their own creator profile and submit/update their own non-published assets.
-- 4. Admins can manage all marketplace records.
-- 5. Stripe/payment writes are reserved for a future server-side webhook role; no Stripe policies are included in Phase 1.

create policy "profiles can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles can update own basic profile"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  )
);

create policy "profiles can insert own buyer profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role in ('buyer', 'creator'));

create policy "public can read active creators"
on public.creators for select
to anon, authenticated
using (active = true or public.is_admin() or profile_id = auth.uid());

create policy "creators can create own creator profile"
on public.creators for insert
to authenticated
with check (profile_id = auth.uid() or public.is_admin());

create policy "creators can update own creator profile"
on public.creators for update
to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());

create policy "public can read published assets"
on public.assets for select
to anon, authenticated
using (
  status = 'published'
  or public.is_admin()
  or creator_id in (select id from public.creators where profile_id = auth.uid())
);

create policy "creators can submit own assets"
on public.assets for insert
to authenticated
with check (
  public.is_admin()
  or creator_id in (select id from public.creators where profile_id = auth.uid())
);

create policy "creators can update own draft assets"
on public.assets for update
to authenticated
using (
  public.is_admin()
  or creator_id in (select id from public.creators where profile_id = auth.uid())
)
with check (
  public.is_admin()
  or (
    creator_id in (select id from public.creators where profile_id = auth.uid())
    and status in ('draft', 'pending_review', 'rejected')
  )
);

create policy "users can read own claims"
on public.asset_claims for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "users can claim free published assets"
on public.asset_claims for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.assets
    where assets.id = asset_claims.asset_id
      and assets.status = 'published'
      and assets.is_free = true
  )
);

create policy "users can read published asset reviews"
on public.reviews for select
to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.assets
    where assets.id = reviews.asset_id
      and assets.status = 'published'
  )
);

create policy "buyers can review claimed assets"
on public.reviews for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.asset_claims
    where asset_claims.asset_id = reviews.asset_id
      and asset_claims.user_id = auth.uid()
      and asset_claims.status in ('unlocked', 'paid_mock')
  )
);

create policy "users can update own reviews"
on public.reviews for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "public can read published blog posts"
on public.blog_posts for select
to anon, authenticated
using (status = 'published' or public.is_admin());

create policy "admins manage blog posts"
on public.blog_posts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "public can read published collections"
on public.collections for select
to anon, authenticated
using (status = 'published' or public.is_admin());

create policy "admins manage collections"
on public.collections for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage creators"
on public.creators for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage assets"
on public.assets for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage claims"
on public.asset_claims for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage reviews"
on public.reviews for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
