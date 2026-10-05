-- Keep matchmaking aligned with RULES_VERSION in dist/src/golf-courses.js.
create or replace function public.golf_ranked_join(p_user uuid,p_equipment jsonb,p_version text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare opponent public.golf_match_queue;m uuid;ar uuid;br uuid;c integer;v_status jsonb;
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
 end if;
 return public.golf_ranked_status(p_user);
end $$;

revoke all on function public.golf_ranked_join(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.golf_ranked_join(uuid,jsonb,text) to service_role;
