-- PostgREST 14 retries SQLSTATE 40001 inside an RPC indefinitely. A stale
-- room revision is expected contention; return HTTP 409 without retrying.
create or replace function public.golf_room_cas(p_id uuid,p_revision integer,p_state jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare v integer;
begin
 update public.golf_rooms set state=p_state,revision=revision+1,updated_at=now()
 where id=p_id and revision=p_revision returning revision into v;
 if v is null then raise sqlstate 'PT409' using message='Room changed. Try again.'; end if;
 return v;
end $$;
