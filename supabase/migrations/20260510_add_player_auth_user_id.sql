alter table public.players
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists players_auth_user_id_unique
  on public.players(auth_user_id)
  where auth_user_id is not null;
