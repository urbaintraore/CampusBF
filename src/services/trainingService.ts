import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  arrayUnion 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { User, Training } from '@/types';
import { logService } from './logService';
import { notificationService } from './notificationService';

export const trainingService = {
  async addTraining(user: User, trainingData: Omit<Training, 'id' | 'createdAt' | 'status' | 'participants'>) {
    try {
      const autoApproveRoles = ['admin', 'teacher', 'company', 'institution'];
      const status = autoApproveRoles.includes(user.role) ? 'approved' : 'pending';
      await addDoc(collection(db, 'trainings'), {
        ...trainingData,
        status,
        participants: [],
        createdAt: new Date().toISOString()
      });
      await logService.logAction(user, 'Publication formation', trainingData.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trainings');
      throw error;
    }
  },

  async updateTraining(user: User, trainingId: string, data: Partial<Training>) {
    try {
      if (data.id) delete data.id;
      if (data.createdAt) delete data.createdAt;

      await updateDoc(doc(db, 'trainings', trainingId), data);
      await logService.logAction(user, 'Modification formation', `ID: ${trainingId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainings/${trainingId}`);
      throw error;
    }
  },

  async enrollInTraining(user: User, training: Training) {
    try {
      await updateDoc(doc(db, 'trainings', training.id), {
        participants: arrayUnion(user.id)
      });

      await addDoc(collection(db, 'training_enrollments'), {
        trainingId: training.id,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userAvatar: user.avatarUrl,
        enrolledAt: new Date().toISOString()
      });

      await notificationService.addNotification(user.id, {
        type: 'success',
        title: 'Inscription réussie',
        message: `Vous êtes inscrit à la formation : ${training.title}`
      });

      await logService.logAction(user, 'Inscription formation', training.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainings/${training.id}`);
      throw error;
    }
  },

  async reviewTraining(user: User, training: Training, rating: number, comment: string, trainer: User | undefined) {
    try {
      await addDoc(collection(db, 'training_reviews'), {
        trainingId: training.id,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        rating,
        comment,
        createdAt: new Date().toISOString()
      });

      if (trainer) {
        const trainerRef = doc(db, 'users', training.trainerId);
        const currentStats = trainer.trainingStats || { trainingsOrganized: 0, averageRating: 0 };
        const newRating = ((currentStats.averageRating || 0) * (currentStats.trainingsOrganized || 0) + rating) / (currentStats.trainingsOrganized || 1);
        
        await updateDoc(trainerRef, {
          'trainingStats.averageRating': newRating
        });
      }

      await logService.logAction(user, 'Avis formation', `Note: ${rating}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'training_reviews');
      throw error;
    }
  },

  async reportTraining(user: User, trainingId: string, reason: string, details: string) {
    try {
      await addDoc(collection(db, 'training_reports'), {
        trainingId,
        reporterId: user.id,
        reason,
        details,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      await logService.logAction(user, 'Signalement formation', `ID: ${trainingId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'training_reports');
      throw error;
    }
  },

  async updateTrainingStatus(adminUser: User, training: Training, trainer: User | undefined, status: Training['status']) {
    try {
      console.log(`[trainingService] Updating training ${training.id} to status: ${status}`);
      await updateDoc(doc(db, 'trainings', training.id), { status });
      console.log(`[trainingService] Training ${training.id} status updated successfully.`);
      
      if (status === 'approved' && trainer) {
        const trainerRef = doc(db, 'users', training.trainerId);
        const currentStats = trainer.trainingStats || { trainingsOrganized: 0, averageRating: 0 };
        await updateDoc(trainerRef, {
          'trainingStats.trainingsOrganized': (currentStats.trainingsOrganized || 0) + 1
        });
      }

      await notificationService.addNotification(training.trainerId, {
        type: status === 'approved' ? 'success' : 'alert',
        title: status === 'approved' ? 'Formation validée' : 'Formation refusée',
        message: `Votre formation "${training.title}" a été ${status === 'approved' ? 'validée' : 'refusée'} par l'administration.`
      });
      
      await logService.logAction(adminUser, 'Statut formation', `ID: ${training.id}, Statut: ${status}`);
    } catch (error) {
      console.error(`[trainingService] Error updating training ${training.id}:`, error);
      handleFirestoreError(error, OperationType.UPDATE, `trainings/${training.id}`);
      throw error;
    }
  },

  async deleteTraining(user: User, training: Training) {
    try {
      await deleteDoc(doc(db, 'trainings', training.id));
      
      for (const participantId of training.participants) {
        await notificationService.addNotification(participantId, {
          type: 'alert',
          title: 'Formation annulée',
          message: `La formation "${training.title}" a été annulée.`
        });
      }

      await logService.logAction(user, 'Suppression formation', training.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trainings/${training.id}`);
      throw error;
    }
  }
};
