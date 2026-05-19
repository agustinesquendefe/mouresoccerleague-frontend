create table if not exists public.scanner_denied_scans (
  id bigserial primary key,
  event_id bigint references public.events(id) on delete cascade,
  match_id bigint references public.matches(id) on delete cascade,
  team_id bigint references public.teams(id) on delete cascade,
  player_id bigint references public.players(id) on delete set null,
  scanned_code text not null,
  reason text not null,
  summary text,
  method text not null default 'scanner',
  checks jsonb not null default '[]'::jsonb,
  validated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scanner_denied_scans_match_team_idx
  on public.scanner_denied_scans(match_id, team_id, validated_at desc);

create unique index if not exists scanner_denied_scans_match_team_code_unique
  on public.scanner_denied_scans(match_id, team_id, scanned_code);
