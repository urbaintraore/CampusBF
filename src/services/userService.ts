import { 
  updateDoc, 
  deleteDoc, 
  doc,
  collection,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { User } from '@/types';
import { logService } from './logService';

export const userService = {
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
