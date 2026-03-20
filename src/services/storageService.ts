import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload
 * @param path The path in storage (e.g., 'avatars/userId')
 * @returns Promise with the download URL
 */
export const uploadFile = async (file: File | Blob, path: string): Promise<string> => {
  const formData = new FormData();
  // Ensure we have a filename
  let filename = 'file';
  if (file instanceof File) {
    filename = file.name;
  } else {
    // If it's a blob, create a generic filename
    filename = `upload-${Date.now()}.bin`;
  }
  
  formData.append('file', file, filename);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur (${response.status}): ${response.statusText}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error("Réponse invalide du serveur");
  }
  return data.url;
};
