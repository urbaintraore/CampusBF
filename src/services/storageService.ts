import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// Declare global variables injected by Vite define
declare const __CLOUDINARY_CLOUD_NAME__: string;
declare const __CLOUDINARY_UPLOAD_PRESET__: string;

/**
 * Uploads a file directly to Cloudinary from the frontend.
 * Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in AI Studio Secrets
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

  console.log(`[StorageService] Tentative d'upload pour: ${fileName}`);

  // Fallback if Cloudinary is not configured
  if (!cloudName || !uploadPreset || cloudName === '' || uploadPreset === '') {
    console.error("[StorageService] Configuration Cloudinary incomplète !");
    if (!cloudName) console.log("ERREUR : VITE_CLOUDINARY_CLOUD_NAME est vide.");
    if (!uploadPreset) console.log("ERREUR : VITE_CLOUDINARY_UPLOAD_PRESET est vide.");
    console.log("Veuillez vérifier vos Secrets dans AI Studio.");
    
    // Simulate network delay for the dummy fallback
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName
    };
  }

  console.log(`[StorageService] Configuration OK. Cloud: ${cloudName}, Preset: ${uploadPreset}`);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  // Optional: add folder if needed
  formData.append('folder', 'campusbf');

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erreur Cloudinary (${response.status})`);
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      fileName
    };
  } catch (error: any) {
    console.error("Erreur d'upload Cloudinary:", error);
    throw new Error(error.message || "Erreur lors du téléchargement du fichier");
  }
};
