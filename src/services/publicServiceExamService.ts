import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { PublicServiceContest, PublicServiceResult, PublicServiceSubscription, User } from '@/types';

export const publicServiceExamService = {
  async getContests(filters?: {
    categorie?: string;
    niveau?: string;
    type?: string;
  }) {
    try {
      let q = query(collection(db, 'public_service_contests'), where('status', '==', 'active'));
      
      const contestsSnapshot = await getDocs(q);
      let contests = contestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicServiceContest));
      
      if (filters) {
        if (filters.categorie) contests = contests.filter(c => c.categorie === filters.categorie);
        if (filters.niveau) contests = contests.filter(c => c.niveau === filters.niveau);
        if (filters.type) contests = contests.filter(c => c.type === filters.type);
      }
      
      return contests;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'public_service_contests');
      throw error;
    }
  },

  async getContestById(id: string) {
    try {
      const docRef = doc(db, 'public_service_contests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as PublicServiceContest;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `public_service_contests/${id}`);
      throw error;
    }
  },

  async saveResult(result: Omit<PublicServiceResult, 'id' | 'date'>) {
    try {
      const resultData = {
        ...result,
        date: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'public_service_results'), resultData);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'public_service_results');
      throw error;
    }
  },

  async getUserResults(userId: string) {
    try {
      const q = query(
        collection(db, 'public_service_results'), 
        where('user_id', '==', userId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicServiceResult));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'public_service_results');
      throw error;
    }
  },

  async getSubscription(userId: string) {
    try {
      const q = query(
        collection(db, 'public_service_subscriptions'), 
        where('user_id', '==', userId),
        where('actif', '==', true),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as PublicServiceSubscription;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'public_service_subscriptions');
      throw error;
    }
  },

  async getGlobalRanking(limitCount: number = 20) {
    try {
      const q = query(
        collection(db, 'public_service_results'),
        orderBy('score', 'desc'),
        orderBy('temps', 'asc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicServiceResult));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'public_service_results');
      throw error;
    }
  }
};
