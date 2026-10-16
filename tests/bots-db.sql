-- All fixtures and ratings roll back. Hold the matchmaking lock to exclude real joins.
begin;
select pg_advisory_xact_lock(310415);
do $$ begin
 if exists(select 1 from public.golf_match_queue where expires_at>now()) then raise exception 'Bot test deferred: real players are queued';end if;
end $$;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();s jsonb;t jsonb;m uuid;r uuid;score jsonb;elo integer;offset_score integer;
begin
 insert into auth.users(id) values(a),(b);
 insert into public.golf_players(id,username,state) values(a,'qa_'||left(replace(a::text,'-',''),15),'{"xp":20000}'),(b,'qa_'||left(replace(b::text,'-',''),15),'{"xp":20000}');
 s:=public.golf_ranked_join(a,'{}','polygolf-v10');assert (s->>'queued')::boolean;
 update public.golf_match_queue set created_at=now()-interval '59 seconds' where user_id=a;
 s:=public.golf_ranked_join(a,'{}','polygolf-v10');assert s->'match'='null'::jsonb,'No bot before one minute';
 update public.golf_match_queue set created_at=now()-interval '61 seconds' where user_id=a;
 update public.golf_ratings set elo=1300 where user_id=a;
 s:=public.golf_ranked_join(a,'{}','polygolf-v10');assert s->'match'='null'::jsonb,'Gold must never receive bots';
 update public.golf_ratings set elo=1299 where user_id=a;
 perform setseed(-0.1); -- Exercise the expanded Willow loop with a repeatable course draw.
 s:=public.golf_ranked_join(a,'{}','polygolf-v10');m:=(s->'match'->>'id')::uuid;r:=(s->'match'->>'a_round')::uuid;
 assert jsonb_array_length(s->'match'->'bot'->'plan')=case when (s->'match'->>'course')::integer=0 then 9 else 3 end,'Bot plan must cover the selected course';
 assert (s->'match'->>'course')::integer=0,'Seeded fallback should exercise Willow';
 assert jsonb_array_length(s->'match'->'bot'->'plan')=9,'Willow bot needs nine holes';
 assert s->'match'->'bot' is not null,'Silver fallback should start';assert s->'match'->>'b_name'='Birdie Bot';
 select sum((value->>'strokes')::integer-(value->>'par')::integer) into offset_score from jsonb_array_elements(s->'match'->'bot'->'plan');assert offset_score between -3 and 1;
 t:=public.golf_ranked_join(a,'{}','polygolf-v10');assert t->'match'->>'id'=m::text,'Fallback retry must return same match';
 assert (select count(*)=1 from public.golf_rounds where competitive_id=m),'No fake bot accounts or rounds';
 update public.golf_rounds set finished=true,next_hole=hole_count,holes=(select jsonb_agg(jsonb_build_object('strokes',1)) from generate_series(1,hole_count)) where id=r;
  update public.golf_ranked_matches set created_at=now()-interval '10 minutes' where id=m;
 s:=public.golf_ranked_status(a);assert s->'match'->>'phase'='finished';assert (s->'rating'->>'elo')::integer=1315,'Bot win must award Elo once';
 s:=public.golf_ranked_status(a);assert (s->'rating'->>'elo')::integer=1315;
 update public.golf_ratings set elo=1000 where user_id=a;
 perform public.golf_ranked_join(a,'{}','polygolf-v10');update public.golf_match_queue set created_at=now()-interval '61 seconds' where user_id=a;
 s:=public.golf_ranked_join(a,'{}','polygolf-v10');m:=(s->'match'->>'id')::uuid;r:=(s->'match'->>'a_round')::uuid;score:=s->'match'->'bot'->'plan';
 update public.golf_rounds set finished=true,next_hole=hole_count,holes=score where id=r;
 update public.golf_ranked_matches set created_at=now()-interval '5 minutes' where id=m;
  s:=public.golf_ranked_status(a);assert s->'match'->>'phase'='sudden','Tied scores must start sudden death';
 update public.golf_ranked_matches set sudden_started=now()-interval '9 seconds',bot=jsonb_set(bot,'{distance}','5') where id=m;
 s:=public.golf_ranked_shot(a,m,1,5);assert (s->'match'->>'sudden_round')::integer=2,'Exact ties replay sudden death';
 update public.golf_ranked_matches set sudden_started=now()-interval '9 seconds',bot=jsonb_set(bot,'{distance}','5') where id=m;
 s:=public.golf_ranked_shot(a,m,2,9);assert s->'match'->>'phase'='finished';assert (s->'rating'->>'elo')::integer=984,'Loss must subtract Elo';
 perform public.golf_ranked_join(a,'{}','polygolf-v10');update public.golf_match_queue set created_at=now()-interval '61 seconds' where user_id=a;
 s:=public.golf_ranked_join(a,'{}','polygolf-v10');s:=public.golf_ranked_leave(a,true);assert s->'match'->>'reason'='forfeit';
 perform public.golf_ranked_join(a,'{}','polygolf-v10');update public.golf_match_queue set created_at=now()-interval '61 seconds' where user_id=a;
 s:=public.golf_ranked_join(b,'{}','polygolf-v10');assert s->'match'->'bot'='null'::jsonb,'Waiting humans always match before fallback';
 perform public.golf_ranked_leave(a,true);
 perform public.golf_ranked_join(a,'{}','polygolf-v10');update public.golf_match_queue set created_at=now()-interval '61 seconds' where user_id=a;
 perform public.golf_ranked_leave(a,false);s:=public.golf_ranked_join(a,'{}','polygolf-v10');assert (s->>'queued')::boolean,'Cancel and rejoin resets the wait';
 assert has_function_privilege('service_role','public.golf_ranked_bot_status(uuid,uuid)','execute');
 assert not has_function_privilege('authenticated','public.golf_ranked_bot_status(uuid,uuid)','execute');
 assert not has_function_privilege('anon','public.golf_ranked_bot_status(uuid,uuid)','execute');
end $$;
select 'PASS: one-minute gate, Silver/Gold boundary, human priority, saved bot scores, retries, Elo, sudden death, forfeit, queue reset and service-only access' as bot_verification;
rollback;
