create table public.golf_public_maps (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.golf_players(id) on delete cascade,
 author text not null, name text not null check(length(name) between 1 and 40),
 layout jsonb not null, published_at timestamptz not null default now(),
 unique(user_id,name)
);
create index golf_public_maps_recent_idx on public.golf_public_maps(published_at desc,id);
create table public.golf_map_likes (
 map_id uuid not null references public.golf_public_maps(id) on delete cascade,
 user_id uuid not null references public.golf_players(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(map_id,user_id)
);
create index golf_map_likes_user_idx on public.golf_map_likes(user_id);
alter table public.golf_public_maps enable row level security;
alter table public.golf_map_likes enable row level security;
revoke all on public.golf_public_maps,public.golf_map_likes from anon,authenticated;
grant all on public.golf_public_maps,public.golf_map_likes to service_role;
grant select on public.golf_public_maps to anon,authenticated;
grant select on public.golf_map_likes to authenticated;
create policy golf_published_maps_read on public.golf_public_maps for select to anon,authenticated using(true);
create policy golf_likes_owner_read on public.golf_map_likes for select to authenticated using(user_id=(select auth.uid()));

-- Only the authenticated Edge Function supplies player IDs to these invoker RPCs.
create function public.golf_community(p_user uuid default null,p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from (
  select p.*, (select count(*) from public.golf_map_likes l where l.map_id=p.id) as likes,
   exists(select 1 from public.golf_map_likes l where l.map_id=p.id and l.user_id=p_user) as liked,
   coalesce(p.user_id=p_user,false) as own
  from public.golf_public_maps p order by p.published_at desc,p.id
  limit 24 offset greatest(0,least(100000,p_offset))
 ) m;
$$;
create function public.golf_like_map(p_user uuid,p_map uuid,p_liked boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid;
begin
 select user_id into owner_id from public.golf_public_maps where id=p_map;
 if owner_id is null then raise exception 'This map is no longer published.'; end if;
 if owner_id=p_user then raise exception 'Play and like another creator’s map.'; end if;
 if p_liked then insert into public.golf_map_likes(map_id,user_id) values(p_map,p_user) on conflict do nothing;
 else delete from public.golf_map_likes where map_id=p_map and user_id=p_user; end if;
 return jsonb_build_object('liked',p_liked,'likes',(select count(*) from public.golf_map_likes where map_id=p_map));
end $$;
revoke all on function public.golf_community(uuid,integer),public.golf_like_map(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.golf_community(uuid,integer),public.golf_like_map(uuid,uuid,boolean) to service_role;
