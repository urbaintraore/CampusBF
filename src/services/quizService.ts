import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Quiz, QuizResult, QuestionBankItem } from '@/types';

export const quizService = {
  async getQuizzes(): Promise<Quiz[]> {
    try {
      const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      
      // If we got no results, try without ordering to catch docs missing createdAt
      if (quizzes.length === 0) {
        const fallbackQ = query(collection(db, 'quizzes'));
        const fallbackSnapshot = await getDocs(fallbackQ);
        const allQuizzes = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
        
        return allQuizzes.sort((a: any, b: any) => {
          const t1 = a.createdAt?.seconds || 0;
          const t2 = b.createdAt?.seconds || 0;
          return t2 - t1;
        });
      }
      
      return quizzes;
    } catch (error: any) {
      // If index error (most likely cause for failure in new environments)
      if (error?.message?.includes('index')) {
        const fallbackQ = query(collection(db, 'quizzes'));
        const fallbackSnapshot = await getDocs(fallbackQ);
        return fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      }
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

  async updateQuiz(id: string, quizData: Partial<Quiz>): Promise<void> {
    try {
      if (quizData.id) delete quizData.id;
      // Do not update createdAt
      if (quizData.createdAt) delete quizData.createdAt;

      await updateDoc(doc(db, 'quizzes', id), {
        ...quizData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quizzes/${id}`);
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
      // Try with ordering first
      const q = query(
        collection(db, 'quizResults'), 
        where('userId', '==', userId), 
        orderBy('createdAt', 'desc'), 
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
    } catch (error: any) {
      // Fallback if index is missing (common in new projects)
      if (error?.message?.includes('index') || error?.code === 'failed-precondition') {
        console.warn("[QuizService] Index missing for quizResults, falling back to basic query");
        try {
          const fallbackQ = query(collection(db, 'quizResults'), where('userId', '==', userId), limit(50));
          const snapshot = await getDocs(fallbackQ);
          const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
          return results.sort((a, b) => {
             const t1 = (a as any).createdAt?.seconds || 0;
             const t2 = (b as any).createdAt?.seconds || 0;
             return t2 - t1;
          });
        } catch (innerError) {
          handleFirestoreError(innerError, OperationType.GET, 'quizResults-fallback');
          return [];
        }
      }
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
      // Limit to 100 recent questions to prevent massive reads
      const q = query(collection(db, 'questionBank'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBankItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'questionBank');
      return [];
    }
  }
};
