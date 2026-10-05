-- Run after competitive-schema.sql in the SAME transaction, replacing its COMMIT.
-- All fixtures and schema changes roll back. No player account is retained.
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();s jsonb;t jsonb;m uuid;ar uuid;br uuid;before_elo integer;blocked boolean:=false;
begin
 insert into auth.users(id) values(a),(b),(c);
 insert into public.golf_players(id,username,state) values(a,'qa_'||left(replace(a::text,'-',''),15),'{"xp":20000}'),(b,'qa_'||left(replace(b::text,'-',''),15),'{"xp":20000}'),(c,'qa_'||left(replace(c::text,'-',''),15),'{"xp":18374}');
 begin perform public.golf_ranked_join(c,'{}','links-v4');exception when others then blocked:=sqlerrm like '%level 15%';end;
 assert blocked,'Level 15 must be enforced by the database';
 s:=public.golf_ranked_join(a,'{}','links-v4');assert (s->>'queued')::boolean,'First golfer should queue';
 t:=public.golf_ranked_join(b,'{}','links-v4');m:=(t->'match'->>'id')::uuid;assert m is not null,'Second golfer should match';
 s:=public.golf_ranked_join(a,'{}','links-v4');assert (s->'match'->>'id')::uuid=m,'Repeated queue request must return the same match';
 assert not exists(select 1 from public.golf_match_queue where user_id in(a,b)),'Matched golfers must leave queue';
 select a_round,b_round into ar,br from public.golf_ranked_matches where id=m;
 update public.golf_rounds set finished=true,next_hole=3,holes='[{"strokes":4},{"strokes":3},{"strokes":4}]' where id=ar;
 update public.golf_rounds set finished=true,next_hole=3,holes='[{"strokes":4},{"strokes":3},{"strokes":5}]' where id=br;
 s:=public.golf_ranked_status(a);assert s->'match'->>'phase'='finished';assert (s->'rating'->>'elo')::integer=1016,'Winner gains 16 at equal rating';
 s:=public.golf_ranked_status(b);assert (s->'rating'->>'elo')::integer=984,'Loser loses 16';
 perform public.golf_ranked_finish(m,a,'retry');s:=public.golf_ranked_status(a);assert (s->'rating'->>'elo')::integer=1016,'Settlement must be idempotent';
 perform public.golf_ranked_join(a,'{}','links-v4');t:=public.golf_ranked_join(b,'{}','links-v4');m:=(t->'match'->>'id')::uuid;
 select a_round,b_round into ar,br from public.golf_ranked_matches where id=m;
 update public.golf_rounds set finished=true,next_hole=3,holes='[{"strokes":4},{"strokes":3},{"strokes":5}]' where id in(ar,br);
 s:=public.golf_ranked_status(a);assert s->'match'->>'phase'='sudden','Tied rounds must enter sudden death';
 s:=public.golf_ranked_shot(a,m,1,2.5);assert s->'match'->>'phase'='sudden','Wait for both shots';
 s:=public.golf_ranked_shot(a,m,1,.1);assert (s->'match'->>'a_distance')::numeric=2.5,'Retry must not replace the first accepted shot';
 s:=public.golf_ranked_shot(b,m,1,2.5);assert (s->'match'->>'sudden_round')::integer=2,'Exact closest-shot ties repeat';
 perform public.golf_ranked_shot(a,m,2,1.5);s:=public.golf_ranked_shot(b,m,2,.5);assert (s->'match'->>'winner')::uuid=b,'Closest shot wins';assert s->'match'->>'phase'='finished';
 perform public.golf_ranked_join(a,'{}','links-v4');t:=public.golf_ranked_join(b,'{}','links-v4');m:=(t->'match'->>'id')::uuid;
 s:=public.golf_ranked_leave(a,true);assert (s->'match'->>'winner')::uuid=b,'Explicit forfeit gives opponent the win';
 perform public.golf_ranked_join(a,'{}','links-v4');t:=public.golf_ranked_join(b,'{}','links-v4');m:=(t->'match'->>'id')::uuid;
 update public.golf_ranked_matches set b_seen=now()-interval '151 seconds' where id=m;
 s:=public.golf_ranked_status(a);assert (s->'match'->>'winner')::uuid=a,'Disconnected opponent loses after grace period';
 assert not has_function_privilege('authenticated','public.golf_ranked_shot(uuid,uuid,integer,numeric)','execute');
 assert not has_table_privilege('authenticated','public.golf_ratings','update');
 assert not has_table_privilege('anon','public.golf_match_queue','select');
 assert (select bool_and(relrowsecurity) from pg_class where oid in('public.golf_ratings'::regclass,'public.golf_match_queue'::regclass,'public.golf_ranked_matches'::regclass));
end $$;
select 'PASS: level gate, queue, matching, score settlement, Elo, retries, sudden death, forfeit, disconnect and access controls' as ranked_verification;
rollback;
