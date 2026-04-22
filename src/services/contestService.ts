import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { User, Contest, ContestParticipant, ContestWinner } from '@/types';
import { logService } from './logService';
import { referralService } from './referralService';

export const contestService = {
  async createContest(user: User, contest: Omit<Contest, 'id' | 'createdAt'>) {
    try {
      const contestData = {
        ...contest,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'contests'), contestData);
      await logService.logAction(user, 'Création concours', `Titre: ${contest.title}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contests');
      throw error;
    }
  },

  async updateContest(user: User, id: string, data: Partial<Contest>) {
    try {
      await updateDoc(doc(db, 'contests', id), data);
      await logService.logAction(user, 'Modification concours', `ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contests/${id}`);
      throw error;
    }
  },

  async deleteContest(user: User, id: string) {
    try {
      await deleteDoc(doc(db, 'contests', id));
      
      const participantsQuery = query(collection(db, 'contest_participants'), where('contestId', '==', id));
      const participantsSnapshot = await getDocs(participantsQuery);
      for (const participantDoc of participantsSnapshot.docs) {
        await deleteDoc(participantDoc.ref);
      }
      
      await logService.logAction(user, 'Suppression concours', `ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `contests/${id}`);
      throw error;
    }
  },

  async registerForContest(user: User, contest: Contest, participantsCount: number, alreadyRegistered: boolean) {
    try {
      if (contest.conditions.requireVerifiedProfile && !user.isVerified) {
        throw new Error('Votre profil doit être vérifié pour participer à ce concours');
      }

      if (participantsCount >= contest.maxParticipants) {
        throw new Error('Le nombre maximum de participants est atteint');
      }

      if (alreadyRegistered) {
        throw new Error('Vous êtes déjà inscrit à ce concours');
      }

      if (contest.conditions.minInvites > 0) {
        const referralCount = user.inviteCount || 0;
        if (referralCount < contest.conditions.minInvites) {
          throw new Error(`Vous devez inviter au moins ${contest.conditions.minInvites} personnes pour participer. (Actuel: ${referralCount})`);
        }
      }

      const participantId = `${contest.id}_${user.id}`;
      const participantData: Omit<ContestParticipant, 'id'> = {
        contestId: contest.id,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userAvatar: user.avatarUrl,
        status: 'pending',
        registrationDate: new Date().toISOString(),
        stats: {},
        totalScore: 0
      };

      await setDoc(doc(db, 'contest_participants', participantId), participantData);
      await logService.logAction(user, 'Inscription concours', `Concours: ${contest.title}`);
    } catch (error: any) {
      if (error.message.includes('Votre profil') || error.message.includes('Le nombre maximum') || error.message.includes('Vous êtes déjà')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.CREATE, 'contest_participants');
      throw error;
    }
  },

  async updateParticipantStatus(user: User, participantId: string, status: ContestParticipant['status']) {
    try {
      await updateDoc(doc(db, 'contest_participants', participantId), { status });
      await logService.logAction(user, 'Mise à jour statut participant', `ID: ${participantId}, Statut: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contest_participants/${participantId}`);
      throw error;
    }
  },

  async publishContestResults(user: User, contestId: string, winners: ContestWinner[]) {
    try {
      await updateDoc(doc(db, 'contests', contestId), { 
        status: 'results_published',
        winners 
      });
      await logService.logAction(user, 'Publication résultats concours', `ID: ${contestId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contests/${contestId}`);
      throw error;
    }
  }
};
