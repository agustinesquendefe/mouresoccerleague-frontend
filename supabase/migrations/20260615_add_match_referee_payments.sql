create table if not exists public.match_referee_payments (
  id bigserial primary key,
  match_id bigint not null references public.matches(id) on delete cascade,
  team_id bigint not null references public.teams(id) on delete cascade,
  referee_id bigint references public.referees(id) on delete set null,
  payer_player_id bigint references public.players(id) on delete set null,
  payer_document_id text,
  payer_name text,
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  method text check (method in ('stripe', 'cash', 'zelle', 'cashapp', 'venmo')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'waived')),
  reference text,
  note text,
  paid_at timestamptz,
  stripe_checkout_session_id text,
  stripe_fee_amount numeric(10, 2) not null default 0,
  state_fee_amount numeric(10, 2) not null default 0,
  total_fee_amount numeric(10, 2) not null default 0,
  total_paid_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id)
);

create index if not exists match_referee_payments_match_idx
  on public.match_referee_payments (match_id);

create index if not exists match_referee_payments_referee_idx
  on public.match_referee_payments (referee_id);

alter table public.match_referee_payments
  add column if not exists payer_player_id bigint references public.players(id) on delete set null,
  add column if not exists payer_document_id text,
  add column if not exists payer_name text,
  add column if not exists paid_at timestamptz,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_fee_amount numeric(10, 2) not null default 0,
  add column if not exists state_fee_amount numeric(10, 2) not null default 0,
  add column if not exists total_fee_amount numeric(10, 2) not null default 0,
  add column if not exists total_paid_amount numeric(10, 2) not null default 0;
