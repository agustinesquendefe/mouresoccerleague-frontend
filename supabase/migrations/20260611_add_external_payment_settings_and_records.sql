alter table public.app_settings
  add column if not exists zelle_enabled boolean not null default false,
  add column if not exists zelle_recipient text,
  add column if not exists venmo_enabled boolean not null default false,
  add column if not exists venmo_recipient text,
  add column if not exists cashapp_enabled boolean not null default false,
  add column if not exists cashapp_recipient text;

create table if not exists public.event_membership_payments (
  id bigserial primary key,
  event_membership_id bigint not null references public.event_memberships(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  method text not null check (method in ('stripe', 'cash', 'zelle', 'venmo', 'cashapp')),
  source text not null check (source in ('admin', 'player_portal', 'stripe_webhook')),
  reference text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists event_membership_payments_membership_idx
  on public.event_membership_payments (event_membership_id);

create index if not exists event_membership_payments_event_player_idx
  on public.event_membership_payments (event_id, player_id);
