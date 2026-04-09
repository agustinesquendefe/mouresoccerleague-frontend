"use client";

export type Player = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  key: string;
  birth_date: string | null;
  jersey_number: number | null;
  phone: string | null;
  email: string | null;
  document_id: string | null;
  is_active: boolean;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerFormData = {
  first_name: string;
  last_name: string;
  key: string;
  birth_date: string;
  jersey_number: number | null;
  phone: string;
  email: string;
  document_id: string;
  is_active: boolean;
  notes: string;
  photo_url: string | null;
};