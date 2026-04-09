"use client";

export type Team = {
  id: number;
  key: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  category_id: number | null;
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
  logo_url?: string | null;
  category_id?: number | null;
};