import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Deal, DealSuggestion } from '@/types';

export const dealService = {
  async createDeal(deal: Omit<Deal, 'id' | 'createdAt'>) {
    try {
      await addDoc(collection(db, 'deals'), {
        ...deal,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deals');
    }
  },

  async updateDeal(id: string, data: Partial<Deal>) {
    try {
      const dealRef = doc(db, 'deals', id);
      await updateDoc(dealRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deals/${id}`);
    }
  },

  async deleteDeal(id: string) {
    try {
      await deleteDoc(doc(db, 'deals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deals/${id}`);
    }
  },

  async suggestDeal(suggestion: Omit<DealSuggestion, 'id' | 'status' | 'createdAt'>) {
    try {
      await addDoc(collection(db, 'deal_suggestions'), {
        ...suggestion,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deal_suggestions');
    }
  }
};
