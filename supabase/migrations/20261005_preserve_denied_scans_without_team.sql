drop index if exists public.scanner_denied_scans_match_team_code_unique;

with duplicate_scans as (
  select
    id,
    row_number() over (
      partition by match_id, scanned_code
      order by validated_at desc, id desc
    ) as duplicate_number
  from public.scanner_denied_scans
)
delete from public.scanner_denied_scans
where id in (
  select id
  from duplicate_scans
  where duplicate_number > 1
);

create unique index if not exists scanner_denied_scans_match_code_unique
  on public.scanner_denied_scans(match_id, scanned_code);
