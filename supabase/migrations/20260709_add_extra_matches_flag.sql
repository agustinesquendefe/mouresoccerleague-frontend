alter table public.matches
add column if not exists is_extra boolean not null default false;

create index if not exists matches_event_round_extra_idx
  on public.matches (event_id, round_number, is_extra);
