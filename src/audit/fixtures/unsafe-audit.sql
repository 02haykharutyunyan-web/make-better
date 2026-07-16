select 1;
alter table public.assets add column bad text;
grant select on table public.assets to anon;
insert into public.assets default values;
commit;
with unsafe as (update public.assets set title = title returning id) select id from unsafe;
