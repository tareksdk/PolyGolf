-- Run once after deploying the updated item catalog / Edge Function.
-- Dashboard > Table Editor > golf_site_settings > activity:
-- home_message: blank hides it; home_message_color: #RRGGBB; home_message_size: 12-40 px.
alter table public.golf_site_settings
 add column if not exists home_message text not null default '' check(char_length(home_message)<=140),
 add column if not exists home_message_color text not null default '#f1d982' check(home_message_color ~ '^#[0-9a-fA-F]{6}$'),
 add column if not exists home_message_size integer not null default 20 check(home_message_size between 12 and 40);
comment on column public.golf_site_settings.home_message is 'Home title splash. Empty text hides it. Changes appear within 60 seconds.';
comment on column public.golf_site_settings.home_message_color is 'Splash text colour, e.g. #F1D982.';
comment on column public.golf_site_settings.home_message_size is 'Splash text size in pixels, 12 to 40.';

-- Permanent seats, rather than count(*) at login. Deletion never frees a seat.
create table if not exists public.golf_founders (
 slot integer primary key check(slot between 1 and 100),
 user_id uuid unique references public.golf_players(id) on delete set null,
 awarded_at timestamptz not null default now()
);
alter table public.golf_founders enable row level security;
revoke all on public.golf_founders from public,anon,authenticated;
grant all on public.golf_founders to service_role;
lock table public.golf_players in share row exclusive mode;
do $$ begin
 if not exists(select 1 from public.golf_founders) then
  insert into public.golf_founders(slot,user_id)
   select row_number() over(order by created_at,id)::integer,id
   from public.golf_players order by created_at,id limit 100;
 end if;
end $$;
update public.golf_players p set
 state=jsonb_set(p.state,'{owned}',coalesce(p.state->'owned','[]'::jsonb)||'["nameplate-og"]'::jsonb),
 revision=p.revision+1
where exists(select 1 from public.golf_founders f where f.user_id=p.id)
 and not coalesce(p.state->'owned','[]'::jsonb) ? 'nameplate-og';

create or replace function public.golf_award_founder() returns trigger
language plpgsql security definer set search_path='' as $$
declare seat integer;
begin
 perform pg_advisory_xact_lock(310,100);
 select coalesce(max(slot),0)+1 into seat from public.golf_founders;
 if seat<=100 then
  insert into public.golf_founders(slot,user_id) values(seat,new.id);
  update public.golf_players set state=jsonb_set(state,'{owned}',coalesce(state->'owned','[]'::jsonb)||'["nameplate-og"]'::jsonb),revision=revision+1 where id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.golf_award_founder() from public,anon,authenticated;
grant execute on function public.golf_award_founder() to service_role;
drop trigger if exists golf_founder_signup on public.golf_players;
create trigger golf_founder_signup after insert on public.golf_players for each row execute function public.golf_award_founder();
