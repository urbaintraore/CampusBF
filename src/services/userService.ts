import { 
  updateDoc, 
  deleteDoc, 
  doc,
  collection,
  addDoc,
  query,
  limit,
  orderBy,
  getDocs,
  getCountFromServer,
  where,
  documentId
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { User } from '@/types';
import { logService } from './logService';

export const userService = {
  async getUsers(limitCount: number = 50) {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      throw error;
    }
  },

  async getUsersCount() {
    try {
      const snapshot = await getCountFromServer(collection(db, 'users'));
      return snapshot.data().count;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users/count');
      throw error;
    }
  },

  async getUsersByRole(role: User['role'], limitCount: number = 50) {
    try {
      const q = query(collection(db, 'users'), where('role', '==', role), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/role/${role}`);
      throw error;
    }
  },

  async getUsersByIds(userIds: string[]) {
    try {
      if (!userIds || userIds.length === 0) return [];
      const q = query(collection(db, 'users'), where(documentId(), 'in', userIds), limit(50));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/ids`);
      throw error;
    }
  },

  async updateUser(userId: string, data: Partial<User>) {
    try {
      await updateDoc(doc(db, 'users', userId), data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      throw error;
    }
  },

  async updateUserRole(adminUser: User, userId: string, role: User['role']) {
    try {
      await updateDoc(doc(db, 'users', userId), { role });
      await logService.logAction(adminUser, 'Mise à jour rôle', `Utilisateur ID: ${userId}, Nouveau rôle: ${role}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      throw error;
    }
  },

  async activateUser(adminUser: User, userId: string) {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'active' });
      await logService.logAction(adminUser, 'Activation utilisateur', `Utilisateur ID: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      throw error;
    }
  },

  async deactivateUser(adminUser: User, userId: string) {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'inactive' });
      await logService.logAction(adminUser, 'Désactivation utilisateur', `Utilisateur ID: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      throw error;
    }
  },

  async deleteUser(adminUser: User, userId: string) {
    try {
      await deleteDoc(doc(db, 'users', userId));
      try {
        await deleteDoc(doc(db, 'profiles', userId));
      } catch (e) {
        console.warn("Failed to delete profile, it might not exist:", e);
      }
      await logService.logAction(adminUser, 'Suppression utilisateur', `Utilisateur ID: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      throw error;
    }
  },

  async addTeacherReview(user: User, teacherId: string, rating: number, comment: string) {
    try {
      const reviewData = {
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`,
        rating,
        comment,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'users', teacherId, 'reviews'), reviewData);
      await logService.logAction(user, 'Avis enseignant', `ID: ${teacherId}, Note: ${rating}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${teacherId}/reviews`);
      throw error;
    }
  }
};
