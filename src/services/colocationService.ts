import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { Colocation, ColocationRequest, ColocationReview, User } from '@/types';

export const colocationService = {
  async createColocation(user: User, colocation: Omit<Colocation, 'id' | 'createdAt' | 'ownerId' | 'ownerName' | 'ownerAvatar'>): Promise<string> {
    try {
      // Check if user is student
      if (user.role !== 'student' && user.role !== 'admin') {
        throw new Error('Seuls les étudiants peuvent publier des annonces de colocation.');
      }

      // Check if user profile is complete
      if (!user.university || !user.level || !user.city) {
        throw new Error('Veuillez compléter votre profil (université, niveau d\'étude, ville) avant de publier.');
      }

      const docRef = await addDoc(collection(db, 'colocations'), {
        ...colocation,
        ownerId: user.id,
        ownerName: `${user.firstName} ${user.lastName}`,
        ownerAvatar: user.avatarUrl,
        status: 'active',
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'colocations');
      throw error;
    }
  },

  async updateColocation(id: string, data: Partial<Colocation>): Promise<void> {
    try {
      const docRef = doc(db, 'colocations', id);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `colocations/${id}`);
      throw error;
    }
  },

  async deleteColocation(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'colocations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `colocations/${id}`);
      throw error;
    }
  },

  async sendRequest(user: User, request: Omit<ColocationRequest, 'id' | 'createdAt' | 'senderId' | 'senderName' | 'senderAvatar' | 'senderUniversity' | 'senderLevel' | 'status'>): Promise<string> {
    try {
      if (!user.university || !user.level) {
        throw new Error('Veuillez compléter votre profil avant d\'envoyer une demande.');
      }

      const docRef = await addDoc(collection(db, 'colocation_requests'), {
        ...request,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        senderAvatar: user.avatarUrl,
        senderUniversity: user.university,
        senderLevel: user.level,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'colocation_requests');
      throw error;
    }
  },

  async updateRequestStatus(id: string, status: 'accepted' | 'rejected'): Promise<void> {
    try {
      const docRef = doc(db, 'colocation_requests', id);
      await updateDoc(docRef, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `colocation_requests/${id}`);
      throw error;
    }
  },

  async addReview(user: User, review: Omit<ColocationReview, 'id' | 'createdAt' | 'authorId' | 'authorName'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'colocation_reviews'), {
        ...review,
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'colocation_reviews');
      throw error;
    }
  }
};
