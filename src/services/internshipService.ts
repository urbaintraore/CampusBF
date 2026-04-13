import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Internship } from '@/types';

export const internshipService = {
  async addInternship(data: Omit<Internship, 'id' | 'createdAt'>) {
    try {
      await addDoc(collection(db, 'internships'), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'internships');
      throw error;
    }
  },

  async updateInternship(id: string, data: Partial<Internship>) {
    try {
      await updateDoc(doc(db, 'internships', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `internships/${id}`);
      throw error;
    }
  },

  async deleteInternship(id: string) {
    try {
      await deleteDoc(doc(db, 'internships', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `internships/${id}`);
      throw error;
    }
  },

  async applyInternship(applicationData: any) {
    try {
      await addDoc(collection(db, 'applications'), {
        ...applicationData,
        appliedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
      throw error;
    }
  }
};
