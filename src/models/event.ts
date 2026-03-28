"use client";

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
  status: string | null;
  format_type: 'round_robin' | 'groups' | 'knockout' | 'mixed';
  round_robin_cycles: number;
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
  status: string;
  format_type: 'round_robin' | 'groups' | 'knockout' | 'mixed';
  round_robin_cycles: number;
};