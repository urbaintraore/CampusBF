import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { Quiz } from '@/types';

export const quizService = {
  async getQuizzes(): Promise<Quiz[]> {
    try {
      const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'quizzes');
      return [];
    }
  },

  async addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'quizzes'), {
        ...quiz,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
      throw error;
    }
  },

  async deleteQuiz(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'quizzes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quizzes/${id}`);
      throw error;
    }
  }
};
