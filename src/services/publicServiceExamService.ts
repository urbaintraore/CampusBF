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
  async getContests(
    filters?: {
      categorie?: string;
      niveau?: string;
      type?: string;
    },
    pageSize: number = 10,
    lastDoc?: any // Snapshot
  ) {
    try {
      // Optimsed with queries
      let queryConstraints: any[] = [
        where('status', '==', 'active'),
        orderBy('date_creation', 'desc'),
        limit(pageSize)
      ];

      if (filters?.categorie) queryConstraints.push(where('categorie', '==', filters.categorie));
      if (filters?.niveau) queryConstraints.push(where('niveau', '==', filters.niveau));
      if (filters?.type) queryConstraints.push(where('type', '==', filters.type));

      if (lastDoc) {
        // Need to import startAfter
        const { startAfter } = await import('firebase/firestore');
        queryConstraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, 'public_service_contests'), ...queryConstraints);
      const snapshot = await getDocs(q);
      
      const contests = snapshot.docs.map(doc => {
        const data = doc.data();
        // Do not load 'questions' to save memory/bandwidth as requested
        delete data.questions; 
        return { id: doc.id, ...data } as PublicServiceContest;
      });
      
      return {
        contests,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
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

  async getContestQuestions(contestId: string) {
    try {
      const q = query(
        collection(db, 'public_service_questions'),
        where('concours_id', '==', contestId),
        orderBy('order', 'asc') // Assuming an order field exists
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'public_service_questions');
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
        orderBy('date', 'desc'),
        limit(20) // Optimized: prevent fetching thousands of results
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
