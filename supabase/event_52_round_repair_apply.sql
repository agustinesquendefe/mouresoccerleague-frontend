-- Transactional round-number repair for event 52.
-- Preconditions:
--   1. event_repair_backup.matches_event_52_20261028 exists.
--   2. The event has not changed since that snapshot was created.
-- Only public.matches.round_number is updated.
BEGIN;

LOCK TABLE public.matches IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  difference_count integer;
BEGIN
  IF TO_REGCLASS('event_repair_backup.matches_event_52_20261028') IS NULL THEN
    RAISE EXCEPTION 'Required event 52 backup table does not exist.';
  END IF;

  IF TO_REGCLASS('event_repair_backup.event_52_round_mapping_20261028') IS NOT NULL THEN
    RAISE EXCEPTION 'The event 52 repair mapping already exists; refusing to run twice.';
  END IF;

  IF TO_REGCLASS('event_repair_backup.event_52_proposed_rounds_20261028') IS NOT NULL THEN
    RAISE EXCEPTION 'The event 52 staging table already exists; refusing to run twice.';
  END IF;

  SELECT COUNT(*) INTO difference_count
  FROM (
    (
      SELECT * FROM public.matches WHERE event_id = 52
      EXCEPT
      SELECT * FROM event_repair_backup.matches_event_52_20261028
    )
    UNION ALL
    (
      SELECT * FROM event_repair_backup.matches_event_52_20261028
      EXCEPT
      SELECT * FROM public.matches WHERE event_id = 52
    )
  ) differences;

  IF difference_count <> 0 THEN
    RAISE EXCEPTION
      'Event 52 changed after its backup was created (% differing rows). Repair aborted.',
      difference_count;
  END IF;
END
$$;

CREATE TABLE event_repair_backup.event_52_proposed_rounds_20261028 AS
WITH RECURSIVE
ranked_event_teams AS (
  SELECT
    et.team_id,
    et.status,
    ROW_NUMBER() OVER (ORDER BY et.order_index, et.id) AS roster_position
  FROM public.event_teams et
  WHERE et.event_id = 52
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
    base_round AS proposed_round
  FROM complete_base_fixture

  UNION ALL

  SELECT
    first_leg_team2_id AS team1_id,
    first_leg_team1_id AS team2_id,
    base_round + 15 AS proposed_round
  FROM complete_base_fixture
),
current_fixture AS (
  SELECT m.*
  FROM public.matches m
  JOIN active_teams t1 ON t1.team_id = m.team1_id
  JOIN active_teams t2 ON t2.team_id = m.team2_id
  WHERE
    m.event_id = 52
    AND (m.stage_type = 'league' OR m.stage_type IS NULL)
    AND m.status <> 'cancelled'
    AND NOT COALESCE(m.is_extra, false)
)
SELECT
  m.id AS match_id,
  m.round_number AS old_round,
  expected.proposed_round AS new_round,
  m.status,
  m.team1_id,
  m.team2_id
FROM current_fixture m
JOIN expected_fixture expected
  ON expected.team1_id = m.team1_id
  AND expected.team2_id = m.team2_id;

ALTER TABLE event_repair_backup.event_52_proposed_rounds_20261028
ADD PRIMARY KEY (match_id);

DO $$
DECLARE
  mapping_count integer;
  distinct_match_count integer;
  invalid_round_count integer;
  invalid_round_size_count integer;
BEGIN
  SELECT
    COUNT(*),
    COUNT(DISTINCT match_id),
    COUNT(*) FILTER (WHERE new_round NOT BETWEEN 1 AND 30)
  INTO mapping_count, distinct_match_count, invalid_round_count
  FROM event_repair_backup.event_52_proposed_rounds_20261028;

  SELECT COUNT(*) INTO invalid_round_size_count
  FROM (
    SELECT new_round
    FROM event_repair_backup.event_52_proposed_rounds_20261028
    GROUP BY new_round
    HAVING COUNT(*) <> 7
  ) invalid_rounds;

  IF mapping_count <> 210 OR distinct_match_count <> 210 THEN
    RAISE EXCEPTION
      'Expected 210 unique mapped matches; found % rows and % unique matches.',
      mapping_count,
      distinct_match_count;
  END IF;

  IF invalid_round_count <> 0 OR invalid_round_size_count <> 0 THEN
    RAISE EXCEPTION
      'Invalid proposed fixture: % out-of-range matches and % malformed rounds.',
      invalid_round_count,
      invalid_round_size_count;
  END IF;
END
$$;

CREATE TABLE event_repair_backup.event_52_round_mapping_20261028 AS
SELECT
  NOW() AS applied_at,
  match_id,
  old_round,
  new_round,
  status,
  team1_id,
  team2_id
FROM event_repair_backup.event_52_proposed_rounds_20261028
WHERE old_round IS DISTINCT FROM new_round;

ALTER TABLE event_repair_backup.event_52_round_mapping_20261028
ADD PRIMARY KEY (match_id);

UPDATE public.matches m
SET round_number = proposed.new_round
FROM event_repair_backup.event_52_proposed_rounds_20261028 proposed
WHERE
  m.id = proposed.match_id
  AND m.event_id = 52
  AND m.round_number IS DISTINCT FROM proposed.new_round;

DO $$
DECLARE
  remaining_mismatches integer;
  changed_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_mismatches
  FROM event_repair_backup.event_52_proposed_rounds_20261028 proposed
  JOIN public.matches m ON m.id = proposed.match_id
  WHERE m.round_number IS DISTINCT FROM proposed.new_round;

  SELECT COUNT(*) INTO changed_count
  FROM event_repair_backup.event_52_round_mapping_20261028;

  IF remaining_mismatches <> 0 THEN
    RAISE EXCEPTION
      'Post-update verification failed: % matches have the wrong round.',
      remaining_mismatches;
  END IF;

  IF changed_count <> 197 THEN
    RAISE EXCEPTION
      'Expected to change 197 matches; repair log contains %.',
      changed_count;
  END IF;
END
$$;

COMMIT;

SELECT
  COUNT(*) AS changed_matches,
  COUNT(*) FILTER (WHERE status = 'played') AS changed_played_matches,
  COUNT(*) FILTER (WHERE status = 'scheduled') AS changed_scheduled_matches,
  MIN(new_round) AS minimum_new_round,
  MAX(new_round) AS maximum_new_round
FROM event_repair_backup.event_52_round_mapping_20261028;
