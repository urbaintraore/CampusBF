import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { User, TeacherApplication, SubscriptionRequest, TutorApplication } from '@/types';
import { logService } from './logService';
import { notificationService } from './notificationService';

export const applicationService = {
  async submitTutorApplication(user: User, description: string, documentUrl: string, subjects: string[], hourlyRates: any) {
    try {
      const newApp = {
        userId: user.id,
        user: user,
        description,
        documentUrl,
        subjects,
        hourlyRates,
        status: 'pending',
        appliedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'applications'), newApp);
      await logService.logAction(user, 'Demande Tuteur', `Sujets: ${subjects.join(', ')}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
      throw error;
    }
  },

  async reviewTutorApplication(adminUser: User, application: TutorApplication, status: 'approved' | 'rejected') {
    try {
      await updateDoc(doc(db, 'applications', application.id), { status });

      const updatedUserData: Partial<User> = { tutorStatus: status };
      if (status === 'approved') {
        updatedUserData.tutorSubjects = application.subjects;
        updatedUserData.tutorHourlyRates = application.hourlyRates;
        updatedUserData.tutorDescription = application.description;
        if (application.user.role === 'student' || application.user.role === 'public') {
          updatedUserData.role = 'tutor';
        }
      }
      
      await updateDoc(doc(db, 'users', application.userId), updatedUserData);
      await logService.logAction(adminUser, 'Examen demande tuteur', `ID: ${application.id}, Statut: ${status}`);
      
      await notificationService.addNotification(application.userId, {
        type: status === 'approved' ? 'success' : 'alert',
        title: status === 'approved' ? 'Demande Répétiteur Approuvée' : 'Demande Répétiteur Refusée',
        message: status === 'approved' 
          ? 'Votre demande pour devenir répétiteur a été acceptée.' 
          : 'Votre demande pour devenir répétiteur a été refusée.'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${application.id}`);
      throw error;
    }
  },

  async submitTeacherApplication(user: User, data: Omit<TeacherApplication, 'id' | 'userId' | 'user' | 'status' | 'createdAt'>) {
    try {
      const newApp = {
        userId: user.id,
        user: user,
        ...data,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'teacherApplications'), newApp);
      await logService.logAction(user, 'Demande Enseignant', `Rang: ${data.academicRank}`);

      await notificationService.addNotification('admin', {
        type: 'message',
        title: 'Nouveau dossier Enseignant',
        message: `${user.firstName} ${user.lastName} a soumis un dossier pour rejoindre l'annuaire des enseignants.`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'teacherApplications');
      throw error;
    }
  },

  async reviewTeacherApplication(adminUser: User, application: TeacherApplication, status: 'approved' | 'rejected') {
    try {
      await updateDoc(doc(db, 'teacherApplications', application.id), { status });

      const updatedUserData: Partial<User> = { teacherStatus: status };
      if (status === 'approved') {
        updatedUserData.teacherProfile = {
          academicRank: application.academicRank,
          biography: application.biography,
          yearsOfExperience: 0,
          languages: ['Français'],
          specialties: application.specialties,
          domains: application.domains,
          publications: [],
          courses: application.courses,
          availability: {
            isAvailable: true,
            willingToTravel: false
          }
        };
      }
      
      await updateDoc(doc(db, 'users', application.userId), updatedUserData);
      await logService.logAction(adminUser, 'Examen demande enseignant', `ID: ${application.id}, Statut: ${status}`);

      await notificationService.addNotification(application.userId, {
        type: status === 'approved' ? 'success' : 'alert',
        title: status === 'approved' ? 'Dossier Enseignant Accepté' : 'Dossier Enseignant Refusé',
        message: status === 'approved' 
          ? 'Votre dossier enseignant a été validé.' 
          : 'Votre dossier enseignant a été refusé.'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teacherApplications/${application.id}`);
      throw error;
    }
  },

  async submitSubscriptionRequest(user: User, type: SubscriptionRequest['type'], amount: number) {
    try {
      const newRequest = {
        userId: user.id,
        user: user,
        type,
        amount,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'subscriptionRequests'), newRequest);
      await logService.logAction(user, 'Demande Abonnement', `Type: ${type}, Montant: ${amount} FCFA`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subscriptionRequests');
      throw error;
    }
  },

  async reviewSubscriptionRequest(adminUser: User, request: SubscriptionRequest, targetUser: User, status: 'approved' | 'rejected') {
    try {
      await updateDoc(doc(db, 'subscriptionRequests', request.id), { status });
      await logService.logAction(adminUser, 'Examen demande abonnement', `ID: ${request.id}, Statut: ${status}`);

      const updatedUser: Partial<User> = {};
      if (status === 'approved') {
        const expiry = new Date();
        if (request.type === 'exam') {
          expiry.setDate(expiry.getDate() + 360);
          updatedUser.examSubscriptionStatus = 'active';
          updatedUser.examSubscriptionExpiry = expiry.toISOString();
        } else if (request.type === 'premium') {
          expiry.setDate(expiry.getDate() + 30);
          updatedUser.premiumSubscriptionStatus = 'active';
          updatedUser.premiumSubscriptionExpiry = expiry.toISOString();
        } else if (request.type === 'motoride') {
          expiry.setDate(expiry.getDate() + 30);
          updatedUser.motoRideSubscriptionStatus = 'active';
          updatedUser.motoRideSubscriptionExpiry = expiry.toISOString();
        } else if (request.type === 'event') {
          expiry.setDate(expiry.getDate() + 30);
          updatedUser.eventSubscriptionStatus = 'active';
          updatedUser.eventSubscriptionExpiry = expiry.toISOString();
        } else if (request.type === 'institution') {
          expiry.setDate(expiry.getDate() + 365);
          updatedUser.institutionProfile = {
            ...targetUser.institutionProfile!,
            subscriptionStatus: 'active',
            subscriptionExpiry: expiry.toISOString()
          };
        }
      } else {
        if (request.type === 'exam') updatedUser.examSubscriptionStatus = 'none';
        else if (request.type === 'premium') updatedUser.premiumSubscriptionStatus = 'none';
        else if (request.type === 'motoride') updatedUser.motoRideSubscriptionStatus = 'none';
        else if (request.type === 'event') updatedUser.eventSubscriptionStatus = 'none';
        else if (request.type === 'institution') {
          updatedUser.institutionProfile = {
            ...targetUser.institutionProfile!,
            subscriptionStatus: 'none'
          };
        }
      }
      
      await updateDoc(doc(db, 'users', request.userId), updatedUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subscriptionRequests/${request.id}`);
      throw error;
    }
  }
};
