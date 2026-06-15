create table if not exists public.referee_payment_checkout_links (
  id bigserial primary key,
  code text not null unique,
  checkout_url text not null,
  stripe_checkout_session_id text not null,
  match_id bigint not null references public.matches(id) on delete cascade,
  team_id bigint not null references public.teams(id) on delete cascade,
  expires_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists referee_payment_checkout_links_code_idx
  on public.referee_payment_checkout_links (code);

create index if not exists referee_payment_checkout_links_session_idx
  on public.referee_payment_checkout_links (stripe_checkout_session_id);
