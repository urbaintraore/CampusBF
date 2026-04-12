import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Ad, User } from '@/types';
import { logService } from './logService';

export const adService = {
  async createAd(user: User, ad: Omit<Ad, 'id'>) {
    try {
      await addDoc(collection(db, 'ads'), {
        ...ad,
        createdAt: serverTimestamp()
      });
      await logService.logAction(user, 'Création publicité', `Titre: ${ad.title}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ads');
      throw error;
    }
  },

  async updateAd(user: User, id: string, data: Partial<Ad>) {
    try {
      await updateDoc(doc(db, 'ads', id), data);
      await logService.logAction(user, 'Modification publicité', `ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ads/${id}`);
      throw error;
    }
  },

  async deleteAd(user: User, id: string) {
    try {
      await deleteDoc(doc(db, 'ads', id));
      await logService.logAction(user, 'Suppression publicité', `ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ads/${id}`);
      throw error;
    }
  }
};
