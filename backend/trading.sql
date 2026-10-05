-- Service-only economy operations. No browser can write offers or player state.
create table if not exists public.golf_trades (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.golf_players(id) on delete cascade,
 receiver_id uuid not null references public.golf_players(id) on delete cascade,
 offered jsonb not null check(jsonb_typeof(offered)='array' and jsonb_array_length(offered) between 1 and 5),
 requested jsonb not null check(jsonb_typeof(requested)='array' and jsonb_array_length(requested) between 1 and 5),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours',
 resolved_at timestamptz, check(sender_id<>receiver_id)
);
create index if not exists golf_trades_sender_idx on public.golf_trades(sender_id,created_at desc);
create index if not exists golf_trades_receiver_idx on public.golf_trades(receiver_id,created_at desc);
alter table public.golf_trades enable row level security;
revoke all on public.golf_trades from public,anon,authenticated;
grant all on public.golf_trades to service_role;

create or replace function public.golf_trade_accept(p_user uuid,p_trade uuid,p_sender_revision integer,p_receiver_revision integer,p_sender_state jsonb,p_receiver_state jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.golf_trades%rowtype; a public.golf_players%rowtype; b public.golf_players%rowtype;
begin
 select * into t from public.golf_trades where id=p_trade for update;
 if t.id is null or t.receiver_id<>p_user then raise sqlstate 'PT403' using message='Only the recipient can accept this offer.'; end if;
 -- All exchanges lock inventories in the same order, preventing crossed-offer deadlocks.
 perform id from public.golf_players where id in (t.sender_id,t.receiver_id) order by id for update;
 select * into a from public.golf_players where id=t.sender_id;
 select * into b from public.golf_players where id=t.receiver_id;
 if t.status='accepted' then return jsonb_build_object('state',b.state,'duplicate',true); end if;
 if t.status<>'pending' or t.expires_at<=now() then raise sqlstate 'PT409' using message='This offer is no longer available.'; end if;
 if a.revision<>p_sender_revision or b.revision<>p_receiver_revision then raise sqlstate 'PT409' using message='An inventory changed. Review the offer and try again.'; end if;
 if not exists(select 1 from public.golf_friends where user_low=least(t.sender_id,t.receiver_id) and user_high=greatest(t.sender_id,t.receiver_id) and status='accepted') then raise sqlstate 'PT409' using message='You must still be friends to trade.'; end if;
 update public.golf_players set state=p_sender_state,revision=revision+1 where id=a.id;
 update public.golf_players set state=p_receiver_state,revision=revision+1 where id=b.id;
 update public.golf_trades set status='accepted',resolved_at=now() where id=t.id;
 return jsonb_build_object('state',p_receiver_state,'duplicate',false);
end $$;
create or replace function public.golf_trade_close(p_user uuid,p_trade uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare t public.golf_trades%rowtype; result text;
begin
 select * into t from public.golf_trades where id=p_trade for update;
 if t.id is null or p_user not in(t.sender_id,t.receiver_id) then raise sqlstate 'PT403' using message='Trade not found.'; end if;
 if t.status<>'pending' then return t.status; end if;
 result:=case when t.sender_id=p_user then 'cancelled' else 'declined' end;
 update public.golf_trades set status=result,resolved_at=now() where id=t.id;
 return result;
end $$;
revoke all on function public.golf_trade_accept(uuid,uuid,integer,integer,jsonb,jsonb),public.golf_trade_close(uuid,uuid) from public,anon,authenticated;
grant execute on function public.golf_trade_accept(uuid,uuid,integer,integer,jsonb,jsonb),public.golf_trade_close(uuid,uuid) to service_role;

-- Supabase Table Editor: change online_base. The client stays within +/-5%.
-- This is a labelled, studio-set estimate; it does not measure player presence.
create table if not exists public.golf_site_settings (
 id text primary key check(id='activity'), online_base integer not null default 100 check(online_base between 0 and 1000000),
 enabled boolean not null default true
);
insert into public.golf_site_settings(id,online_base) values('activity',100) on conflict(id) do nothing;
alter table public.golf_site_settings enable row level security;
revoke all on public.golf_site_settings from public,anon,authenticated;
grant select on public.golf_site_settings to anon,authenticated;
grant all on public.golf_site_settings to service_role;
create policy golf_activity_read on public.golf_site_settings for select to anon,authenticated using(id='activity');
comment on column public.golf_site_settings.online_base is 'Studio-set online estimate. UI fluctuates within 5%; not a measured online count.';
