-- fixture: safe statements
select 'schemas' as section;
with x as (select 1 as value) select value from x;
