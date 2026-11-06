create or replace function public.apply_fixture_regeneration(
  p_event_id bigint,
  p_start_round integer,
  p_expected_match_ids bigint[],
  p_team_start_updates jsonb,
  p_matches jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_match_ids bigint[];
  expected_match_ids bigint[];
  cancelled_count integer;
  inserted_count integer;
  reused_count integer;
  updated_team_count integer;
  requested_team_count integer;
  requested_insert_count integer;
  requested_reuse_count integer;
  next_pos integer;
  next_num integer;
begin
  if p_start_round is null or p_start_round < 1 then
    raise exception 'The fixture start round must be a positive integer.';
  end if;

  if p_team_start_updates is null or jsonb_typeof(p_team_start_updates) <> 'array' then
    raise exception 'Team start updates must be a JSON array.';
  end if;

  if p_matches is null or jsonb_typeof(p_matches) <> 'array' then
    raise exception 'Planned matches must be a JSON array.';
  end if;

  perform e.id from public.events e where e.id = p_event_id for share;
  if not found then
    raise exception 'Event % was not found.', p_event_id;
  end if;

  perform et.id
  from public.event_teams et
  where et.event_id = p_event_id
  for update;

  perform m.id
  from public.matches m
  where m.event_id = p_event_id
    and (m.stage_type = 'league' or m.stage_type is null)
  for update;

  -- Scheduled, unscored regular matches are the only replaceable records. The
  -- complete id set is compared with the preview so a newly-started match makes
  -- the transaction abort instead of losing its result.
  select coalesce(array_agg(m.id order by m.id), array[]::bigint[])
  into current_match_ids
  from public.matches m
  where m.event_id = p_event_id
    and (m.stage_type = 'league' or m.stage_type is null)
    and not coalesce(m.is_extra, false)
    and m.status = 'scheduled'
    and m.score1 is null
    and m.score2 is null;

  select coalesce(array_agg(match_id order by match_id), array[]::bigint[])
  into expected_match_ids
  from unnest(coalesce(p_expected_match_ids, array[]::bigint[])) match_id;

  if current_match_ids is distinct from expected_match_ids then
    raise exception 'The scheduled fixture changed after the preview. Reload it and try again.';
  end if;

  requested_team_count := jsonb_array_length(p_team_start_updates);
  update public.event_teams et
  set fixture_start_round = team_update.to_round
  from jsonb_to_recordset(p_team_start_updates) as team_update(
    event_team_id bigint,
    from_round integer,
    to_round integer
  )
  where et.id = team_update.event_team_id
    and et.event_id = p_event_id
    and et.fixture_start_round = team_update.from_round
    and team_update.to_round >= 1;
  get diagnostics updated_team_count = row_count;

  if updated_team_count <> requested_team_count then
    raise exception 'Team participation changed after the preview. Reload it and try again.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_matches) as planned(
      match_id bigint,
      team1_id bigint,
      team2_id bigint,
      group_id bigint,
      round_number integer,
      match_date date,
      match_time time,
      field_id bigint,
      field_number integer
    )
    where planned.team1_id is null
      or planned.team2_id is null
      or planned.team1_id = planned.team2_id
      or planned.round_number < 1
      or not exists (
        select 1 from public.event_teams et
        where et.event_id = p_event_id
          and et.team_id = planned.team1_id
          and et.status = 'active'
          and et.fixture_start_round <= planned.round_number
      )
      or not exists (
        select 1 from public.event_teams et
        where et.event_id = p_event_id
          and et.team_id = planned.team2_id
          and et.status = 'active'
          and et.fixture_start_round <= planned.round_number
      )
  ) then
    raise exception 'The planned fixture contains an ineligible team or invalid round.';
  end if;

  select count(*) filter (where planned.match_id is null),
         count(*) filter (where planned.match_id is not null)
  into requested_insert_count, requested_reuse_count
  from jsonb_to_recordset(p_matches) as planned(match_id bigint);

  if exists (
    select 1
    from jsonb_to_recordset(p_matches) as planned(match_id bigint)
    where planned.match_id is not null
    group by planned.match_id
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_to_recordset(p_matches) as planned(match_id bigint)
    where planned.match_id is not null
      and not (planned.match_id = any(current_match_ids))
  ) then
    raise exception 'The planned fixture contains an invalid or repeated reusable match.';
  end if;

  -- Validate planned matches together with every immutable result. This permits
  -- moving old scheduled rows while still preventing a team from playing twice
  -- in a round that already contains a played or scored match.
  if exists (
    with planned_participants as (
      select
        planned.round_number,
        planned.group_id,
        participant.team_id
      from jsonb_to_recordset(p_matches) as planned(
        match_id bigint,
        team1_id bigint,
        team2_id bigint,
        group_id bigint,
        round_number integer,
        match_date date,
        match_time time,
        field_id bigint,
        field_number integer
      )
      cross join lateral (values (planned.team1_id), (planned.team2_id)) participant(team_id)
    )
    select 1
    from planned_participants planned
    where exists (
      select 1
      from public.matches m
      where m.event_id = p_event_id
        and (m.stage_type = 'league' or m.stage_type is null)
        and m.status is distinct from 'cancelled'
        and not coalesce(m.is_extra, false)
        and not (m.status = 'scheduled' and m.score1 is null and m.score2 is null)
        and m.round_number = planned.round_number
        and m.group_id is not distinct from planned.group_id
        and (m.team1_id = planned.team_id or m.team2_id = planned.team_id)
    )
    or exists (
      with planned_participants as (
        select
          planned.round_number,
          planned.group_id,
          participant.team_id
        from jsonb_to_recordset(p_matches) as planned(
          match_id bigint,
          team1_id bigint,
          team2_id bigint,
          group_id bigint,
          round_number integer,
          match_date date,
          match_time time,
          field_id bigint,
          field_number integer
        )
        cross join lateral (values (planned.team1_id), (planned.team2_id)) participant(team_id)
      )
      select 1
      from planned_participants
      group by round_number, group_id, team_id
      having count(*) > 1
    )
  ) then
    raise exception 'A team cannot be scheduled more than once in the same round and group.';
  end if;

  update public.matches m
  set
    team1_id = planned.team1_id,
    team2_id = planned.team2_id,
    group_id = planned.group_id,
    round_id = null,
    round_number = planned.round_number,
    date = planned.match_date,
    time = planned.match_time,
    field_id = planned.field_id,
    field_number = planned.field_number,
    stage_type = 'league',
    is_extra = false
  from jsonb_to_recordset(p_matches) as planned(
    match_id bigint,
    team1_id bigint,
    team2_id bigint,
    group_id bigint,
    round_number integer,
    match_date date,
    match_time time,
    field_id bigint,
    field_number integer
  )
  where planned.match_id is not null
    and m.id = planned.match_id
    and m.event_id = p_event_id
    and (m.stage_type = 'league' or m.stage_type is null)
    and not coalesce(m.is_extra, false)
    and m.status = 'scheduled'
    and m.score1 is null
    and m.score2 is null;
  get diagnostics reused_count = row_count;

  if reused_count <> requested_reuse_count then
    raise exception 'One or more scheduled matches could not be reused.';
  end if;

  update public.matches m
  set status = 'cancelled'
  where m.event_id = p_event_id
    and (m.stage_type = 'league' or m.stage_type is null)
    and not coalesce(m.is_extra, false)
    and m.status = 'scheduled'
    and m.score1 is null
    and m.score2 is null
    and not exists (
      select 1
      from jsonb_to_recordset(p_matches) as planned(match_id bigint)
      where planned.match_id = m.id
    );
  get diagnostics cancelled_count = row_count;

  select coalesce(max(m.pos), 0) + 1, coalesce(max(m.num), 0) + 1
  into next_pos, next_num
  from public.matches m
  where m.event_id = p_event_id;

  insert into public.matches (
    event_id, pos, num, team1_id, team2_id, group_id, round_id,
    round_number, status, date, time, field_id, field_number, stage_type, is_extra
  )
  select
    p_event_id,
    next_pos + row_number() over (order by planned.round_number, planned.group_id nulls first) - 1,
    next_num + row_number() over (order by planned.round_number, planned.group_id nulls first) - 1,
    planned.team1_id,
    planned.team2_id,
    planned.group_id,
    null,
    planned.round_number,
    'scheduled',
    planned.match_date,
    planned.match_time,
    planned.field_id,
    planned.field_number,
    'league',
    false
  from jsonb_to_recordset(p_matches) as planned(
    match_id bigint,
    team1_id bigint,
    team2_id bigint,
    group_id bigint,
    round_number integer,
    match_date date,
    match_time time,
    field_id bigint,
    field_number integer
  )
  where planned.match_id is null;
  get diagnostics inserted_count = row_count;

  if inserted_count <> requested_insert_count then
    raise exception 'Atomic fixture reconciliation inserted an unexpected number of matches.';
  end if;

  update public.fixture_pending_assignments
  set status = 'cancelled'
  where event_id = p_event_id and status = 'pending';

  return jsonb_build_object(
    'cancelled_match_count', cancelled_count,
    'inserted_match_count', inserted_count,
    'reused_match_count', reused_count,
    'updated_team_count', updated_team_count
  );
end
$$;

revoke all on function public.apply_fixture_regeneration(bigint, integer, bigint[], jsonb, jsonb) from public;
grant execute on function public.apply_fixture_regeneration(bigint, integer, bigint[], jsonb, jsonb) to authenticated;
grant execute on function public.apply_fixture_regeneration(bigint, integer, bigint[], jsonb, jsonb) to service_role;
