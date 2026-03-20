import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Uploads a file directly to Cloudinary from the frontend.
 * Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env
 * @param file The file to upload
 * @returns Promise with the secure download URL and original filename
 */
export const uploadFile = async (file: File | Blob): Promise<{ url: string, fileName: string }> => {
  const cloudName = (process.env as any).VITE_CLOUDINARY_CLOUD_NAME || (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = (process.env as any).VITE_CLOUDINARY_UPLOAD_PRESET || (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Determine filename
  let fileName = 'document.pdf';
  if (file instanceof File) {
    fileName = file.name;
  }

  // Fallback if Cloudinary is not configured
  if (!cloudName || !uploadPreset) {
    console.warn("Configuration Cloudinary manquante (VITE_CLOUDINARY_CLOUD_NAME ou VITE_CLOUDINARY_UPLOAD_PRESET). Utilisation d'une URL simulée.");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName
    };
  }

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
