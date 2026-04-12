import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  arrayUnion 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { MarketplaceItem, User } from '@/types';
import { logService } from './logService';
import { notificationService } from './notificationService';

export const marketplaceService = {
  async addMarketplaceItem(data: Omit<MarketplaceItem, 'id' | 'createdAt'>) {
    try {
      await addDoc(collection(db, 'marketplace'), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'marketplace');
      throw error;
    }
  },

  async updateMarketplaceItem(id: string, data: Partial<MarketplaceItem>) {
    try {
      await updateDoc(doc(db, 'marketplace', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${id}`);
      throw error;
    }
  },

  async deleteMarketplaceItem(id: string) {
    try {
      await deleteDoc(doc(db, 'marketplace', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `marketplace/${id}`);
      throw error;
    }
  },

  async reviewMarketplaceItem(adminUser: User, item: MarketplaceItem, seller: User | undefined, status: 'approved' | 'rejected') {
    try {
      const itemRef = doc(db, 'marketplace', item.id);
      await updateDoc(itemRef, { status });
      
      if (status === 'approved' && seller) {
        const sellerRef = doc(db, 'users', seller.id);
        const currentStats = seller.marketplaceStats || { published: 0, sold: 0, reports: 0 };
        await updateDoc(sellerRef, {
          'marketplaceStats.published': (currentStats.published || 0) + 1
        });
      }
      
      await logService.logAction(adminUser, 'Examen annonce marketplace', `ID: ${item.id}, Statut: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${item.id}`);
      throw error;
    }
  },

  async reportMarketplaceItem(currentUser: User, item: MarketplaceItem, seller: User | undefined, reason: string) {
    try {
      if (item.reports?.includes(currentUser.id)) {
        throw new Error('Vous avez déjà signalé cette annonce.');
      }

      const itemRef = doc(db, 'marketplace', item.id);
      const newReportCount = (item.reportCount || 0) + 1;
      
      const updateData: any = {
        reports: arrayUnion(currentUser.id),
        reportCount: newReportCount
      };

      if (newReportCount >= 3) {
        updateData.status = 'pending';
      }

      await updateDoc(itemRef, updateData);

      if (seller) {
        const sellerRef = doc(db, 'users', seller.id);
        const currentStats = seller.marketplaceStats || { published: 0, sold: 0, reports: 0 };
        await updateDoc(sellerRef, {
          'marketplaceStats.reports': (currentStats.reports || 0) + 1
        });
      }

      await notificationService.addNotification('admin', {
        type: 'alert',
        title: 'Annonce signalée',
        message: `L'annonce "${item.title}" a été signalée pour: ${reason}.`,
      });

      await logService.logAction(currentUser, 'Signalement annonce', `Annonce: ${item.title}, Raison: ${reason}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${item.id}`);
      throw error;
    }
  }
};
