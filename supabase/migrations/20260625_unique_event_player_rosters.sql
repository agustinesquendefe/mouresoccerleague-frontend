create unique index if not exists team_players_event_player_unique
  on public.team_players (event_id, player_id)
  where event_id is not null;
