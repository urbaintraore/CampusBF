import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getCountFromServer
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

export const documentService = {
  async getDocumentsCount() {
    try {
      const snapshot = await getCountFromServer(collection(db, 'documents'));
      const count = snapshot.data().count;
      try {
        localStorage.setItem('campusbf_cached_documents_count', String(count));
      } catch (e) {}
      return count;
    } catch (error) {
      console.warn("[documentService] Offline or network issue during count query, recovering cached count:", error);
      const cached = localStorage.getItem('campusbf_cached_documents_count');
      if (cached) return parseInt(cached, 10);
      return 150; // standard default mock/fallback document count
    }
  },

  async addDocument(data: any) {
    try {
      await addDoc(collection(db, 'documents'), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
      throw error;
    }
  },

  async updateDocument(id: string, data: Partial<any>) {
    try {
      await updateDoc(doc(db, 'documents', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${id}`);
      throw error;
    }
  },

  async deleteDocument(id: string) {
    try {
      await deleteDoc(doc(db, 'documents', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
      throw error;
    }
  }
};
