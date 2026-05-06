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
      return snapshot.data().count;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'documents/count');
      throw error;
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
