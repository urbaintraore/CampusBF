import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload
 * @returns Promise with the secure download URL and original filename
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

  console.log(`[StorageService] Tentative d'upload vers Firebase Storage pour: ${fileName} (${file.size} octets)`);

  try {
    const storageRef = ref(storage, `documents/${Date.now()}_${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    console.log("[StorageService] Upload Firebase Storage réussi:", downloadUrl);
    return {
      url: downloadUrl,
      fileName
    };
  } catch (firebaseError: any) {
    console.error("[StorageService] Erreur Firebase Storage:", firebaseError.message, firebaseError);
    throw new Error("Erreur lors de l'upload du fichier sur Firebase Storage.");
  }
};
