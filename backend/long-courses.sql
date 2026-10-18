-- Add course IDs 15 and 16 without changing any scores or record keys.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
alter table public.golf_rounds drop constraint if exists golf_rounds_course_check;
alter table public.golf_rounds add constraint golf_rounds_course_check
 check ((mode='mini' and course between 0 and 4) or (mode='golf' and course between 0 and 16)) not valid;
alter table public.golf_rounds validate constraint golf_rounds_course_check;
commit;
