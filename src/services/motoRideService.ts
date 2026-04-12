import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  arrayUnion,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { MotoRide, User, Report } from '@/types';
import { logService } from './logService';
import { notificationService } from './notificationService';

export const motoRideService = {
  async deleteMotoRide(id: string) {
    try {
      await deleteDoc(doc(db, 'motoRides', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `motoRides/${id}`);
      throw error;
    }
  },

  async addMotoRide(user: User, ride: Omit<MotoRide, 'id' | 'createdAt'>) {
    if (user.motoRideStatus === 'suspended') {
      throw new Error('Votre compte MotoRide est suspendu. Vous ne pouvez pas proposer de trajets.');
    }
    if (!user.isVerified) {
      throw new Error('Vous devez vérifier votre compte avant de proposer un trajet.');
    }
    if (!user.isDriverVerified) {
      throw new Error('Vous devez être un conducteur vérifié pour proposer un trajet.');
    }

    try {
      await addDoc(collection(db, 'motoRides'), {
        ...ride,
        university: user.university,
        status: 'active',
        passengers: [],
        createdAt: new Date().toISOString()
      });
      await logService.logAction(user, 'Nouveau trajet MotoRide', `De ${ride.departure} vers ${ride.destination}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'motoRides');
      throw error;
    }
  },

  async reportRideUser(currentUser: User, reportedUser: User, rideId: string, reason: string) {
    try {
      const userRef = doc(db, 'users', reportedUser.id);
      const currentReports = (reportedUser.motoRideStats?.totalReports || 0) + 1;
      
      const updateData: any = {
        'motoRideStats.totalReports': currentReports
      };

      if (currentReports >= 3) {
        updateData.motoRideStatus = 'suspended';
      }

      await updateDoc(userRef, updateData);

      if (rideId) {
        const rideRef = doc(db, 'motoRides', rideId);
        await updateDoc(rideRef, {
          reports: arrayUnion({
            reporterId: currentUser.id,
            reason,
            createdAt: new Date().toISOString()
          })
        });
      }

      await notificationService.addNotification('admin', {
        type: 'alert',
        title: 'Utilisateur MotoRide signalé',
        message: `L'utilisateur ${reportedUser.firstName} ${reportedUser.lastName} a été signalé pour: ${reason}.`,
      });

      await logService.logAction(currentUser, 'Signalement utilisateur MotoRide', `Utilisateur: ${reportedUser.id}, Raison: ${reason}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${reportedUser.id}`);
      throw error;
    }
  },

  async reviewRide(currentUser: User, reviewee: User, rideId: string, rating: number, comment: string) {
    try {
      const reviewId = `review_${Date.now()}`;
      await setDoc(doc(db, 'rideReviews', reviewId), {
        id: reviewId,
        rideId,
        reviewerId: currentUser.id,
        revieweeId: reviewee.id,
        rating,
        comment,
        createdAt: new Date().toISOString()
      });

      const userRef = doc(db, 'users', reviewee.id);
      const currentStats = reviewee.motoRideStats || { ridesCompleted: 0, averageRating: 0, totalReports: 0 };
      
      const newRidesCompleted = (currentStats.ridesCompleted || 0) + 1;
      const newAverageRating = ((currentStats.averageRating || 0) * (currentStats.ridesCompleted || 0) + rating) / newRidesCompleted;

      await updateDoc(userRef, {
        'motoRideStats.ridesCompleted': newRidesCompleted,
        'motoRideStats.averageRating': newAverageRating
      });

      await logService.logAction(currentUser, 'Avis MotoRide', `Note: ${rating} pour ${reviewee.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rideReviews');
      throw error;
    }
  },

  async updateRideStatus(user: User, rideId: string, status: MotoRide['status']) {
    try {
      const rideRef = doc(db, 'motoRides', rideId);
      await updateDoc(rideRef, { status });
      await logService.logAction(user, 'Mise à jour statut trajet', `ID: ${rideId}, Statut: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `motoRides/${rideId}`);
      throw error;
    }
  },

  async verifyDriver(adminUser: User, userId: string, vehicleDetails: User['vehicleDetails']) {
    if (adminUser.role !== 'admin') throw new Error('Action non autorisée');
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isDriverVerified: true,
        vehicleDetails
      });
      
      await notificationService.addNotification(userId, {
        type: 'success',
        title: 'Conducteur vérifié',
        message: 'Votre profil de conducteur a été vérifié. Vous pouvez maintenant proposer des trajets sur MotoRide.'
      });

      await logService.logAction(adminUser, 'Vérification conducteur', `Utilisateur: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      throw error;
    }
  }
};
