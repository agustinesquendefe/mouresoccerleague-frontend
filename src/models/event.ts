"use client";

export type EventFormatType = 'round_robin' | 'groups' | 'knockout' | 'mixed';
export type EventStatus = 'draft' | 'active' | 'completed' | 'archived';
export type VenueType = 'inside' | 'outside';

export type Event = {
  id: number;
  key: string;
  name: string | null;
  league_id: number;
  season_id: number;
  category_id: number | null;
  start_date: string;
  end_date: string | null;
  num: number | null;
  auto: boolean;
  status: EventStatus | null;
  format_type: EventFormatType;
  round_robin_cycles: number;
  match_day_of_week: number | null;
  match_format: string | null;
  venue_type: VenueType | null;
  field_count: number | null;
  match_duration_minutes: number | null;
  simultaneous_matches: boolean;

  has_playoffs: boolean;
  playoff_teams_count: number | null;
  playoff_home_away: boolean;

  group_count: number | null;


  points_win: number | null;
  points_draw: number | null;
  points_loss: number | null;
  created_at: string;
  updated_at: string;
};

export type EventFormData = {
  key: string;
  name: string;
  season_id: number;
  category_id: number | null;
  start_date: string;
  end_date: string;
  auto: boolean;
  status: EventStatus;
  format_type: EventFormatType;
  round_robin_cycles: number;
  match_day_of_week: number;
  match_format: string;
  venue_type: VenueType;
  field_count: number;
  match_duration_minutes: number;
  simultaneous_matches: boolean;

  has_playoffs: boolean;
  playoff_teams_count: number | null;
  playoff_home_away: boolean;

  group_count: number | null;
  points_win?: number | null;
  points_draw?: number | null;
  points_loss?: number | null;
};