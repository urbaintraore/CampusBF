import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  limit,
  getDocs,
  getCountFromServer
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Internship } from '@/types';

export const internshipService = {
  async getInternships(limitCount: number = 50) {
    try {
      const q = query(collection(db, 'internships'), orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      const internships = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Internship));
      
      // Fallback if no results with ordering
      if (internships.length === 0) {
        const fallbackQ = query(collection(db, 'internships'), limit(limitCount));
        const fallbackSnapshot = await getDocs(fallbackQ);
        return fallbackSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Internship));
      }
      
      return internships;
    } catch (error: any) {
      if (error?.message?.includes('index')) {
        const fallbackQ = query(collection(db, 'internships'), limit(limitCount));
        const fallbackSnapshot = await getDocs(fallbackQ);
        return fallbackSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Internship));
      }
      handleFirestoreError(error, OperationType.GET, 'internships');
      throw error;
    }
  },

  async getInternshipsCount() {
    try {
      const snapshot = await getCountFromServer(collection(db, 'internships'));
      return snapshot.data().count;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'internships/count');
      throw error;
    }
  },

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
