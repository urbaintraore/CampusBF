import { supabase } from '@/lib/supabase';

/**
 * Uploads a file to Supabase Storage.
 * @param file The file to upload
 * @returns Promise with the public download URL and original filename
 */
export const uploadFile = async (file: File | Blob): Promise<{ url: string, fileName: string }> => {
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

  console.log(`[StorageService] Tentative d'upload vers Supabase Storage pour: ${fileName} (${file.size} octets)`);

  try {
    // Sanitize filename: remove spaces and special characters
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `documents/${Date.now()}_${sanitizedFileName}`;
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    
    console.log("[StorageService] Upload Supabase Storage réussi:", publicUrlData.publicUrl);
    return {
      url: publicUrlData.publicUrl,
      fileName
    };
  } catch (supabaseError: any) {
    console.error("[StorageService] Erreur Supabase Storage:", supabaseError.message, supabaseError);
    throw new Error("Erreur lors de l'upload du fichier sur Supabase Storage.");
  }
};
