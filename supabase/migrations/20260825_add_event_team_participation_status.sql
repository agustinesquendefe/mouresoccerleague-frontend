alter table public.event_teams
add column if not exists status text;

update public.event_teams
set status = 'active'
where status is null;

alter table public.event_teams
alter column status set default 'active',
alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_teams_status_check'
      and conrelid = 'public.event_teams'::regclass
  ) then
    alter table public.event_teams
    add constraint event_teams_status_check
    check (status in ('active', 'disqualified'));
  end if;
end $$;

create index if not exists event_teams_event_id_status_idx
on public.event_teams (event_id, status);
