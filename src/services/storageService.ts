import { supabase } from '@/lib/supabase';

/**
 * Uploads a file to Supabase Storage with smart bucket fallback and sanitized paths.
 * @param file The file to upload
 * @param bucket The bucket to upload to (defaults to 'uploads')
 * @returns Promise with the public download URL, original filename, and active bucket
 */
export const uploadFile = async (
  file: File | Blob,
  bucket: string = 'uploads'
): Promise<{ url: string; fileName: string; bucket: string }> => {
  // Determine filename
  let fileName = 'document.pdf';
  if (file instanceof File) {
    fileName = file.name;
  }

  // Check if file is empty
  if (file.size === 0) {
    console.error("[StorageService] Le fichier est vide.");
    throw new Error("Le fichier que vous essayez d'envoyer est vide.");
  }

  // Candidate buckets in fallback order
  const candidateBuckets = Array.from(new Set([bucket, 'uploads', 'documents', 'assignments', 'videos']));

  // Sanitize filename
  const sanitizedFileName = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');

  const filePath = `${Date.now()}_${sanitizedFileName}`;

  let lastError: any = null;

  for (const targetBucket of candidateBuckets) {
    try {
      console.log(`[StorageService] Tentative d'upload vers Supabase (bucket: "${targetBucket}", path: "${filePath}")`);
      const { data, error } = await supabase.storage
        .from(targetBucket)
        .upload(filePath, file, { upsert: true });

      if (error) {
        console.warn(`[StorageService] Échec sur bucket "${targetBucket}":`, error.message);
        lastError = error;
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(targetBucket)
        .getPublicUrl(filePath);

      console.log(`[StorageService] ✅ Upload réussi sur Supabase (bucket: "${targetBucket}"):`, publicUrlData.publicUrl);

      return {
        url: publicUrlData.publicUrl,
        fileName,
        bucket: targetBucket,
      };
    } catch (err: any) {
      console.warn(`[StorageService] Exception sur bucket "${targetBucket}":`, err.message);
      lastError = err;
    }
  }

  console.error(`[StorageService] Tous les buckets Supabase ont échoué. Dernier message:`, lastError?.message);
  throw new Error(`Erreur Supabase Storage: ${lastError?.message || "Impossible d'enregistrer le fichier sur les buckets Supabase."}`);
};

/**
 * Returns a direct download URL for a file stored on Supabase Storage
 */
export const getSupabaseDownloadUrl = (rawUrl: string, fileName?: string): string => {
  if (!rawUrl) return '';
  if (rawUrl.includes('supabase.co') && !rawUrl.includes('?download=')) {
    return `${rawUrl}?download=${encodeURIComponent(fileName || 'document')}`;
  }
  return rawUrl;
};

