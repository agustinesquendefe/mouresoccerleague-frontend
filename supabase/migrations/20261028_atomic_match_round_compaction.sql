create or replace function public.apply_match_round_compaction(
  p_event_id bigint,
  p_updates jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  requested_count integer;
  matched_count integer;
  updated_count integer;
  expected_round_count integer;
  event_format text;
  event_cycles integer;
begin
  if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
    raise exception 'Compaction updates must be a JSON array.';
  end if;

  requested_count := jsonb_array_length(p_updates);
  if requested_count = 0 then
    return 0;
  end if;

  select e.format_type, greatest(coalesce(e.round_robin_cycles, 1), 1)
  into event_format, event_cycles
  from public.events e
  where e.id = p_event_id
  for share;

  if event_format is null then
    raise exception 'Event % was not found.', p_event_id;
  end if;

  perform et.id
  from public.event_teams et
  where et.event_id = p_event_id
  for share;

  if event_format = 'round_robin' then
    select case
      when count(distinct et.team_id) < 2 then 0
      when mod(count(distinct et.team_id), 2) = 0 then
        (count(distinct et.team_id) - 1) * event_cycles
      else count(distinct et.team_id) * event_cycles
    end::integer
    into expected_round_count
    from public.event_teams et
    where et.event_id = p_event_id and et.status = 'active';
  elsif event_format = 'groups' then
    select coalesce(max(
      case
        when grouped.team_count < 2 then 0
        when mod(grouped.team_count, 2) = 0 then (grouped.team_count - 1) * event_cycles
        else grouped.team_count * event_cycles
      end
    ), 0)::integer
    into expected_round_count
    from (
      select et.group_id, count(distinct et.team_id)::integer as team_count
      from public.event_teams et
      where et.event_id = p_event_id
        and et.status = 'active'
        and et.group_id is not null
      group by et.group_id
    ) grouped;
  else
    raise exception 'Event format % cannot be compacted.', event_format;
  end if;

  if expected_round_count = 0 then
    raise exception 'The event has no valid configured rounds.';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(p_updates) as update_row(
      id bigint,
      from_round integer,
      to_round integer
    )
  ) <> requested_count then
    raise exception 'One or more compaction updates are malformed.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_updates) as update_row(
      id bigint,
      from_round integer,
      to_round integer
    )
    group by update_row.id
    having count(*) > 1
  ) then
    raise exception 'A match cannot appear more than once in a compaction.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_updates) as update_row(
      id bigint,
      from_round integer,
      to_round integer
    )
    where update_row.id is null
      or update_row.from_round is null
      or update_row.to_round is null
      or update_row.from_round <= expected_round_count
      or update_row.to_round not between 1 and expected_round_count
  ) then
    raise exception 'Compaction contains an invalid source or destination round.';
  end if;

  perform m.id
  from public.matches m
  where m.event_id = p_event_id
    and (m.stage_type = 'league' or m.stage_type is null)
  for update;

  if exists (
    select 1
    from public.matches m
    where m.event_id = p_event_id
      and (m.stage_type = 'league' or m.stage_type is null)
      and not coalesce(m.is_extra, false)
      and m.status is distinct from 'cancelled'
      and (m.status in ('played', 'in_progress') or m.score1 is not null or m.score2 is not null)
      and m.round_number > expected_round_count
      and exists (
        select 1 from public.event_teams et
        where et.event_id = p_event_id and et.team_id = m.team1_id and et.status = 'active'
      )
      and exists (
        select 1 from public.event_teams et
        where et.event_id = p_event_id and et.team_id = m.team2_id and et.status = 'active'
      )
  ) then
    raise exception 'A match with a result is outside the configured round range. Review it manually.';
  end if;

  select count(*)
  into matched_count
  from public.matches m
  join jsonb_to_recordset(p_updates) as update_row(
    id bigint,
    from_round integer,
    to_round integer
  ) on update_row.id = m.id
  where m.event_id = p_event_id
    and (m.stage_type = 'league' or m.stage_type is null)
    and m.status = 'scheduled'
    and m.score1 is null
    and m.score2 is null
    and not coalesce(m.is_extra, false)
    and m.round_number = update_row.from_round
    and exists (
      select 1 from public.event_teams et
      where et.event_id = p_event_id and et.team_id = m.team1_id and et.status = 'active'
    )
    and exists (
      select 1 from public.event_teams et
      where et.event_id = p_event_id and et.team_id = m.team2_id and et.status = 'active'
    );

  if matched_count <> requested_count then
    raise exception
      'The fixture changed after preview (% of % matches still qualify).',
      matched_count,
      requested_count;
  end if;

  if exists (
    select 1
    from public.matches locked_match
    join (
      select distinct update_row.to_round
      from jsonb_to_recordset(p_updates) as update_row(
        id bigint,
        from_round integer,
        to_round integer
      )
    ) destinations on destinations.to_round = locked_match.round_number
    where locked_match.event_id = p_event_id
      and (locked_match.stage_type = 'league' or locked_match.stage_type is null)
      and locked_match.status is distinct from 'cancelled'
      and (
        locked_match.status in ('played', 'in_progress')
        or locked_match.score1 is not null
        or locked_match.score2 is not null
      )
  ) then
    raise exception 'A destination round started after the compaction preview. Reload and try again.';
  end if;

  update public.matches m
  set round_number = update_row.to_round
  from jsonb_to_recordset(p_updates) as update_row(
    id bigint,
    from_round integer,
    to_round integer
  )
  where m.id = update_row.id
    and m.event_id = p_event_id
    and (m.stage_type = 'league' or m.stage_type is null)
    and m.status = 'scheduled'
    and m.score1 is null
    and m.score2 is null
    and not coalesce(m.is_extra, false)
    and m.round_number = update_row.from_round;

  get diagnostics updated_count = row_count;
  if updated_count <> requested_count then
    raise exception
      'Atomic compaction updated % of % requested matches.',
      updated_count,
      requested_count;
  end if;

  return updated_count;
end
$$;

revoke all on function public.apply_match_round_compaction(bigint, jsonb) from public;
grant execute on function public.apply_match_round_compaction(bigint, jsonb) to authenticated;
grant execute on function public.apply_match_round_compaction(bigint, jsonb) to service_role;
