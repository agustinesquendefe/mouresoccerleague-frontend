export interface LegalDocument {
  id: string;
  name: string;
  description?: string;
  language: 'es' | 'en';
  type: 'tutor' | 'participant';
  version: string;
  url: string;
  valid_from?: string;
  valid_to?: string;
  created_at: string;
  updated_at: string;
  date: string;
  file: File;
  file_url?: string;
}

export interface PlayerLegalDocument {
  id: string;
  player_id: string;
  legal_document_id: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
  date: string;
  file: File;
  status: 'vigente' | 'vencido';
}
