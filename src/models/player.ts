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
  we_have_id: boolean;
  paid_membership: number;
  registered_at: string;
  signature: string | null;
  tutor_document_url: string | null;
  participant_document_url: string | null;
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
  we_have_id?: boolean;
  paid_membership?: number;
  registered_at?: string;
  signature?: string;
  tutor_document_url?: string | null;
  participant_document_url?: string | null;
};