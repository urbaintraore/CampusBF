import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { Quiz, QuizResult, QuestionBankItem } from '@/types';

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
  },

  async saveQuizResult(result: Omit<QuizResult, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'quizResults'), {
        ...result,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizResults');
      throw error;
    }
  },

  async getQuizResultsByUser(userId: string): Promise<QuizResult[]> {
    try {
      const q = query(collection(db, 'quizResults'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'quizResults');
      return [];
    }
  },

  async saveToQuestionBank(question: Omit<QuestionBankItem, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'questionBank'), {
        ...question,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'questionBank');
      throw error;
    }
  },

  async getQuestionBank(): Promise<QuestionBankItem[]> {
    try {
      const q = query(collection(db, 'questionBank'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBankItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'questionBank');
      return [];
    }
  }
};
