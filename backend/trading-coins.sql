-- Upgrade existing installations. Existing item-only offers keep zero coin amounts.
alter table public.golf_trades
 add column if not exists offered_coins bigint not null default 0 check(offered_coins between 0 and 1000000000),
 add column if not exists requested_coins bigint not null default 0 check(requested_coins between 0 and 1000000000);
alter table public.golf_trades drop constraint if exists golf_trades_offered_check;
alter table public.golf_trades drop constraint if exists golf_trades_requested_check;
alter table public.golf_trades add constraint golf_trades_offered_check check(jsonb_typeof(offered)='array' and jsonb_array_length(offered) between 0 and 5 and (jsonb_array_length(offered)>0 or offered_coins>0));
alter table public.golf_trades add constraint golf_trades_requested_check check(jsonb_typeof(requested)='array' and jsonb_array_length(requested) between 0 and 5 and (jsonb_array_length(requested)>0 or requested_coins>0));
create or replace function public.golf_trade_accept(p_user uuid,p_trade uuid,p_sender_revision integer,p_receiver_revision integer,p_sender_state jsonb,p_receiver_state jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.golf_trades%rowtype; a public.golf_players%rowtype; b public.golf_players%rowtype; ac numeric; bc numeric; next_a numeric; next_b numeric;
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
 ac:=coalesce((a.state->>'coins')::numeric,0); bc:=coalesce((b.state->>'coins')::numeric,0);
 next_a:=ac-t.offered_coins+t.requested_coins; next_b:=bc-t.requested_coins+t.offered_coins;
 if ac<t.offered_coins or bc<t.requested_coins then raise sqlstate 'PT409' using message='A golfer no longer has enough coins for this offer.'; end if;
 if next_a not between 0 and 9007199254740991 or next_b not between 0 and 9007199254740991
    or next_a<>trunc(next_a) or next_b<>trunc(next_b)
    or coalesce((p_sender_state->>'coins')::numeric,0)<>next_a
    or coalesce((p_receiver_state->>'coins')::numeric,0)<>next_b
 then raise sqlstate 'PT409' using message='Coin balances changed. Review the offer and try again.'; end if;
 update public.golf_players set state=p_sender_state,revision=revision+1 where id=a.id;
 update public.golf_players set state=p_receiver_state,revision=revision+1 where id=b.id;
 update public.golf_trades set status='accepted',resolved_at=now() where id=t.id;
 return jsonb_build_object('state',p_receiver_state,'duplicate',false);
end $$;
revoke all on function public.golf_trade_accept(uuid,uuid,integer,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.golf_trade_accept(uuid,uuid,integer,integer,jsonb,jsonb) to service_role;
