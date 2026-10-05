begin;
create schema if not exists golf_private;
revoke all on schema golf_private from public;
grant usage on schema golf_private to authenticated;
-- Private, per-player channels prevent outsiders from watching and players from
-- impersonating another golfer. Broadcast movement never writes to game tables.
create or replace function golf_private.golf_can_view_presence(p_topic text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[]; scope_id uuid; golfer uuid; viewer uuid := auth.uid();
begin
 if viewer is null or length(p_topic)>140 then return false; end if;
 parts:=string_to_array(p_topic,':');
 if array_length(parts,1)<>4 or parts[1]<>'polygolf' or parts[2] not in ('room','ranked')
 or parts[3] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 or parts[4] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
 scope_id:=parts[3]::uuid;golfer:=parts[4]::uuid;
 if parts[2]='room' then
  return exists(select 1 from public.golf_rooms r where r.id=scope_id and r.state->>'phase'='playing'
   and (r.state->'members') @> jsonb_build_array(jsonb_build_object('id',viewer::text))
   and (r.state->'members') @> jsonb_build_array(jsonb_build_object('id',golfer::text)));
 end if;
 return exists(select 1 from public.golf_ranked_matches m where m.id=scope_id and m.phase in ('playing','sudden')
  and viewer in(m.a_id,m.b_id) and golfer in(m.a_id,m.b_id));
end $$;
revoke all on function golf_private.golf_can_view_presence(text) from public,anon;
grant execute on function golf_private.golf_can_view_presence(text) to authenticated;
drop policy if exists polygolf_live_read on realtime.messages;
create policy polygolf_live_read on realtime.messages for select to authenticated
 using (extension='broadcast' and golf_private.golf_can_view_presence((select realtime.topic())));
drop policy if exists polygolf_live_write on realtime.messages;
create policy polygolf_live_write on realtime.messages for insert to authenticated
 with check (extension='broadcast' and split_part((select realtime.topic()),':',4)=(select auth.uid())::text
  and golf_private.golf_can_view_presence((select realtime.topic())));
commit;
