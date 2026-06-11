alter table public.event_membership_payments
  add column if not exists fee_amount numeric(10, 2) not null default 0,
  add column if not exists net_amount numeric(10, 2);

update public.event_membership_payments
set net_amount = amount - fee_amount
where net_amount is null;

alter table public.event_membership_payments
  alter column net_amount set not null;
