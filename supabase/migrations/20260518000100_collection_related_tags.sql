-- Connect collection discovery to asset tags without weakening public content RLS.

alter table public.collections
add column if not exists related_tags text[] not null default '{}';

create index if not exists collections_related_tags_idx
on public.collections using gin (related_tags);

create index if not exists assets_tags_idx
on public.assets using gin (tags);
