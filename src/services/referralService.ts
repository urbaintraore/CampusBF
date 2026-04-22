import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Referral } from '@/types';

export const referralService = {
  async createReferral(referrerIdOrCode: string, referredId: string) {
    try {
      let referrerId = referrerIdOrCode;
      
      // If the provided ID doesn't look like a Firebase UID (typically 28 chars),
      // it might be a referral code (typically 6-8 chars).
      if (referrerIdOrCode.length < 20) {
        const q = query(collection(db, 'users'), where('referralCode', '==', referrerIdOrCode.toUpperCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          referrerId = snapshot.docs[0].id;
        } else {
          console.warn("Referrer not found for code:", referrerIdOrCode);
          return; // Silent fail if referrer not found
        }
      }

      // Check if this referral already exists to avoid double counting
      const existingQuery = query(
        collection(db, 'referrals'), 
        where('referrerId', '==', referrerId),
        where('referredId', '==', referredId)
      );
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        console.log("Referral already recorded");
        return;
      }

      await addDoc(collection(db, 'referrals'), {
        referrerId,
        referredId,
        createdAt: serverTimestamp()
      });

      // Update referrer's user document
      const referrerRef = doc(db, 'users', referrerId);
      await updateDoc(referrerRef, {
        inviteCount: increment(1),
        referralsCount: increment(1),
        invitedUsers: arrayUnion(referredId),
        'activityStats.invitations': increment(1),
        rankingScore: increment(50)
      });
    } catch (error) {
      console.error("Error creating referral:", error);
      // We don't want to block signup if referral fails, but we should log it
      handleFirestoreError(error, OperationType.CREATE, 'referrals');
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
