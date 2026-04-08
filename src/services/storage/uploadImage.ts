import { supabase } from '@/lib/supabaseClient';

type UploadImageParams = {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
};

export async function uploadImage({
  bucket,
  path,
  file,
  upsert = true,
}: UploadImageParams) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '0',
      upsert,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    publicUrl: `${data.publicUrl}?t=${Date.now()}`,
  };
}