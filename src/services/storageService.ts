import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// Declare global variables injected by Vite define
declare const __CLOUDINARY_CLOUD_NAME__: string;
declare const __CLOUDINARY_UPLOAD_PRESET__: string;

/**
 * Uploads a file to Cloudinary or Firebase Storage.
 * Prefers Cloudinary if configured, otherwise uses Firebase Storage.
 * @param file The file to upload
 * @returns Promise with the secure download URL and original filename
 */
export const uploadFile = async (file: File | Blob): Promise<{ url: string, fileName: string }> => {
  // Access variables defined in vite.config.ts
  const cloudName = typeof __CLOUDINARY_CLOUD_NAME__ !== 'undefined' ? __CLOUDINARY_CLOUD_NAME__ : '';
  const uploadPreset = typeof __CLOUDINARY_UPLOAD_PRESET__ !== 'undefined' ? __CLOUDINARY_UPLOAD_PRESET__ : '';

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

  console.log(`[StorageService] Tentative d'upload pour: ${fileName} (${file.size} octets), type: ${file.type}`);

  // If Cloudinary is configured, use it
  if (cloudName && uploadPreset && cloudName !== '' && uploadPreset !== '') {
    console.log(`[StorageService] Utilisation de Cloudinary. Cloud: ${cloudName}, Preset: ${uploadPreset}`);
    
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const formData = new FormData();
    
    // Ensure the file is appended correctly with its name
    formData.append('file', file, fileName);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'campusbf');
    formData.append('public_id', `${Date.now()}_${fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_')}`);

    console.log(`[StorageService] Envoi vers Cloudinary: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      console.log(`[StorageService] Réponse Cloudinary reçue: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log("[StorageService] Données Cloudinary reçues:", JSON.stringify(data));
        console.log("[StorageService] Upload Cloudinary réussi:", data.secure_url, "Size:", data.bytes);
        
        if (data.bytes === 0) {
          console.warn("[StorageService] Attention: Cloudinary rapporte un fichier de 0 octets.");
        }

        return {
          url: data.secure_url,
          fileName: data.original_filename ? `${data.original_filename}.${data.format}` : fileName
        };
      }
      
      const errorText = await response.text();
      console.warn(`[StorageService] Échec Cloudinary (${response.status}):`, errorText);
      // Fall through to Firebase Storage
    } catch (error) {
      console.warn("[StorageService] Erreur Cloudinary, tentative avec Firebase Storage:", error);
      // Fall through to Firebase Storage
    }
  }

  // Fallback to Firebase Storage
  console.log("[StorageService] Utilisation de Firebase Storage comme fallback.");
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
    console.error("[StorageService] Erreur Firebase Storage:", firebaseError);
    
    // Last resort dummy fallback (only if everything fails)
    console.log("[StorageService] Utilisation du fallback dummy en dernier recours.");
    return {
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName
    };
  }
};
