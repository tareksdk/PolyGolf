begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); t uuid:=gen_random_uuid(); r jsonb; blocked boolean; ra integer; rb integer;
begin
 insert into auth.users(id) values(a),(b);
 insert into public.golf_players(id,username,state) values
 (a,'qa_'||left(replace(a::text,'-',''),15),'{"coins":5000,"owned":[]}'),
 (b,'qa_'||left(replace(b::text,'-',''),15),'{"coins":1000,"owned":["test-item"]}');
 select revision into ra from public.golf_players where id=a; select revision into rb from public.golf_players where id=b;
 insert into public.golf_friends(user_low,user_high,requested_by,status) values(least(a,b),greatest(a,b),a,'accepted');
 insert into public.golf_trades(id,sender_id,receiver_id,offered,requested,offered_coins,requested_coins)
 values(t,a,b,'[]','[{"id":"test-item"}]',3000,200);
 blocked:=false;begin perform public.golf_trade_accept(b,t,ra,rb,'{"coins":5000}','{"coins":3800}');exception when sqlstate 'PT409' then blocked:=true;end;
 assert blocked,'Forged sender balance must be rejected';
 assert (select state->>'coins' from public.golf_players where id=a)='5000';
 assert (select status from public.golf_trades where id=t)='pending';
 r:=public.golf_trade_accept(b,t,ra,rb,'{"coins":2200,"owned":["test-item"]}','{"coins":3800,"owned":[]}');
 assert not (r->>'duplicate')::boolean;
 assert (select sum((state->>'coins')::numeric) from public.golf_players where id in(a,b))=6000,'Coins must be conserved';
 r:=public.golf_trade_accept(b,t,ra,rb,'{}','{}');assert (r->>'duplicate')::boolean;
 assert (select state->>'coins' from public.golf_players where id=b)='3800','Retry cannot pay twice';
 t:=gen_random_uuid();insert into public.golf_trades(id,sender_id,receiver_id,offered,requested,offered_coins,requested_coins) values(t,a,b,'[]','[]',2500,100);
 blocked:=false;begin perform public.golf_trade_accept(b,t,ra+1,rb+1,'{"coins":-200}','{"coins":6200}');exception when sqlstate 'PT409' then blocked:=true;end;
 assert blocked,'Overspending must be rejected inside the transaction';
 blocked:=false;begin perform public.golf_trade_accept(b,t,ra,rb+1,'{}','{}');exception when sqlstate 'PT409' then blocked:=true;end;
 assert blocked,'Concurrent balance changes must invalidate stale revisions';
 blocked:=false;begin insert into public.golf_trades(sender_id,receiver_id,offered,requested,offered_coins,requested_coins) values(a,b,'[]','[]',0,100);exception when check_violation then blocked:=true;end;
 assert blocked,'An empty offer side must be rejected';
 blocked:=false;begin insert into public.golf_trades(sender_id,receiver_id,offered,requested,offered_coins,requested_coins) values(a,b,'[]','[]',100,-1);exception when check_violation then blocked:=true;end;
 assert blocked,'Negative coins must be rejected';
 assert not has_table_privilege('authenticated','public.golf_trades','update');
 assert not has_function_privilege('anon','public.golf_trade_accept(uuid,uuid,integer,integer,jsonb,jsonb)','execute');
end $$;
select 'PASS: atomic coin transfer, conservation, repeat acceptance, insufficient balance, stale revision, constraints and service-only access' as verification;
rollback;
