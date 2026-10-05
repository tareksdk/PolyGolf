create table public.golf_players (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
 state jsonb not null, revision integer not null default 0, created_at timestamptz not null default now()
);
create table public.golf_rooms (
 id uuid primary key default gen_random_uuid(), code text unique not null,
 state jsonb not null, revision integer not null default 0, updated_at timestamptz not null default now()
);
create table public.golf_rounds (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.golf_players(id) on delete cascade,
 room_id uuid references public.golf_rooms(id) on delete cascade,
 mode text not null check(mode in ('golf','mini')), course integer not null check(course between 0 and 4),
 next_hole integer not null default 0, holes jsonb not null default '[]', equipment jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), finished boolean not null default false
);
create index golf_rounds_user_id_idx on public.golf_rounds(user_id);
create index golf_rounds_room_id_idx on public.golf_rounds(room_id);
create table public.golf_records (
 round_id uuid primary key references public.golf_rounds(id) on delete cascade,
 user_id uuid not null references public.golf_players(id) on delete cascade,
 username text not null, mode text not null, course integer not null, score integer not null, strokes integer not null,
 seconds integer not null, level integer not null, created_at timestamptz not null default now()
);
create index golf_records_ranking_idx on public.golf_records(mode,course,score,seconds);
create index golf_records_user_idx on public.golf_records(user_id);
create table public.golf_maps (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.golf_players(id) on delete cascade,
 name text not null, layout jsonb not null, updated_at timestamptz not null default now(), unique(user_id,name)
);
create table public.golf_presence (
 room_id uuid not null references public.golf_rooms(id) on delete cascade,
 user_id uuid not null references public.golf_players(id) on delete cascade,
 x real not null check(x between -500 and 500), y real not null check(y between -100 and 500), z real not null check(z between -1200 and 500),
 hole integer not null check(hole between 0 and 17), updated_at timestamptz not null default now(), primary key(room_id,user_id)
);
create index golf_presence_user_idx on public.golf_presence(user_id);
create table public.golf_rate_limits (key text primary key, count integer not null, expires timestamptz not null);
alter table public.golf_players enable row level security;
alter table public.golf_rooms enable row level security;
alter table public.golf_rounds enable row level security;
alter table public.golf_records enable row level security;
alter table public.golf_maps enable row level security;
alter table public.golf_presence enable row level security;
alter table public.golf_rate_limits enable row level security;
revoke all on public.golf_players,public.golf_rooms,public.golf_rounds,public.golf_records,public.golf_maps,public.golf_presence,public.golf_rate_limits from anon,authenticated;
grant all on public.golf_players,public.golf_rooms,public.golf_rounds,public.golf_records,public.golf_maps,public.golf_presence,public.golf_rate_limits to service_role;
grant select on public.golf_players,public.golf_rooms,public.golf_rounds,public.golf_records,public.golf_maps,public.golf_presence to authenticated;
grant select on public.golf_records to anon;
grant insert,update,delete on public.golf_presence to authenticated;
create policy golf_player_owner on public.golf_players for select to authenticated using(id=(select auth.uid()));
create policy golf_room_member on public.golf_rooms for select to authenticated using(state->'members' @> jsonb_build_array(jsonb_build_object('id',(select auth.uid())::text)));
create policy golf_round_owner on public.golf_rounds for select to authenticated using(user_id=(select auth.uid()));
create policy golf_rankings_read on public.golf_records for select to anon,authenticated using(true);
create policy golf_maps_owner on public.golf_maps for select to authenticated using(user_id=(select auth.uid()));
create policy golf_presence_member on public.golf_presence for select to authenticated using(exists(select 1 from public.golf_rooms r where r.id=room_id));
create policy golf_presence_write on public.golf_presence for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.golf_rooms r where r.id=room_id));
create policy golf_presence_update on public.golf_presence for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.golf_rooms r where r.id=room_id));
create policy golf_presence_delete on public.golf_presence for delete to authenticated using(user_id=(select auth.uid()));

-- Only the verified Edge Function may commit economy or scores. The row lock and
-- revision check make purchases, rewards and duplicate requests atomic.
create function public.golf_commit(p_user uuid,p_revision integer,p_state jsonb,p_round uuid default null,p_hole integer default null,p_result jsonb default null,p_record jsonb default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare v integer; r public.golf_rounds%rowtype;
begin
 select revision into v from public.golf_players where id=p_user for update;
 if v is null or v<>p_revision then raise sqlstate 'PT409' using message='State changed. Refresh and try again.'; end if;
 if p_round is not null then
  select * into r from public.golf_rounds where id=p_round and user_id=p_user for update;
  if r.id is null or r.finished or r.next_hole<>p_hole then raise exception 'This hole was already recorded or is not ready.'; end if;
  update public.golf_rounds set holes=holes||jsonb_build_array(p_result),next_hole=next_hole+1,updated_at=now(),finished=coalesce((p_result->>'finished')::boolean,false) where id=p_round;
  if p_record is not null then insert into public.golf_records(round_id,user_id,username,mode,course,score,strokes,seconds,level)
   values(p_round,p_user,p_record->>'username',r.mode,r.course,(p_record->>'score')::integer,(p_record->>'strokes')::integer,(p_record->>'seconds')::integer,(p_record->>'level')::integer); end if;
 end if;
 update public.golf_players set state=p_state,revision=revision+1 where id=p_user;
 return v+1;
end $$;
create function public.golf_room_cas(p_id uuid,p_revision integer,p_state jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare v integer;
begin
 update public.golf_rooms set state=p_state,revision=revision+1,updated_at=now() where id=p_id and revision=p_revision returning revision into v;
 -- A stale revision is an application conflict, not a serialization failure.
 -- SQLSTATE 40001 makes PostgREST 14 retry this RPC indefinitely.
 if v is null then raise sqlstate 'PT409' using message='Room changed. Try again.'; end if; return v;
end $$;
create function public.golf_rate(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare v integer;
begin
 insert into public.golf_rate_limits(key,count,expires) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=case when golf_rate_limits.expires<now() then 1 else golf_rate_limits.count+1 end,
 expires=case when golf_rate_limits.expires<now() then now()+make_interval(secs=>p_seconds) else golf_rate_limits.expires end returning count into v;
 if random()<.01 then delete from public.golf_rate_limits where expires<now()-interval '1 day'; end if;
 return v<=p_limit;
end $$;
revoke all on function public.golf_commit(uuid,integer,jsonb,uuid,integer,jsonb,jsonb),public.golf_room_cas(uuid,integer,jsonb),public.golf_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.golf_commit(uuid,integer,jsonb,uuid,integer,jsonb,jsonb),public.golf_room_cas(uuid,integer,jsonb),public.golf_rate(text,integer,integer) to service_role;
