alter table public.event_teams
add column if not exists display_name text;

create index if not exists event_teams_event_id_team_id_display_name_idx
on public.event_teams (event_id, team_id)
where display_name is not null;
