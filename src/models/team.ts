"use client";

export type Team = {
  id: number;
  key: string;
  name: string;
  code: string | null;
  country_id: number | null;
  city_id: number | null;
  club: boolean;
  national: boolean;
  created_at: string;
  updated_at: string;
};

export type TeamFormData = {
  key: string;
  name: string;
  code: string;
  club: boolean;
  national: boolean;
};