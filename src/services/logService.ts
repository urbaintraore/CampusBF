import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';

export const logService = {
  async logAction(user: User | null, action: string, details?: string) {
    if (!user) return;
    try {
      await addDoc(collection(db, 'logs'), {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action,
        details,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }
};
