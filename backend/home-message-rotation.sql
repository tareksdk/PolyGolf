-- Dashboard > Table Editor > golf_site_settings > activity.
-- Keep the existing message and styling; -3 degrees preserves its original tilt.
alter table public.golf_site_settings
 add column if not exists home_message_rotation numeric not null default -3
 constraint golf_home_message_rotation_bounds check (home_message_rotation between -180 and 180);
comment on column public.golf_site_settings.home_message_rotation is
 'Home message rotation in degrees, -180 to 180. 0 is straight; negative tilts left, positive tilts right. Updates within 60 seconds.';
