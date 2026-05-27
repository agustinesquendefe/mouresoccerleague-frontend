alter table public.matches
add column if not exists rescheduled_from_date date;

create index if not exists matches_event_id_rescheduled_from_date_idx
on public.matches (event_id, rescheduled_from_date)
where rescheduled_from_date is not null;
