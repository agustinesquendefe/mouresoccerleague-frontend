alter table public.coaches
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

alter table public.referees
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

update public.players as player
set auth_user_id = auth_user.id
from auth.users as auth_user
where player.auth_user_id is null
  and player.email is not null
  and lower(player.email) = lower(auth_user.email)
  and (
    select count(*)
    from public.players as duplicate
    where lower(duplicate.email) = lower(player.email)
  ) = 1;

update public.coaches as coach
set auth_user_id = auth_user.id
from auth.users as auth_user
where coach.auth_user_id is null
  and coach.email is not null
  and lower(coach.email) = lower(auth_user.email)
  and (
    select count(*)
    from public.coaches as duplicate
    where lower(duplicate.email) = lower(coach.email)
  ) = 1;

update public.referees as referee
set auth_user_id = auth_user.id
from auth.users as auth_user
where referee.auth_user_id is null
  and referee.email is not null
  and lower(referee.email) = lower(auth_user.email)
  and (
    select count(*)
    from public.referees as duplicate
    where lower(duplicate.email) = lower(referee.email)
  ) = 1;

create unique index if not exists coaches_auth_user_id_unique
  on public.coaches(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists referees_auth_user_id_unique
  on public.referees(auth_user_id)
  where auth_user_id is not null;
