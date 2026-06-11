alter table public.app_settings
  add column if not exists payment_order_email text;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  checkout_session_id text,
  status text not null default 'processing',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_checkout_session_id_idx
  on public.stripe_webhook_events (checkout_session_id);
