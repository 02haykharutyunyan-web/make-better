-- Admin creator management: allow admins to feature creators.

alter table public.creators
add column if not exists featured boolean not null default false;

create index if not exists creators_featured_idx on public.creators(featured);
