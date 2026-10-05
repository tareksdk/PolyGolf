-- Transaction-only checks. All fixture accounts, seats and settings roll back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); seat integer; blocked boolean;
begin
 assert not has_table_privilege('anon','public.golf_founders','select');
 assert not has_table_privilege('authenticated','public.golf_founders','insert');
 assert not has_table_privilege('anon','public.golf_site_settings','update');
 assert not has_function_privilege('authenticated','public.golf_award_founder()','execute');
 assert (select relrowsecurity from pg_class where oid='public.golf_founders'::regclass);
 assert not exists(select 1 from public.golf_founders f join public.golf_players p on p.id=f.user_id where not(p.state->'owned' ? 'nameplate-og'));
 select coalesce(max(slot),0)+1 into seat from public.golf_founders;
 if seat<=100 then
  insert into auth.users(id,email) values(a,'launch-'||a::text||'@test.invalid');
  insert into public.golf_players(id,username,state) values(a,'test_'||left(replace(a::text,'-',''),12),'{"owned":[]}');
  assert (select state->'owned' ? 'nameplate-og' from public.golf_players where id=a),'New cohort account gets OG';
  assert (select slot from public.golf_founders where user_id=a)=seat;
  delete from auth.users where id=a;
  assert exists(select 1 from public.golf_founders where slot=seat and user_id is null),'Deletion must not free a seat';
 end if;
 -- Fill any remaining seats with anonymous reserved entries inside this rollback.
 insert into public.golf_founders(slot) select i from generate_series(1,100)i on conflict(slot)do nothing;
 insert into auth.users(id,email) values(b,'launch-'||b::text||'@test.invalid');
 insert into public.golf_players(id,username,state) values(b,'test_'||left(replace(b::text,'-',''),12),'{"owned":[]}');
 assert not (select state->'owned' ? 'nameplate-og' from public.golf_players where id=b),'Account beyond the first 100 cannot get OG';
 assert (select count(*) from public.golf_founders)=100;
 blocked:=false;begin update public.golf_site_settings set home_message_color='url(bad)' where id='activity';exception when check_violation then blocked:=true;end;assert blocked;
 blocked:=false;begin update public.golf_site_settings set home_message_size=99 where id='activity';exception when check_violation then blocked:=true;end;assert blocked;
 update public.golf_site_settings set home_message='',home_message_size=20,home_message_color='#f1d982' where id='activity';
end $$;
select 'PASS: OG eligibility, 100-seat cap, no reused seats, RLS, setting validation; all fixtures rolled back' as launch_verification;
rollback;
