do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.team_players'::regclass
      and contype = 'u'
      and (
        select array_agg(att.attname order by att.attname)
        from unnest(conkey) as key(attnum)
        join pg_attribute att
          on att.attrelid = conrelid
         and att.attnum = key.attnum
      ) = array['player_id', 'team_id']::name[]
  loop
    execute format('alter table public.team_players drop constraint %I', constraint_row.conname);
  end loop;
end $$;

create unique index if not exists team_players_global_roster_unique
  on public.team_players (team_id, player_id)
  where event_id is null;

create unique index if not exists team_players_event_roster_unique
  on public.team_players (event_id, team_id, player_id)
  where event_id is not null;

create index if not exists team_players_event_team_active_idx
  on public.team_players (event_id, team_id, is_active);
