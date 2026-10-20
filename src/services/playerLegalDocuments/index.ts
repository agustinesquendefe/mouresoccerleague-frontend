import { supabase } from '@/lib/supabaseClient';
import { PlayerLegalDocument } from '@/models/legalDocument';

// GET
export async function getPlayerLegalDocuments(playerId: string): Promise<PlayerLegalDocument[]> {
  const { data, error } = await supabase
    .from('player_legal_documents')
    .select('*')
    .eq('player_id', playerId);
  if (error) throw error;
  return data as PlayerLegalDocument[];
}

// POST
export async function addPlayerLegalDocument(playerId: string, formData: FormData): Promise<PlayerLegalDocument> {
  // 1. Upload file to storage
  const file = formData.get('file') as File;
  const documentType = formData.get('document_type');
  if (documentType !== 'tutor' && documentType !== 'participant') {
    throw new Error('Invalid player legal document type');
  }

  const filePath = `player-legal-documents/${playerId}/${documentType}_${Date.now()}_${file.name}`;
  const { data: storageData, error: storageError } = await supabase.storage
    .from('player-legal-documents')
    .upload(filePath, file, { upsert: true });
  if (storageError) throw storageError;

  // 2. Insert metadata in table
  const insertPayload = {
    player_id: playerId,
    document_type: documentType,
    file_url: storageData.path,
    uploaded_by: formData.get('uploaded_by'),
    date: formData.get('date'),
    status: formData.get('status'),
  };
  const { data, error } = await supabase
    .from('player_legal_documents')
    .insert([insertPayload])
    .select()
    .single();
  if (error) throw error;
  return data as PlayerLegalDocument;
}

// PUT
export async function updatePlayerLegalDocument(id: string, formData: FormData): Promise<PlayerLegalDocument> {
  // Similar to POST, but update the row and optionally replace the file
  // ...implement logic as needed...
  return {} as PlayerLegalDocument;
}

// DELETE
export async function deletePlayerLegalDocument(id: string): Promise<void> {
  // Optionally: fetch file_url and delete from storage
  await supabase
    .from('player_legal_documents')
    .delete()
    .eq('id', id);
}
