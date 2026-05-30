alter table public.team_playing_days enable row level security;

create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'editor')
  );
$$;

drop policy if exists "team_playing_days_select" on public.team_playing_days;
drop policy if exists "team_playing_days_insert_admin_editor" on public.team_playing_days;
drop policy if exists "team_playing_days_update_admin_editor" on public.team_playing_days;
drop policy if exists "team_playing_days_delete_admin_editor" on public.team_playing_days;

create policy "team_playing_days_select"
on public.team_playing_days
for select
to anon, authenticated
using (true);

create policy "team_playing_days_insert_admin_editor"
on public.team_playing_days
for insert
to authenticated
with check (public.is_admin_or_editor());

create policy "team_playing_days_update_admin_editor"
on public.team_playing_days
for update
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

create policy "team_playing_days_delete_admin_editor"
on public.team_playing_days
for delete
to authenticated
using (public.is_admin_or_editor());
