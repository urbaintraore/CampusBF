import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload
 * @param path The path in storage (e.g., 'avatars/userId')
 * @returns Promise with the download URL
 */
export const uploadFile = async (file: File | Blob, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};
