"use client";

export type FieldType = 'inside' | 'outside';
export type FormatSupported = '5v5' | '7v7' | '11v11';

export type FieldFormat = {
  id: number;
  field_id: number;
  format_type: FormatSupported;
};

export type Field = {
  id: number;
  name: string;
  key: string;
  field_type: FieldType;
  is_active: boolean;
  notes: string | null;
  field_formats?: FieldFormat[];
  created_at: string;
  updated_at: string;
};

export type FieldFormData = {
  name: string;
  key: string;
  field_type: FieldType;
  is_active: boolean;
  notes: string;
  supported_formats: FormatSupported[];
};