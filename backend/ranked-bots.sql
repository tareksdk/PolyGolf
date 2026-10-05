begin;
alter table public.golf_ranked_matches add column if not exists bot jsonb;
alter table public.golf_ranked_matches alter column b_id drop not null;
alter table public.golf_ranked_matches add constraint golf_ranked_opponent_kind check((bot is null and b_id is not null) or (bot is not null and b_id is null and b_round is null));
create or replace function public.golf_ranked_finish(p_match uuid,p_winner uuid,p_reason text) returns void
language plpgsql security invoker set search_path='' as $$
declare m public.golf_ranked_matches;we integer;le integer;delta integer;loser uuid;
begin
 select * into m from public.golf_ranked_matches where id=p_match for update;
 if not found or m.phase='finished' then return;end if;
 if m.bot is not null then
  if p_winner is not null and p_winner<>m.a_id then raise exception 'Invalid winner';end if;
  select elo into we from public.golf_ratings where user_id=m.a_id for update;
  le:=(m.bot->>'elo')::integer;
  if p_reason='abandoned' then delta:=0;
  elsif p_winner=m.a_id then delta:=greatest(1,round(32*(1-1/(1+power(10::numeric,(le-we)::numeric/400))))::integer);
  else delta:=-least(we,greatest(1,round(32*(1/(1+power(10::numeric,(le-we)::numeric/400))))::integer));end if;
  if p_reason<>'abandoned' then update public.golf_ratings set elo=elo+delta,wins=wins+case when p_winner=m.a_id then 1 else 0 end,losses=losses+case when p_winner is null then 1 else 0 end,matches=matches+1 where user_id=m.a_id;end if;
  update public.golf_ranked_matches set phase='finished',winner=p_winner,reason=p_reason,a_delta=delta,b_delta=0,finished_at=now() where id=m.id;return;
 end if;
 if p_winner is not null and p_winner not in(m.a_id,m.b_id) then raise exception 'Invalid winner';end if;
 if p_winner is not null then
  loser:=case when p_winner=m.a_id then m.b_id else m.a_id end;
  perform user_id from public.golf_ratings where user_id in(m.a_id,m.b_id) order by user_id for update;
  select elo into we from public.golf_ratings where user_id=p_winner;select elo into le from public.golf_ratings where user_id=loser;
  delta:=greatest(1,round(32*(1-1/(1+power(10::numeric,(le-we)::numeric/400))))::integer);
  update public.golf_ratings set elo=elo+delta,wins=wins+1,matches=matches+1 where user_id=p_winner;
  update public.golf_ratings set elo=greatest(0,elo-delta),losses=losses+1,matches=matches+1 where user_id=loser;
  update public.golf_ranked_matches set a_delta=case when a_id=p_winner then delta else -least(le,delta) end,b_delta=case when b_id=p_winner then delta else -least(le,delta) end where id=p_match;
 end if;
 update public.golf_ranked_matches set phase='finished',winner=p_winner,reason=p_reason,finished_at=now() where id=p_match;
end $$;
create or replace function public.golf_ranked_bot_status(p_user uuid,p_match uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.golf_ranked_matches;r public.golf_rounds;rating jsonb;scores jsonb:='[]';elapsed numeric;duration integer:=0;h jsonb;sa integer;sb integer;n integer:=0;
begin
 select * into m from public.golf_ranked_matches where id=p_match and a_id=p_user and bot is not null for update;
 if not found then raise exception 'Bot match not found';end if;
 select * into r from public.golf_rounds where id=m.a_round;
 elapsed:=extract(epoch from (now()-m.created_at));
 for h in select value from jsonb_array_elements(m.bot->'plan') loop
  duration:=duration+(h->>'strokes')::integer*7+4;
  if elapsed>=duration then scores:=scores||jsonb_build_array(h);n:=n+1;end if;
 end loop;
 if m.phase='playing' then
  if r.finished and n=3 then
   select coalesce(sum((value->>'strokes')::integer),0) into sa from jsonb_array_elements(r.holes);
   select sum((value->>'strokes')::integer) into sb from jsonb_array_elements(scores);
   if sa<>sb then perform public.golf_ranked_finish(m.id,case when sa<sb then p_user else null end,'score');
   else update public.golf_ranked_matches set phase='sudden',sudden_round=1,sudden_started=now(),deadline=now()+interval '150 seconds',bot=jsonb_set(bot,'{distance}',to_jsonb(round((1+random()*14)::numeric,3))) where id=m.id;end if;
  elsif m.deadline<now() then perform public.golf_ranked_finish(m.id,null,'time');
  end if;
 elsif m.phase='sudden' then
  if now()>=m.sudden_started+interval '8 seconds' then
   update public.golf_ranked_matches set b_distance=coalesce(b_distance,(bot->>'distance')::numeric) where id=m.id returning * into m;
  end if;
  if m.a_distance is not null and m.b_distance is not null then
   if m.a_distance=m.b_distance then update public.golf_ranked_matches set sudden_round=sudden_round+1,sudden_started=now(),deadline=now()+interval '150 seconds',a_distance=null,b_distance=null,bot=jsonb_set(bot,'{distance}',to_jsonb(round((1+random()*14)::numeric,3))) where id=m.id;
   else perform public.golf_ranked_finish(m.id,case when m.a_distance<m.b_distance then p_user else null end,'closest');end if;
  elsif m.deadline<now() then perform public.golf_ranked_finish(m.id,null,'time');end if;
 end if;
 update public.golf_ranked_matches set a_seen=now() where id=m.id and phase<>'finished';
 select * into m from public.golf_ranked_matches where id=m.id;
 select to_jsonb(x) into rating from public.golf_ratings x where user_id=p_user;
 return jsonb_build_object('server_now',extract(epoch from now())*1000,'rating',rating,'queued',false,'match',to_jsonb(m)||jsonb_build_object('b_id',m.bot->>'id','a_name',(select username from public.golf_players where id=p_user),'b_name',m.bot->>'name','a_holes',r.next_hole,'b_holes',n,'a_scores',r.holes,'b_scores',scores,'round',to_jsonb(r)));
end $$;
create or replace function public.golf_ranked_status(p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.golf_ranked_matches;ra public.golf_rounds;rb public.golf_rounds;sa integer;sb integer;va boolean;vb boolean;rating jsonb;match_data jsonb;
begin
 select * into m from public.golf_ranked_matches where a_id=p_user or b_id=p_user order by created_at desc limit 1 for update;
 if found and m.bot is not null then return public.golf_ranked_bot_status(p_user,m.id);end if;
 if found and m.phase<>'finished' then
  select * into ra from public.golf_rounds where id=m.a_round;select * into rb from public.golf_rounds where id=m.b_round;
  if m.phase='playing' and ra.finished and rb.finished then
   select coalesce(sum((value->>'strokes')::integer),0) into sa from jsonb_array_elements(ra.holes);select coalesce(sum((value->>'strokes')::integer),0) into sb from jsonb_array_elements(rb.holes);
   if sa<>sb then perform public.golf_ranked_finish(m.id,case when sa<sb then m.a_id else m.b_id end,'score');
   else update public.golf_ranked_matches set phase='sudden',sudden_round=1,sudden_started=now(),deadline=now()+interval '150 seconds',a_seen=now(),b_seen=now() where id=m.id;end if;
  elsif m.phase='sudden' and m.a_distance is not null and m.b_distance is not null then
   if m.a_distance=m.b_distance then update public.golf_ranked_matches set sudden_round=sudden_round+1,sudden_started=now(),deadline=now()+interval '150 seconds',a_distance=null,b_distance=null where id=m.id;
   else perform public.golf_ranked_finish(m.id,case when m.a_distance<m.b_distance then m.a_id else m.b_id end,'closest');end if;
  elsif m.a_seen<now()-interval '150 seconds' and m.b_seen<now()-interval '150 seconds' then perform public.golf_ranked_finish(m.id,null,'abandoned');
  elsif (case when p_user=m.a_id then m.b_seen else m.a_seen end)<now()-interval '150 seconds' then perform public.golf_ranked_finish(m.id,p_user,'disconnect');
  elsif m.deadline<now() then
   if m.phase='sudden' then va:=m.a_distance is not null;vb:=m.b_distance is not null;
   else va:=ra.finished;vb:=rb.finished;end if;
   perform public.golf_ranked_finish(m.id,case when va and not vb then m.a_id when vb and not va then m.b_id else null end,'time');
  end if;
  update public.golf_ranked_matches set a_seen=case when a_id=p_user then now() else a_seen end,b_seen=case when b_id=p_user then now() else b_seen end where id=m.id and phase<>'finished';
 end if;
 select coalesce(to_jsonb(r),'{}'::jsonb) into rating from public.golf_ratings r where user_id=p_user;
 if m.id is not null then
  select to_jsonb(mm)||jsonb_build_object('a_name',a.username,'b_name',b.username,'a_holes',ar.next_hole,'b_holes',br.next_hole,'a_scores',ar.holes,'b_scores',br.holes,'round',case when mm.a_id=p_user then to_jsonb(ar) else to_jsonb(br) end) into match_data
  from public.golf_ranked_matches mm join public.golf_players a on a.id=mm.a_id join public.golf_players b on b.id=mm.b_id join public.golf_rounds ar on ar.id=mm.a_round join public.golf_rounds br on br.id=mm.b_round where mm.id=m.id;
 end if;
 return jsonb_build_object('rating',coalesce(rating,jsonb_build_object('elo',1000,'wins',0,'losses',0,'matches',0)),'queued',exists(select 1 from public.golf_match_queue where user_id=p_user and expires_at>now()),'match',match_data);
end $$;
create or replace function public.golf_ranked_join(p_user uuid,p_equipment jsonb,p_version text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare opponent public.golf_match_queue;m uuid;ar uuid;br uuid;c integer;v_status jsonb;bot_data jsonb;human_elo integer;roll double precision;offset_score integer;strokes integer[]:=array[4,3,5];slot integer;
begin
 if p_version is distinct from 'polygolf-v7' then raise exception 'Reload PolyGolf before matchmaking';end if;
 if not exists(select 1 from public.golf_players p where p.id=p_user and (p.state->>'xp')::numeric>=18375) then raise exception 'Competitive unlocks at level 15';end if;
 perform pg_advisory_xact_lock(310415);
 v_status:=public.golf_ranked_status(p_user);
 if v_status->'match'->>'phase' in('playing','sudden') then return v_status;end if;
 insert into public.golf_ratings(user_id) values(p_user) on conflict do nothing;
 delete from public.golf_match_queue where expires_at<=now();
 insert into public.golf_match_queue(user_id,equipment) values(p_user,p_equipment) on conflict(user_id) do update set expires_at=now()+interval '45 seconds',equipment=excluded.equipment;
 select * into opponent from public.golf_match_queue q where q.user_id<>p_user and q.expires_at>now() and not exists(select 1 from public.golf_ranked_matches m where (m.a_id=q.user_id or m.b_id=q.user_id) and m.phase<>'finished') order by random() limit 1 for update;
 if found then
  c:=floor(random()*3)::integer;
  insert into public.golf_ranked_matches(a_id,b_id,course) values(opponent.user_id,p_user,c) returning id into m;
  insert into public.golf_rounds(user_id,mode,course,equipment,rules_version,hole_count,competitive_id) values(opponent.user_id,'golf',c,opponent.equipment,p_version,3,m) returning id into ar;
  insert into public.golf_rounds(user_id,mode,course,equipment,rules_version,hole_count,competitive_id) values(p_user,'golf',c,p_equipment,p_version,3,m) returning id into br;
  update public.golf_ranked_matches set a_round=ar,b_round=br where id=m;
  delete from public.golf_match_queue where user_id in(p_user,opponent.user_id);
 elsif exists(select 1 from public.golf_match_queue where user_id=p_user and created_at<=now()-interval '60 seconds') and (select elo from public.golf_ratings where user_id=p_user)<1300 then
  c:=floor(random()*3)::integer;roll:=random();offset_score:=case when roll<.01 then -3 when roll<.04 then -2 when roll<.30 then -1 when roll<.70 then 0 else 1 end;
  for i in 1..abs(offset_score) loop
   select n into slot from generate_series(1,3) n where offset_score>0 or strokes[n]>1 order by random() limit 1;
   strokes[slot]:=strokes[slot]+sign(offset_score);
  end loop;
  select elo into human_elo from public.golf_ratings where user_id=p_user;
  bot_data:=jsonb_build_object('id','bot-'||gen_random_uuid()::text,'name','Birdie Bot','bot',true,'elo',human_elo,'equipment',jsonb_build_object('ball','ball-classic','club','club-classic','driver','driver-classic','trail','trail-fire','hole','hole-confetti','nameplate','nameplate-classic','emote','emote-wave'),'plan',jsonb_build_array(jsonb_build_object('par',4,'strokes',strokes[1]),jsonb_build_object('par',3,'strokes',strokes[2]),jsonb_build_object('par',5,'strokes',strokes[3])));
  insert into public.golf_ranked_matches(a_id,b_id,course,bot) values(p_user,null,c,bot_data) returning id into m;
  insert into public.golf_rounds(user_id,mode,course,equipment,rules_version,hole_count,competitive_id) values(p_user,'golf',c,p_equipment,p_version,3,m) returning id into ar;
  update public.golf_ranked_matches set a_round=ar where id=m;
  delete from public.golf_match_queue where user_id=p_user;
 end if;
 return public.golf_ranked_status(p_user);
end $$;
revoke all on function public.golf_ranked_bot_status(uuid,uuid) from public,anon,authenticated;
grant execute on function public.golf_ranked_bot_status(uuid,uuid) to service_role;
commit;
