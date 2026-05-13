alter table public.app_settings
  add column if not exists operating_state text default 'NC',
  add column if not exists pass_payment_fees_to_customer boolean not null default true,
  add column if not exists stripe_fee_percentage numeric(6, 3) not null default 2.9,
  add column if not exists stripe_fee_fixed_amount numeric(10, 2) not null default 0.30,
  add column if not exists state_fee_percentage numeric(6, 3) not null default 0,
  add column if not exists state_fee_label text default 'State fee';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_settings_stripe_fee_percentage_nonnegative'
  ) then
    alter table public.app_settings
      add constraint app_settings_stripe_fee_percentage_nonnegative check (stripe_fee_percentage >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'app_settings_stripe_fee_fixed_amount_nonnegative'
  ) then
    alter table public.app_settings
      add constraint app_settings_stripe_fee_fixed_amount_nonnegative check (stripe_fee_fixed_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'app_settings_state_fee_percentage_nonnegative'
  ) then
    alter table public.app_settings
      add constraint app_settings_state_fee_percentage_nonnegative check (state_fee_percentage >= 0);
  end if;
end $$;
