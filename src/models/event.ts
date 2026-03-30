export type EventFormatType = 'round_robin' | 'groups' | 'knockout' | 'mixed';
export type EventStatus = 'draft' | 'active' | 'completed' | 'archived';
export type MatchFormat = '5v5' | '7v7' | '11v11';
export type VenueType = 'inside' | 'outside';

export type Event = {
  id: number;
  key: string;
  name: string | null;
  league_id: number;
  season_id: number;
  start_date: string;
  end_date: string | null;
  num: number | null;
  auto: boolean;
  status: EventStatus | null;
  format_type: EventFormatType;
  round_robin_cycles: number;
  match_day_of_week: number | null;
  match_format: MatchFormat | null;
  venue_type: VenueType | null;
  field_count: number | null;
  match_duration_minutes: number | null;
  simultaneous_matches: boolean;

  has_playoffs: boolean;
  playoff_teams_count: number | null;
  playoff_home_away: boolean;

  created_at: string;
  updated_at: string;
};

export type EventFormData = {
  key: string;
  name: string;
  league_id: number;
  season_id: number;
  start_date: string;
  end_date: string;
  auto: boolean;
  status: EventStatus;
  format_type: EventFormatType;
  round_robin_cycles: number;
  match_day_of_week: number;
  match_format: MatchFormat;
  venue_type: VenueType;
  field_count: number;
  match_duration_minutes: number;
  simultaneous_matches: boolean;

  has_playoffs: boolean;
  playoff_teams_count: number | null;
  playoff_home_away: boolean;
};