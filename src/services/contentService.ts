import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

export const contentService = {
  async deleteContent(collectionName: 'posts' | 'events' | 'news' | 'lostAndFound', id: string) {
    console.log(`ContentService: Attempting to delete ${collectionName}/${id}`);
    try {
      await deleteDoc(doc(db, collectionName, id));
      console.log(`ContentService: ${collectionName}/${id} deleted successfully`);
    } catch (error) {
      console.error(`ContentService: Error deleting ${collectionName}/${id}:`, error);
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
      throw error;
    }
  },

  async addContent(collectionName: 'posts' | 'events' | 'news' | 'lostAndFound', data: any) {
    try {
      await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
      throw error;
    }
  },

  async updateContent(collectionName: 'posts' | 'events' | 'news' | 'lostAndFound', id: string, data: any) {
    try {
      await updateDoc(doc(db, collectionName, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
      throw error;
    }
  }
};
