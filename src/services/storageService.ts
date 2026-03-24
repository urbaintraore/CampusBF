import { supabase } from '@/lib/supabase';

/**
 * Uploads a file to Supabase Storage.
 * @param file The file to upload
 * @param bucket The bucket to upload to (defaults to 'documents')
 * @returns Promise with the public download URL and original filename
 */
export const uploadFile = async (file: File | Blob, bucket: string = 'documents'): Promise<{ url: string, fileName: string }> => {
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

  console.log(`[StorageService] Tentative d'upload vers Supabase Storage (bucket: ${bucket}) pour: ${fileName} (${file.size} octets)`);

  try {
    // Sanitize filename: remove spaces, special characters, and normalize accented characters
    const sanitizedFileName = fileName
      .normalize('NFD') // Normalize to NFD form to separate accents
      .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
      .replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Replace remaining special chars with underscore
      
    const filePath = `${Date.now()}_${sanitizedFileName}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) {
      console.error("[StorageService] Supabase upload error:", error);
      throw error;
    }

    console.log("[StorageService] Upload successful, getting public URL...");
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    console.log("[StorageService] Public URL generated:", publicUrlData.publicUrl);
    return {
      url: publicUrlData.publicUrl,
      fileName
    };
  } catch (supabaseError: any) {
    console.error("[StorageService] Erreur Supabase Storage:", supabaseError.message, supabaseError);
    throw new Error(`Erreur Supabase: ${supabaseError.message || "Erreur lors de l'upload du fichier."}`);
  }
};
