-- fixture: safe statements with semicolon and scary words inside strings
select 'create; set; execute; -- not a comment' as safe_text;
with x as (select '/* not a comment */ ; escaped '' quote' as value) select value from x;
