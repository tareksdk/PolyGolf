-- Auction house. Applied to the connected project as migration polygolf_082_auctions_islands.
-- Service-only, like trading: RLS is enabled with no client policies or grants, and only the
-- Edge Function (service role) calls these functions. Sellers' items and bidders' coins are held
-- in escrow on the auction row; settlement moves them atomically.
create table if not exists public.golf_auctions (
 id uuid primary key,
 seller_id uuid not null references public.golf_players(id),
 item jsonb not null check(jsonb_typeof(item)='object' and item ? 'id' and item ? 'category' and item ? 'fallback'),
 starting_bid bigint not null check(starting_bid between 1 and 1000000000),
 buyout bigint check(buyout>=starting_bid and buyout<=1000000000),
 highest_bid bigint not null default 0 check(highest_bid between 0 and 1000000000),
 bidder_id uuid references public.golf_players(id),
 bid_count integer not null default 0,
 status text not null default 'active' check(status in ('active','sold','expired','cancelled','refunded')),
 created_at timestamptz not null default now(),
 ends_at timestamptz not null,
 resolved_at timestamptz,
 check(bidder_id is null or bidder_id<>seller_id),
 check((bidder_id is null)=(highest_bid=0))
);
create index if not exists golf_auctions_active_end on public.golf_auctions(ends_at,id) where status='active';
create index if not exists golf_auctions_seller on public.golf_auctions(seller_id,created_at desc);
create index if not exists golf_auctions_bidder on public.golf_auctions(bidder_id,ends_at) where bidder_id is not null;
create table if not exists public.golf_auction_requests (
 user_id uuid not null references public.golf_players(id),
 request_id uuid not null,
 auction_id uuid not null references public.golf_auctions(id),
 action text not null, amount bigint, result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table public.golf_auctions enable row level security;
alter table public.golf_auction_requests enable row level security;
revoke all on public.golf_auctions,public.golf_auction_requests from public,anon,authenticated;
grant all on public.golf_auctions,public.golf_auction_requests to service_role;

create or replace function public.golf_auction_owns(s jsonb,e jsonb)
returns boolean language sql immutable set search_path='' as $$
 select coalesce((s->'owned') ? (e->>'id'),false) and
 (not (e ? 'seed') or coalesce((s->'patterns'->(e->>'id')) @> jsonb_build_array((e->>'seed')::integer),false));
$$;

-- Adds or removes one item (or one exact pattern) from a player state, matching trades.js.
create or replace function public.golf_auction_item(s jsonb,e jsonb,adding boolean)
returns jsonb language plpgsql immutable set search_path='' as $$
declare k text:=e->>'id'; cat text:=e->>'category'; seeds jsonb; owned jsonb;
begin
 if adding then
  if not coalesce((s->'owned') ? k,false) then s:=jsonb_set(s,'{owned}',coalesce(s->'owned','[]')||jsonb_build_array(k));end if;
  if e ? 'seed' then
   s:=jsonb_set(s,'{patterns}',coalesce(s->'patterns','{}'));
   seeds:=coalesce(s->'patterns'->k,'[]');
   if not seeds @> jsonb_build_array((e->>'seed')::integer) then seeds:=seeds||jsonb_build_array((e->>'seed')::integer);end if;
   s:=jsonb_set(s,array['patterns',k],seeds);
  end if;
  return s;
 end if;
 if not public.golf_auction_owns(s,e) then raise sqlstate 'PT409' using message='This item is no longer in your collection.';end if;
 if e ? 'seed' then
  select coalesce(jsonb_agg(v),'[]') into seeds from jsonb_array_elements(s->'patterns'->k) v where v<>to_jsonb((e->>'seed')::integer);
  s:=jsonb_set(s,array['patterns',k],seeds);
  if (s->'equipment'->'patterns'->k)=to_jsonb((e->>'seed')::integer) then
   if jsonb_array_length(seeds)>0 then s:=jsonb_set(s,array['equipment','patterns',k],seeds->0);
   else s:=s #- array['equipment','patterns',k];end if;
  end if;
  if jsonb_array_length(seeds)>0 then return s;end if;
  s:=s #- array['patterns',k];
 end if;
 select coalesce(jsonb_agg(v),'[]') into owned from jsonb_array_elements(s->'owned') v where v<>to_jsonb(k);
 s:=jsonb_set(s,'{owned}',owned);
 if s->'equipment'->>cat=k then s:=jsonb_set(s,array['equipment',cat],e->'fallback');end if;
 return s;
end $$;

create or replace function public.golf_auction_create(p_user uuid,p_id uuid,p_revision integer,p_item jsonb,p_start bigint,p_buyout bigint,p_hours integer)
returns jsonb language plpgsql set search_path='' as $$
declare p public.golf_players%rowtype;t public.golf_auctions%rowtype;s jsonb;
begin
 select * into t from public.golf_auctions where id=p_id;
 if found then
  if t.seller_id<>p_user or t.item<>p_item or t.starting_bid<>p_start or t.buyout is distinct from p_buyout then raise exception 'Invalid auction request.';end if;
  return jsonb_build_object('auction',to_jsonb(t),'state',(select state from public.golf_players where id=p_user),'duplicate',true);
 end if;
 select * into p from public.golf_players where id=p_user for update;
 if p.id is null or p.is_guest or coalesce((p.state->>'xp')::numeric,0)<2750 then raise sqlstate 'PT403' using message='The auction house unlocks for accounts at level 5.';end if;
 if p.revision<>p_revision then raise sqlstate 'PT409' using message='Your collection changed. Refresh before listing.';end if;
 if p_start is null or p_start not between 1 and 1000000000 or p_buyout<p_start or p_buyout>1000000000 or p_hours not in (6,24,72) then raise exception 'Invalid auction price or duration.';end if;
 if (select count(*) from public.golf_auctions where seller_id=p_user and status='active')>=10 then raise exception 'You can list up to 10 items at once.';end if;
 s:=public.golf_auction_item(p.state,p_item,false);
 insert into public.golf_auctions(id,seller_id,item,starting_bid,buyout,ends_at) values(p_id,p_user,p_item,p_start,p_buyout,now()+make_interval(hours=>p_hours)) returning * into t;
 update public.golf_players set state=s,revision=revision+1 where id=p_user;
 return jsonb_build_object('auction',to_jsonb(t),'state',s);
end $$;

-- Closes an ended auction: the item goes to the winner and the coins to the seller. Unsold items
-- return to the seller; if the winner already owns the item by then, both sides are refunded.
create or replace function public.golf_auction_settle(p_id uuid)
returns jsonb language plpgsql set search_path='' as $$
declare t public.golf_auctions%rowtype;a public.golf_players%rowtype;b public.golf_players%rowtype;ss jsonb;bs jsonb;v_status text;
begin
 select * into t from public.golf_auctions where id=p_id for update;
 if t.id is null then raise exception 'Auction not found.';end if;
 if t.status<>'active' or t.ends_at>now() then return to_jsonb(t);end if;
 perform id from public.golf_players where id in(t.seller_id,t.bidder_id) order by id for update;
 select * into a from public.golf_players where id=t.seller_id;
 select * into b from public.golf_players where id=t.bidder_id;
 ss:=a.state;
 if t.bidder_id is null then ss:=public.golf_auction_item(ss,t.item,true);v_status:='expired';
 elsif public.golf_auction_owns(b.state,t.item) then
  ss:=public.golf_auction_item(ss,t.item,true);v_status:='refunded';
  bs:=jsonb_set(b.state,'{coins}',to_jsonb(coalesce((b.state->>'coins')::bigint,0)+t.highest_bid));
 else
  ss:=jsonb_set(ss,'{coins}',to_jsonb(coalesce((ss->>'coins')::bigint,0)+t.highest_bid));
  bs:=public.golf_auction_item(b.state,t.item,true);v_status:='sold';
 end if;
 update public.golf_players set state=ss,revision=revision+1 where id=t.seller_id;
 if bs is not null then update public.golf_players set state=bs,revision=revision+1 where id=t.bidder_id;end if;
 update public.golf_auctions set status=v_status,resolved_at=now() where id=t.id returning * into t;
 return to_jsonb(t);
end $$;

-- Bid, instant-buy or cancel. Outbid coins are refunded immediately. Retries with the same
-- request ID return the recorded result instead of charging twice.
create or replace function public.golf_auction_action(p_user uuid,p_id uuid,p_action text,p_amount bigint,p_request uuid)
returns jsonb language plpgsql set search_path='' as $$
declare t public.golf_auctions%rowtype;p public.golf_players%rowtype;r public.golf_auction_requests%rowtype;
 amount bigint; needed bigint; minimum bigint;result jsonb;s jsonb;
begin
 if p_request is null then raise exception 'Missing request ID.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_request::text,0));
 select * into r from public.golf_auction_requests where user_id=p_user and request_id=p_request;
 if found then
  if r.auction_id<>p_id or r.action<>p_action or r.amount is distinct from p_amount then raise exception 'This request ID was already used.';end if;
  return r.result||jsonb_build_object('state',(select state from public.golf_players where id=p_user),'duplicate',true);
 end if;
 select * into t from public.golf_auctions where id=p_id for update;
 if t.id is null then raise exception 'Auction not found.';end if;
 if t.status='active' and t.ends_at<=now() then
  result:=jsonb_build_object('auction',public.golf_auction_settle(t.id),'closed',true,'state',(select state from public.golf_players where id=p_user));
 else
  if t.status<>'active' then raise sqlstate 'PT409' using message='This auction has ended. Refresh to see the result.';end if;
  perform id from public.golf_players where id in(p_user,t.seller_id,t.bidder_id) order by id for update;
  select * into p from public.golf_players where id=p_user;
  if p.id is null or p.is_guest or coalesce((p.state->>'xp')::numeric,0)<2750 then raise sqlstate 'PT403' using message='The auction house unlocks for accounts at level 5.';end if;
  if p_action='cancel' then
   if t.seller_id<>p_user or t.bidder_id is not null then raise sqlstate 'PT403' using message='Only the seller can cancel an auction, before its first bid.';end if;
   s:=public.golf_auction_item(p.state,t.item,true);
   update public.golf_players set state=s,revision=revision+1 where id=p_user;
   update public.golf_auctions set status='cancelled',resolved_at=now() where id=t.id returning * into t;
  elsif p_action in('bid','buy') then
   if t.seller_id=p_user then raise exception 'You cannot bid on your own item.';end if;
   if public.golf_auction_owns(p.state,t.item) then raise exception 'You already own this item or exact pattern.';end if;
   amount:=case when p_action='buy' then t.buyout else p_amount end;
   minimum:=case when t.highest_bid=0 then t.starting_bid else t.highest_bid+greatest(1,ceil(t.highest_bid*.05)::bigint) end;
   if amount is null or amount not between 1 and 1000000000 or (p_action='buy' and p_amount is distinct from t.buyout) or (p_action='bid' and amount<minimum) then raise exception 'The minimum bid changed. Refresh and try again.';end if;
   if t.buyout is not null and amount>=t.buyout then amount:=t.buyout;end if;
   needed:=amount-case when t.bidder_id=p_user then t.highest_bid else 0 end;
   if coalesce((p.state->>'coins')::bigint,0)<needed then raise exception 'You do not have enough available coins.';end if;
   s:=jsonb_set(p.state,'{coins}',to_jsonb((p.state->>'coins')::bigint-needed));
   update public.golf_players set state=s,revision=revision+1 where id=p_user;
   if t.bidder_id is not null and t.bidder_id<>p_user then
    update public.golf_players set state=jsonb_set(state,'{coins}',to_jsonb((state->>'coins')::bigint+t.highest_bid)),revision=revision+1 where id=t.bidder_id;
   end if;
   update public.golf_auctions set highest_bid=amount,bidder_id=p_user,bid_count=bid_count+1,
    ends_at=case when amount=buyout then now() else ends_at end where id=t.id returning * into t;
   if t.buyout=amount then perform public.golf_auction_settle(t.id);select * into t from public.golf_auctions where id=t.id;end if;
  else raise exception 'Unknown auction action.';end if;
  result:=jsonb_build_object('auction',to_jsonb(t),'state',(select state from public.golf_players where id=p_user));
 end if;
 insert into public.golf_auction_requests(user_id,request_id,auction_id,action,amount,result) values(p_user,p_request,p_id,p_action,p_amount,result-'state');
 return result;
end $$;

-- Settles up to 50 ended auctions. The Edge Function calls it whenever the auction house loads.
create or replace function public.golf_auction_sweep()
returns integer language plpgsql set search_path='' as $$
declare t record;n integer:=0;ids uuid[];
begin
 select array_agg(id) into ids from (select id from public.golf_auctions where status='active' and ends_at<=now() order by ends_at,id limit 50 for update skip locked) q;
 perform id from public.golf_players where id in(select seller_id from public.golf_auctions where id=any(ids) union select bidder_id from public.golf_auctions where id=any(ids)) order by id for update;
 for t in select id from public.golf_auctions where id=any(ids) order by id loop
  perform public.golf_auction_settle(t.id);n:=n+1;
 end loop;return n;
end $$;

revoke all on function public.golf_auction_owns(jsonb,jsonb),public.golf_auction_item(jsonb,jsonb,boolean),
 public.golf_auction_create(uuid,uuid,integer,jsonb,bigint,bigint,integer),public.golf_auction_settle(uuid),
 public.golf_auction_action(uuid,uuid,text,bigint,uuid),public.golf_auction_sweep() from public,anon,authenticated;
grant execute on function public.golf_auction_owns(jsonb,jsonb),public.golf_auction_item(jsonb,jsonb,boolean),
 public.golf_auction_create(uuid,uuid,integer,jsonb,bigint,bigint,integer),public.golf_auction_settle(uuid),
 public.golf_auction_action(uuid,uuid,text,bigint,uuid),public.golf_auction_sweep() to service_role;

-- Optional, not yet applied: settle ended auctions every five minutes even when nobody opens
-- the auction house (pg_cron is installed on the connected project).
-- select cron.schedule('golf-auction-sweep','*/5 * * * *','select public.golf_auction_sweep()');
