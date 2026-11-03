alter table public.fixture_pending_assignments enable row level security;

drop policy if exists fixture_pending_assignments_authenticated_select
on public.fixture_pending_assignments;

create policy fixture_pending_assignments_authenticated_select
on public.fixture_pending_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role in ('admin', 'editor', 'viewer')
  )
);

drop policy if exists fixture_pending_assignments_authenticated_insert
on public.fixture_pending_assignments;

create policy fixture_pending_assignments_authenticated_insert
on public.fixture_pending_assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role in ('admin', 'editor')
  )
);

drop policy if exists fixture_pending_assignments_authenticated_update
on public.fixture_pending_assignments;

create policy fixture_pending_assignments_authenticated_update
on public.fixture_pending_assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role in ('admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role in ('admin', 'editor')
  )
);

grant select, insert, update on public.fixture_pending_assignments to authenticated;
grant usage, select on sequence public.fixture_pending_assignments_id_seq to authenticated;
