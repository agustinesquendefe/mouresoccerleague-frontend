-- Read-only preview for repairing the regular fixture of event 52.
-- This statement does not update, insert, or delete data.
WITH RECURSIVE
params AS (
  SELECT 52::bigint AS event_id
),
ranked_event_teams AS (
  SELECT
    et.team_id,
    et.status,
    ROW_NUMBER() OVER (ORDER BY et.order_index, et.id) AS roster_position
  FROM public.event_teams et
  JOIN params p ON p.event_id = et.event_id
),
original_team_order AS (
  SELECT ARRAY_AGG(team_id ORDER BY roster_position) AS team_ids
  FROM ranked_event_teams
  WHERE roster_position <= 16
),
active_teams AS (
  SELECT team_id
  FROM ranked_event_teams
  WHERE status = 'active'
),
fixture_setup AS (
  SELECT
    team_ids AS initial_rotation,
    ARRAY_LENGTH(team_ids, 1) AS team_slots
  FROM original_team_order
),
rotations (base_round, rotation, team_slots) AS (
  SELECT 1, initial_rotation, team_slots
  FROM fixture_setup

  UNION ALL

  SELECT
    r.base_round + 1,
    ARRAY[r.rotation[1], r.rotation[r.team_slots]] || r.rotation[2:r.team_slots - 1],
    r.team_slots
  FROM rotations r
  WHERE r.base_round < r.team_slots - 1
),
original_base_fixture AS (
  SELECT
    r.base_round,
    r.rotation[pair_index] AS first_leg_team1_id,
    r.rotation[r.team_slots - pair_index + 1] AS first_leg_team2_id
  FROM rotations r
  CROSS JOIN LATERAL GENERATE_SERIES(1, r.team_slots / 2) AS pairs(pair_index)
),
original_active_pairs AS (
  SELECT
    f.first_leg_team1_id,
    f.first_leg_team2_id,
    f.base_round
  FROM original_base_fixture f
  JOIN active_teams t1 ON t1.team_id = f.first_leg_team1_id
  JOIN active_teams t2 ON t2.team_id = f.first_leg_team2_id
),
-- Completion of the original fixture after Liverpool, Inter FC, and Deportivo FC
-- replaced the four participants that are no longer active. Repeated teams in a
-- round are permitted by the business rules, although this completion does not
-- require any repeated participant.
added_pair_assignments (first_leg_team1_id, first_leg_team2_id, base_round) AS (
  VALUES
    (112, 35, 1),
    (249, 38, 1),
    (227, 236, 1),
    (236, 31, 2),
    (249, 112, 2),
    (236, 216, 3),
    (227, 112, 3),
    (249, 27, 4),
    (216, 112, 4),
    (236, 233, 4),
    (112, 71, 5),
    (236, 210, 5),
    (233, 249, 5),
    (249, 31, 6),
    (35, 236, 6),
    (210, 112, 6),
    (31, 112, 7),
    (249, 218, 7),
    (236, 27, 8),
    (227, 249, 8),
    (72, 236, 9),
    (216, 249, 9),
    (112, 231, 9),
    (38, 236, 10),
    (72, 249, 10),
    (233, 112, 10),
    (112, 38, 11),
    (249, 210, 11),
    (218, 236, 11),
    (112, 218, 12),
    (236, 249, 12),
    (112, 236, 13),
    (231, 249, 13),
    (27, 112, 14),
    (71, 249, 14),
    (231, 236, 14),
    (35, 249, 15),
    (71, 236, 15),
    (112, 72, 15)
),
complete_base_fixture AS (
  SELECT * FROM original_active_pairs
  UNION ALL
  SELECT * FROM added_pair_assignments
),
expected_fixture AS (
  SELECT
    first_leg_team1_id AS team1_id,
    first_leg_team2_id AS team2_id,
    base_round AS proposed_round,
    1 AS proposed_cycle
  FROM complete_base_fixture

  UNION ALL

  SELECT
    first_leg_team2_id AS team1_id,
    first_leg_team1_id AS team2_id,
    base_round + 15 AS proposed_round,
    2 AS proposed_cycle
  FROM complete_base_fixture
),
current_fixture AS (
  SELECT m.*
  FROM public.matches m
  JOIN params p ON p.event_id = m.event_id
  JOIN active_teams t1 ON t1.team_id = m.team1_id
  JOIN active_teams t2 ON t2.team_id = m.team2_id
  WHERE
    (m.stage_type = 'league' OR m.stage_type IS NULL)
    AND m.status <> 'cancelled'
    AND NOT COALESCE(m.is_extra, false)
),
preview AS (
  SELECT
    m.id AS match_id,
    m.round_number AS current_round,
    expected.proposed_round,
    expected.proposed_cycle,
    m.team1_id,
    team1.name AS team1,
    m.team2_id,
    team2.name AS team2,
    m.status,
    m.score1,
    m.score2,
    m.winner_team_id,
    m.date,
    m.rescheduled_from_date,
    m.time,
    m.field_id,
    m.field_number,
    m.pos,
    m.num
  FROM current_fixture m
  LEFT JOIN expected_fixture expected
    ON expected.team1_id = m.team1_id
    AND expected.team2_id = m.team2_id
  LEFT JOIN public.teams team1 ON team1.id = m.team1_id
  LEFT JOIN public.teams team2 ON team2.id = m.team2_id
)
SELECT
  COUNT(*) OVER () AS preview_match_count,
  COUNT(*) FILTER (WHERE proposed_round IS NULL) OVER () AS unmapped_match_count,
  COUNT(*) OVER (PARTITION BY proposed_round) AS matches_in_proposed_round,
  match_id,
  current_round,
  proposed_round,
  proposed_cycle,
  CASE
    WHEN proposed_round IS NULL THEN 'UNMAPPED'
    WHEN current_round = proposed_round THEN 'NO CHANGE'
    ELSE 'WOULD MOVE'
  END AS change_status,
  team1_id,
  team1,
  team2_id,
  team2,
  status,
  score1,
  score2,
  winner_team_id,
  date,
  rescheduled_from_date,
  time,
  field_id,
  field_number,
  pos,
  num
FROM preview
ORDER BY proposed_round NULLS LAST, match_id;
