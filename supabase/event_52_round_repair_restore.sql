-- Emergency restoration of event 52 round numbers from the verified snapshot.
-- Run only if the applied repair must be reverted.
BEGIN;

LOCK TABLE public.matches IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF TO_REGCLASS('event_repair_backup.matches_event_52_20261028') IS NULL THEN
    RAISE EXCEPTION 'Required event 52 backup table does not exist.';
  END IF;
END
$$;

UPDATE public.matches current_match
SET round_number = backup_match.round_number
FROM event_repair_backup.matches_event_52_20261028 backup_match
WHERE
  current_match.id = backup_match.id
  AND current_match.event_id = 52
  AND current_match.round_number IS DISTINCT FROM backup_match.round_number;

DO $$
DECLARE
  remaining_differences integer;
BEGIN
  SELECT COUNT(*) INTO remaining_differences
  FROM public.matches current_match
  JOIN event_repair_backup.matches_event_52_20261028 backup_match
    ON backup_match.id = current_match.id
  WHERE
    current_match.event_id = 52
    AND current_match.round_number IS DISTINCT FROM backup_match.round_number;

  IF remaining_differences <> 0 THEN
    RAISE EXCEPTION
      'Round restoration failed: % matches still differ from the backup.',
      remaining_differences;
  END IF;
END
$$;

COMMIT;

SELECT
  COUNT(*) AS restored_event_matches,
  MIN(round_number) AS minimum_round,
  MAX(round_number) AS maximum_round
FROM public.matches
WHERE event_id = 52;
