-- Rollback-only check of auctions.sql against a database that already has it applied.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();g uuid:=gen_random_uuid();
 x uuid:=gen_random_uuid();y uuid:=gen_random_uuid();z uuid:=gen_random_uuid();rq uuid:=gen_random_uuid();r jsonb;blocked boolean;
 item jsonb:='{"id":"one","category":"ball","fallback":"ball-classic"}';
begin
 insert into auth.users(id) values(a),(b),(c),(g);
 insert into public.golf_players(id,username,state) values
  (a,'qa_'||left(replace(a::text,'-',''),15),'{"xp":3000,"coins":0,"owned":["ball-classic","one","patterned"],"patterns":{"patterned":[4,9]},"equipment":{"ball":"one","club":"patterned","patterns":{"patterned":4}}}'),
  (b,'qa_'||left(replace(b::text,'-',''),15),'{"xp":3000,"coins":1000,"owned":[]}'),
  (c,'qa_'||left(replace(c::text,'-',''),15),'{"xp":3000,"coins":1000,"owned":[]}'),
  (g,'qa_'||left(replace(g::text,'-',''),15),'{"xp":100,"coins":1000,"owned":["one"]}');

 blocked:=false;begin perform public.golf_auction_create(g,x,0,item,10,null,24);exception when sqlstate 'PT403' then blocked:=true;end;assert blocked,'Low-level golfers cannot list';
 blocked:=false;begin perform public.golf_auction_create(a,x,5,item,10,null,24);exception when sqlstate 'PT409' then blocked:=true;end;assert blocked,'Stale revision must be rejected';
 blocked:=false;begin perform public.golf_auction_create(a,x,0,item,10,5,24);exception when others then blocked:=true;end;assert blocked,'Buyout below the starting bid is rejected';
 r:=public.golf_auction_create(a,x,0,item,100,500,24);
 assert not (r->'state'->'owned') ? 'one','Listing escrows the item';
 assert r->'state'->'equipment'->>'ball'='ball-classic','Equipped listed item falls back to the default';
 assert (public.golf_auction_create(a,x,1,item,100,500,24)->>'duplicate')::boolean,'Listing retry is idempotent';
 assert (select count(*) from public.golf_auctions where seller_id=a)=1;

 blocked:=false;begin perform public.golf_auction_action(a,x,'bid',100,gen_random_uuid());exception when others then blocked:=true;end;assert blocked,'Sellers cannot bid';
 blocked:=false;begin perform public.golf_auction_action(b,x,'bid',99,gen_random_uuid());exception when others then blocked:=true;end;assert blocked,'Bid below the starting bid is rejected';
 r:=public.golf_auction_action(b,x,'bid',100,rq);
 assert (r->'state'->>'coins')::int=900,'Bid escrows coins';
 r:=public.golf_auction_action(b,x,'bid',100,rq);assert (r->>'duplicate')::boolean and (r->'state'->>'coins')::int=900,'Bid retry does not charge twice';
 blocked:=false;begin perform public.golf_auction_action(c,x,'bid',104,gen_random_uuid());exception when others then blocked:=true;end;assert blocked,'Outbids need 5% more';
 r:=public.golf_auction_action(c,x,'bid',105,gen_random_uuid());
 assert (select (state->>'coins')::int from public.golf_players where id=b)=1000,'Outbid golfer is refunded';
 assert (select (state->>'coins')::int from public.golf_players where id=c)=895;
 blocked:=false;begin perform public.golf_auction_action(a,x,'cancel',null,gen_random_uuid());exception when sqlstate 'PT403' then blocked:=true;end;assert blocked,'Cannot cancel after a bid';
 blocked:=false;begin perform public.golf_auction_action(b,x,'buy',400,gen_random_uuid());exception when others then blocked:=true;end;assert blocked,'Instant buy must confirm the current price';
 r:=public.golf_auction_action(b,x,'buy',500,gen_random_uuid());
 assert r->'auction'->>'status'='sold','Instant buy settles immediately';
 assert (select state->'owned' ? 'one' from public.golf_players where id=b),'Buyer receives the item';
 assert (select (state->>'coins')::int from public.golf_players where id=b)=500;
 assert (select (state->>'coins')::int from public.golf_players where id=c)=1000,'Previous leader is refunded on instant buy';
 assert (select (state->>'coins')::int from public.golf_players where id=a)=500,'Seller is paid';
 blocked:=false;begin perform public.golf_auction_action(c,x,'bid',600,gen_random_uuid());exception when sqlstate 'PT409' then blocked:=true;end;assert blocked,'Sold auctions stay closed';

 -- Patterned item: only the listed seed leaves, and equipment moves to the remaining seed.
 r:=public.golf_auction_create(a,y,(select revision from public.golf_players where id=a),'{"id":"patterned","seed":4,"category":"club","fallback":"club-classic"}',50,null,6);
 assert r->'state'->'patterns'->'patterned'='[9]'::jsonb and (r->'state'->'owned') ? 'patterned';
 assert r->'state'->'equipment'->'patterns'->>'patterned'='9';
 r:=public.golf_auction_action(c,y,'bid',50,gen_random_uuid());
 update public.golf_auctions set ends_at=now()-interval '1 second' where id=y;
 assert public.golf_auction_sweep()>=1;
 assert (select status from public.golf_auctions where id=y)='sold';
 assert (select state->'patterns'->'patterned' from public.golf_players where id=c)='[4]'::jsonb,'Winner receives the exact pattern';
 assert (select (state->>'coins')::int from public.golf_players where id=a)=550;

 -- Unsold and cancelled listings return the item.
 r:=public.golf_auction_create(c,z,(select revision from public.golf_players where id=c),'{"id":"patterned","seed":4,"category":"club","fallback":"club-classic"}',50,null,72);
 r:=public.golf_auction_action(c,z,'cancel',null,gen_random_uuid());
 assert r->'auction'->>'status'='cancelled' and (r->'state'->'patterns'->'patterned')='[4]'::jsonb,'Cancel returns the item';
 z:=gen_random_uuid();r:=public.golf_auction_create(b,z,(select revision from public.golf_players where id=b),item,10,null,6);
 update public.golf_auctions set ends_at=now()-interval '1 second' where id=z;
 r:=public.golf_auction_action(c,z,'bid',10,gen_random_uuid());
 assert (r->>'closed')::boolean and r->'auction'->>'status'='expired','Late bids settle the auction instead';
 assert (select state->'owned' ? 'one' from public.golf_players where id=b),'Unsold item returns to the seller';

 assert not has_table_privilege('authenticated','public.golf_auctions','select');
 assert not has_table_privilege('anon','public.golf_auction_requests','insert');
 assert not has_function_privilege('authenticated','public.golf_auction_action(uuid,uuid,text,bigint,uuid)','execute');
 assert not has_function_privilege('anon','public.golf_auction_create(uuid,uuid,integer,jsonb,bigint,bigint,integer)','execute');
 assert (select bool_and(relrowsecurity) from pg_class where oid in('public.golf_auctions'::regclass,'public.golf_auction_requests'::regclass));
end $$;
select 'PASS: escrow, bids, refunds, instant buy, patterns, expiry, cancellation, idempotency, RLS and grants' as auction_verification;
rollback;
