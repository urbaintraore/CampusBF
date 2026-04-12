import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Report } from '@/types';

export const reportService = {
  async addReport(report: Omit<Report, 'id' | 'createdAt' | 'status'>) {
    try {
      await addDoc(collection(db, 'reports'), {
        ...report,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
      throw error;
    }
  },

  async deleteReport(id: string) {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
      throw error;
    }
  }
};
