import { supabase } from '@/lib/supabaseClient';
import { LegalDocument } from '@/models/legalDocument';

// GET /legal-documents
export async function getLegalDocuments(): Promise<LegalDocument[]> {
  const { data, error } = await supabase
    .from('legal_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as LegalDocument[];
}

// POST /legal-documents
export async function createLegalDocument(formData: FormData): Promise<LegalDocument> {
  const file = formData.get('file') as File;

  const filePath = `documents/${Date.now()}_${file.name}`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from('legal-documents')
    .upload(filePath, file, { upsert: true });

  if (storageError) throw storageError;

  const { data, error } = await supabase
    .from('legal_documents')
    .insert([
      {
        name: formData.get('name'),
        description: formData.get('description'),
        language: formData.get('language'),
        type: formData.get('type'),
        version: formData.get('version'),
        file_url: storageData.path, // guarda solo el path interno
        date: formData.get('date'),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as LegalDocument;
}

// PUT /legal-documents/:id
export async function updateLegalDocument(id: string, formData: FormData): Promise<LegalDocument> {
  let file_url = formData.get('file_url');
  const file = formData.get('file') as File | null;

  if (file) {
    const filePath = `documents/${Date.now()}_${file.name}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('legal-documents')
      .upload(filePath, file, { upsert: true });

    if (storageError) throw storageError;

    file_url = storageData.path; // solo path interno
  }

  const { data, error } = await supabase
    .from('legal_documents')
    .update({
      name: formData.get('name'),
      description: formData.get('description'),
      language: formData.get('language'),
      type: formData.get('type'),
      version: formData.get('version'),
      file_url,
      date: formData.get('date'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as LegalDocument;
}

// DELETE /legal-documents/:id
export async function deleteLegalDocument(id: string): Promise<void> {
  await supabase
    .from('legal_documents')
    .delete()
    .eq('id', id);
}