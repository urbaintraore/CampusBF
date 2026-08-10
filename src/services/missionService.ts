import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  orderBy,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Mission, MissionCandidature, MissionCategorie, MissionStatut, User } from '@/types';

export const missionService = {
  async createMission(missionData: Omit<Mission, 'id' | 'date_creation' | 'candidatures' | 'statut'>): Promise<string> {
    try {
      const newMission = {
        ...missionData,
        statut: 'publiee' as MissionStatut,
        candidatures: [],
        date_creation: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'missions'), newMission);
      return docRef.id;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'missions');
      throw error;
    }
  },

  async getAllMissions(): Promise<Mission[]> {
    try {
      const q = query(collection(db, 'missions'));
      const snapshot = await getDocs(q);
      const missions: Mission[] = [];
      snapshot.forEach(docSnap => {
        missions.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Mission);
      });
      // Sort in memory by date_creation descending
      missions.sort((a, b) => {
        const timeA = a.date_creation?.seconds || 0;
        const timeB = b.date_creation?.seconds || 0;
        return timeB - timeA;
      });
      return missions;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'missions');
      return [];
    }
  },

  async getCompanyMissions(entrepriseId: string): Promise<Mission[]> {
    try {
      const q = query(collection(db, 'missions'), where('entreprise_id', '==', entrepriseId));
      const snapshot = await getDocs(q);
      const missions: Mission[] = [];
      snapshot.forEach(docSnap => {
        missions.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Mission);
      });
      missions.sort((a, b) => {
        const timeA = a.date_creation?.seconds || 0;
        const timeB = b.date_creation?.seconds || 0;
        return timeB - timeA;
      });
      return missions;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'missions');
      return [];
    }
  },

  async applyToMission(missionId: string, candidature: MissionCandidature): Promise<void> {
    try {
      const missionRef = doc(db, 'missions', missionId);
      const docSnap = await getDoc(missionRef);
      if (!docSnap.exists()) {
        throw new Error("Mission introuvable.");
      }
      const data = docSnap.data() as Mission;
      const existingCandidatures = Array.isArray(data.candidatures) ? data.candidatures : [];
      
      // Check if already applied
      const alreadyApplied = existingCandidatures.some(c => c.etudiant_id === candidature.etudiant_id);
      if (alreadyApplied) {
        throw new Error("Vous avez déjà candidaté à cette mission.");
      }

      const updatedCandidatures = [...existingCandidatures, candidature];
      const nextStatus: MissionStatut = data.statut === 'publiee' ? 'en_candidature' : data.statut;

      await updateDoc(missionRef, {
        candidatures: updatedCandidatures,
        statut: nextStatus
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `missions/${missionId}`);
      throw error;
    }
  },

  async acceptCandidature(missionId: string, etudiantId: string): Promise<void> {
    try {
      const missionRef = doc(db, 'missions', missionId);
      const docSnap = await getDoc(missionRef);
      if (!docSnap.exists()) throw new Error("Mission introuvable.");
      const data = docSnap.data() as Mission;
      const candidatures = Array.isArray(data.candidatures) ? data.candidatures : [];

      let chosenCandidate: MissionCandidature | undefined;
      const updatedCandidatures = candidatures.map(c => {
        if (c.etudiant_id === etudiantId) {
          chosenCandidate = c;
          return { ...c, statut: 'acceptee' as const };
        }
        return { ...c, statut: 'refusee' as const };
      });

      if (!chosenCandidate) throw new Error("Candidat introuvable.");

      await updateDoc(missionRef, {
        candidatures: updatedCandidatures,
        statut: 'attribuee',
        attributaire_id: etudiantId,
        attributaire_nom: chosenCandidate.etudiant_nom || 'Étudiant'
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `missions/${missionId}`);
      throw error;
    }
  },

  async startMission(missionId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'missions', missionId), {
        statut: 'en_cours'
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `missions/${missionId}`);
      throw error;
    }
  },

  async deliverMission(missionId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'missions', missionId), {
        statut: 'livree'
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `missions/${missionId}`);
      throw error;
    }
  },

  async validateMission(missionId: string, note?: number, commentaire?: string): Promise<void> {
    try {
      const missionRef = doc(db, 'missions', missionId);
      const docSnap = await getDoc(missionRef);
      if (!docSnap.exists()) throw new Error("Mission introuvable.");
      const missionData = docSnap.data() as Mission;

      await updateDoc(missionRef, {
        statut: 'validee',
        note_attribuee: note || null,
        commentaire_evaluation: commentaire || ''
      });

      // Update student reputation/stats if there is an attributaire_id
      if (missionData.attributaire_id) {
        const userRef = doc(db, 'users', missionData.attributaire_id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          const currentStats = userData.missionsStats || { completed: 0, averageRating: 0, totalRatings: 0 };
          const newCompleted = (currentStats.completed || 0) + 1;
          
          let newAverage = currentStats.averageRating || 0;
          let newTotalRatings = currentStats.totalRatings || 0;

          if (note && note >= 1 && note <= 5) {
            const sumRating = (currentStats.averageRating || 0) * (currentStats.totalRatings || 0) + note;
            newTotalRatings = (currentStats.totalRatings || 0) + 1;
            newAverage = sumRating / newTotalRatings;
          }

          await updateDoc(userRef, {
            missionsStats: {
              completed: newCompleted,
              averageRating: Number(newAverage.toFixed(2)),
              totalRatings: newTotalRatings
            }
          });
        }
      }
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `missions/${missionId}`);
      throw error;
    }
  },

  async deleteMission(missionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'missions', missionId));
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `missions/${missionId}`);
      throw error;
    }
  }
};
