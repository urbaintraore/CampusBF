import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { User, Group } from '@/types';
import { logService } from './logService';

export const communityService = {
  async createGroup(user: User, data: Omit<Group, 'id' | 'members' | 'createdAt'>) {
    try {
      const newGroup = {
        ...data,
        members: [user.id],
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'communityGroups'), newGroup);
      await logService.logAction(user, 'Création groupe', `Groupe: ${data.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'communityGroups');
      throw error;
    }
  },

  async addGroupMember(user: User, groupId: string, userId: string) {
    try {
      await updateDoc(doc(db, 'communityGroups', groupId), {
        members: arrayUnion(userId)
      });
      await logService.logAction(user, 'Ajout membre groupe', `Groupe ID: ${groupId}, Membre ID: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `communityGroups/${groupId}`);
      throw error;
    }
  },

  async removeGroupMember(user: User, groupId: string, userId: string) {
    try {
      await updateDoc(doc(db, 'communityGroups', groupId), {
        members: arrayRemove(userId)
      });
      await logService.logAction(user, 'Retrait membre groupe', `Groupe ID: ${groupId}, Membre ID: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `communityGroups/${groupId}`);
      throw error;
    }
  },

  async ensureUserInCommunityGroup(userId: string) {
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('name', '==', 'Communauté'));
      const querySnapshot = await getDocs(q);
      
      let communityGroupId = '';
      if (querySnapshot.empty) {
        const newGroup = await addDoc(groupsRef, {
          name: 'Communauté',
          description: 'Groupe général pour toute la communauté CampusBF',
          category: 'university',
          members: [userId],
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        });
        communityGroupId = newGroup.id;
      } else {
        const groupDoc = querySnapshot.docs[0];
        communityGroupId = groupDoc.id;
        const members = groupDoc.data().members || [];
        if (!members.includes(userId)) {
          await updateDoc(doc(db, 'groups', communityGroupId), {
            members: arrayUnion(userId)
          });
        }
      }
    } catch (error) {
      console.error("Error ensuring user in community group:", error);
    }
  },

  async syncCommunityGroup(adminUser: User, users: User[]) {
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('name', '==', 'Communauté'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        await addDoc(groupsRef, {
          name: 'Communauté',
          description: 'Groupe général pour toute la communauté CampusBF',
          category: 'university',
          members: users.map(u => u.id),
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        });
      } else {
        const groupDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'groups', groupDoc.id), {
          members: users.map(u => u.id)
        });
      }
      await logService.logAction(adminUser, 'Synchronisation groupe communauté', 'Mise à jour de la liste des membres');
    } catch (error) {
      console.error("Error syncing community group:", error);
    }
  }
};
