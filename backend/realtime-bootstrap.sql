-- Repair for this project's empty Realtime partition set. Uses Supabase's daily
-- partition names/bounds; normal ongoing maintenance remains owned by Realtime.
begin;
do $$
declare d date; n text;
begin
 for d in select (now() at time zone 'UTC')::date+i from generate_series(-1,3) i loop
  n:='messages_'||to_char(d,'YYYY_MM_DD');
  if to_regclass('realtime.'||n) is null then
   execute format('create table realtime.%I partition of realtime.messages for values from (%L) to (%L)',n,d,d+1);
   execute format('alter table realtime.%I enable row level security',n);
   execute format('alter table realtime.%I owner to supabase_realtime_admin',n);
  end if;
 end loop;
end $$;
commit;
