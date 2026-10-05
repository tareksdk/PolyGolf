-- Clubhouse v2: additive profile, friendship and course-version support.
alter table public.golf_players add column if not exists bio text not null default '' check(length(bio)<=280);
alter table public.golf_players add column if not exists avatar text not null default '' check(length(avatar)<=54000 and (avatar='' or avatar like 'data:image/webp;base64,%'));
alter table public.golf_rounds add column if not exists rules_version text not null default 'legacy-v1';
alter table public.golf_rounds add column if not exists hole_count integer not null default 9 check(hole_count in (3,9,18));
update public.golf_rounds set hole_count=18 where mode='golf' and rules_version='legacy-v1';
alter table public.golf_records add column if not exists rules_version text not null default 'legacy-v1';
alter table public.golf_records add column if not exists hole_count integer not null default 9 check(hole_count in (3,9,18));
update public.golf_records set hole_count=18 where mode='golf' and rules_version='legacy-v1';
create index if not exists golf_records_version_ranking_idx on public.golf_records(rules_version,mode,course,hole_count,score,seconds);

create table public.golf_friends (
 user_low uuid not null references public.golf_players(id) on delete cascade,
 user_high uuid not null references public.golf_players(id) on delete cascade,
 requested_by uuid not null references public.golf_players(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 updated_at timestamptz not null default now(),
 primary key(user_low,user_high), check(user_low<user_high), check(requested_by in (user_low,user_high))
);
create index golf_friends_high_idx on public.golf_friends(user_high);
create index golf_friends_requester_idx on public.golf_friends(requested_by);
alter table public.golf_friends enable row level security;
revoke all on public.golf_friends from public,anon,authenticated;
grant all on public.golf_friends to service_role;

create or replace function public.golf_friend_action(p_user uuid,p_target uuid,p_action text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare lo uuid:=least(p_user,p_target); hi uuid:=greatest(p_user,p_target); f public.golf_friends%rowtype;
begin
 if p_user=p_target or not exists(select 1 from public.golf_players where id=p_target) then raise exception 'Choose another golfer.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lo::text||hi::text,0));
 select * into f from public.golf_friends where user_low=lo and user_high=hi for update;
 if p_action='request' then
  if f.user_low is null then
   if (select count(*) from public.golf_friends where user_low=p_user or user_high=p_user)>=200 then raise exception 'Your friends list is full. Remove an old request first.'; end if;
   insert into public.golf_friends(user_low,user_high,requested_by) values(lo,hi,p_user) returning * into f;
  end if;
 elsif p_action='accept' then
  if f.user_low is null or f.requested_by=p_user then raise exception 'Only the invited golfer can accept this request.'; end if;
  update public.golf_friends set status='accepted',updated_at=now() where user_low=lo and user_high=hi returning * into f;
 elsif p_action='remove' then
  delete from public.golf_friends where user_low=lo and user_high=hi;return null;
 else raise exception 'Unknown friend action.';
 end if;
 return jsonb_build_object('status',f.status,'incoming',f.requested_by<>p_user);
end $$;
revoke all on function public.golf_friend_action(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.golf_friend_action(uuid,uuid,text) to service_role;

-- Use an application conflict, never SQLSTATE 40001 (PostgREST 14 retry loop).
create or replace function public.golf_commit(p_user uuid,p_revision integer,p_state jsonb,p_round uuid default null,p_hole integer default null,p_result jsonb default null,p_record jsonb default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare v integer; r public.golf_rounds%rowtype;
begin
 select revision into v from public.golf_players where id=p_user for update;
 if v is null or v<>p_revision then raise sqlstate 'PT409' using message='State changed. Refresh and try again.'; end if;
 if p_round is not null then
  select * into r from public.golf_rounds where id=p_round and user_id=p_user for update;
  if r.id is null or r.finished or r.next_hole<>p_hole then raise exception 'This hole was already recorded or is not ready.'; end if;
  update public.golf_rounds set holes=holes||jsonb_build_array(p_result),next_hole=next_hole+1,updated_at=now(),finished=coalesce((p_result->>'finished')::boolean,false) where id=p_round;
  if p_record is not null then
   insert into public.golf_records(round_id,user_id,username,mode,course,score,strokes,seconds,level,rules_version,hole_count)
   values(p_round,p_user,p_record->>'username',r.mode,r.course,(p_record->>'score')::integer,(p_record->>'strokes')::integer,(p_record->>'seconds')::integer,(p_record->>'level')::integer,r.rules_version,r.hole_count);
  end if;
 end if;
 update public.golf_players set state=p_state,revision=revision+1 where id=p_user;
 return v+1;
end $$;
