alter table public.event_teams
add column if not exists order_index integer;

with ranked_event_teams as (
  select
    id,
    row_number() over (
      partition by event_id
      order by id
    ) - 1 as next_order_index
  from public.event_teams
)
update public.event_teams as event_teams
set order_index = ranked_event_teams.next_order_index
from ranked_event_teams
where event_teams.id = ranked_event_teams.id
  and event_teams.order_index is null;

alter table public.event_teams
alter column order_index set not null;

create index if not exists event_teams_event_id_order_index_idx
on public.event_teams (event_id, order_index);

create unique index if not exists event_teams_event_id_order_index_unique
on public.event_teams (event_id, order_index);