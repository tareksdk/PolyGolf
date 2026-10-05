-- Mode-aware community browsing. Existing mini-golf layouts remain valid.
create or replace function public.golf_community_v2(p_user uuid default null,p_offset integer default 0,p_mode text default 'mini')
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from (
  select p.*, (select count(*) from public.golf_map_likes l where l.map_id=p.id) as likes,
   exists(select 1 from public.golf_map_likes l where l.map_id=p.id and l.user_id=p_user) as liked,
   coalesce(p.user_id=p_user,false) as own
  from public.golf_public_maps p
  where coalesce(p.layout->>'mode','mini')=p_mode
  order by p.published_at desc,p.id
  limit 24 offset greatest(0,least(100000,p_offset))
 ) m;
$$;
revoke all on function public.golf_community_v2(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.golf_community_v2(uuid,integer,text) to service_role;
create index if not exists golf_public_maps_mode_recent_idx on public.golf_public_maps ((coalesce(layout->>'mode','mini')),published_at desc,id);
