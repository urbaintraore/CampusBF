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

const getJobTimestamp = (item: any): number => {
  const val = item.createdAt || item.postedAt || item.datePosted || item.publishedAt || item.date || item.timestamp;
  if (!val) return 0;
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val === 'object' && typeof val.seconds === 'number') return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const internshipService = {
  async getInternships(limitCount: number = 50) {
    try {
      const q = query(collection(db, 'internships'), orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      let internships = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Internship));
      
      // Fallback if no results with ordering
      if (internships.length === 0) {
        const fallbackQ = query(collection(db, 'internships'), limit(limitCount));
        const fallbackSnapshot = await getDocs(fallbackQ);
        internships = fallbackSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Internship));
      }
      
      return internships.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
    } catch (error: any) {
      if (error?.message?.includes('index')) {
        const fallbackQ = query(collection(db, 'internships'), limit(limitCount));
        const fallbackSnapshot = await getDocs(fallbackQ);
        const list = fallbackSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Internship));
        return list.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
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
