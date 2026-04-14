import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Referral } from '@/types';

export const referralService = {
  async createReferral(referrerId: string, referredId: string) {
    try {
      await addDoc(collection(db, 'referrals'), {
        referrerId,
        referredId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'referrals');
      throw error;
    }
  },

  async getReferralCount(referrerId: string): Promise<number> {
    try {
      const q = query(collection(db, 'referrals'), where('referrerId', '==', referrerId));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'referrals');
      throw error;
    }
  }
};
