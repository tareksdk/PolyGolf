begin;
create table if not exists public.golf_ratings(
 user_id uuid primary key references public.golf_players(id) on delete cascade,
 elo integer not null default 1000 check(elo>=0),wins integer not null default 0,losses integer not null default 0,matches integer not null default 0
);
create table if not exists public.golf_match_queue(
 user_id uuid primary key references public.golf_players(id) on delete cascade,
 equipment jsonb not null,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '45 seconds'
);
create table if not exists public.golf_ranked_matches(
 id uuid primary key default gen_random_uuid(),a_id uuid not null references public.golf_players(id) on delete cascade,b_id uuid not null references public.golf_players(id) on delete cascade,
 a_round uuid references public.golf_rounds(id),b_round uuid references public.golf_rounds(id),course integer not null,
 phase text not null default 'playing' check(phase in('playing','sudden','finished')),
 a_seen timestamptz not null default now(),b_seen timestamptz not null default now(),created_at timestamptz not null default clock_timestamp(),deadline timestamptz not null default now()+interval '18 minutes',
 sudden_round integer not null default 0,sudden_started timestamptz,a_distance numeric,b_distance numeric,
 winner uuid,reason text,a_delta integer not null default 0,b_delta integer not null default 0,finished_at timestamptz,check(a_id<>b_id)
);
alter table public.golf_rounds add column if not exists competitive_id uuid references public.golf_ranked_matches(id);
create index if not exists golf_ranked_a_idx on public.golf_ranked_matches(a_id,created_at desc);
create index if not exists golf_ranked_b_idx on public.golf_ranked_matches(b_id,created_at desc);
create index if not exists golf_queue_expiry_idx on public.golf_match_queue(expires_at);
create index if not exists golf_ratings_elo_idx on public.golf_ratings(elo desc);
create index if not exists golf_rounds_competitive_idx on public.golf_rounds(competitive_id);
alter table public.golf_ratings enable row level security;
alter table public.golf_match_queue enable row level security;
alter table public.golf_ranked_matches enable row level security;
revoke all on public.golf_ratings,public.golf_match_queue,public.golf_ranked_matches from public,anon,authenticated;
grant all on public.golf_ratings,public.golf_match_queue,public.golf_ranked_matches to service_role;

create or replace function public.golf_ranked_finish(p_match uuid,p_winner uuid,p_reason text) returns void
language plpgsql security invoker set search_path='' as $$
declare m public.golf_ranked_matches;we integer;le integer;delta integer;loser uuid;
begin
 select * into m from public.golf_ranked_matches where id=p_match for update;
 if not found or m.phase='finished' then return;end if;
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

create or replace function public.golf_ranked_status(p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.golf_ranked_matches;ra public.golf_rounds;rb public.golf_rounds;sa integer;sb integer;va boolean;vb boolean;rating jsonb;match_data jsonb;
begin
 select * into m from public.golf_ranked_matches where a_id=p_user or b_id=p_user order by created_at desc limit 1 for update;
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

create or replace function public.golf_ranked_leave(p_user uuid,p_forfeit boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.golf_ranked_matches;
begin
 perform pg_advisory_xact_lock(310415);delete from public.golf_match_queue where user_id=p_user;
 select * into m from public.golf_ranked_matches where (a_id=p_user or b_id=p_user) and phase<>'finished' limit 1 for update;
 if found then if not p_forfeit then raise exception 'A match was found. Forfeit explicitly to leave.';end if;perform public.golf_ranked_finish(m.id,case when m.a_id=p_user then m.b_id else m.a_id end,'forfeit');end if;
 return public.golf_ranked_status(p_user);
end $$;

create or replace function public.golf_ranked_shot(p_user uuid,p_match uuid,p_round integer,p_distance numeric) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.golf_ranked_matches;
begin
 select * into m from public.golf_ranked_matches where id=p_match and p_user in(a_id,b_id) for update;
 if not found or m.phase<>'sudden' or m.sudden_round<>p_round or m.deadline<now() then raise exception 'This sudden-death attempt has ended';end if;
 if p_distance<0 or p_distance>1000000 or p_distance::text in('NaN','Infinity','-Infinity') then raise exception 'Invalid distance';end if;
 if p_user=m.a_id then update public.golf_ranked_matches set a_distance=coalesce(a_distance,p_distance) where id=p_match;
 else update public.golf_ranked_matches set b_distance=coalesce(b_distance,p_distance) where id=p_match;end if;
 return public.golf_ranked_status(p_user);
end $$;

revoke all on function public.golf_ranked_finish(uuid,uuid,text),public.golf_ranked_status(uuid),public.golf_ranked_join(uuid,jsonb,text),public.golf_ranked_leave(uuid,boolean),public.golf_ranked_shot(uuid,uuid,integer,numeric) from public,anon,authenticated;
grant execute on function public.golf_ranked_finish(uuid,uuid,text),public.golf_ranked_status(uuid),public.golf_ranked_join(uuid,jsonb,text),public.golf_ranked_leave(uuid,boolean),public.golf_ranked_shot(uuid,uuid,integer,numeric) to service_role;
commit;
