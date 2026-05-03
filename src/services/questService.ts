import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { User } from '@/types';

const generateDailyQuests = (date: string) => {
  return [
    {
      id: `login-${date}`,
      title: "Se connecter 3 jours de suite",
      target: 3,
      progress: 0, // This will be overriden by streak logic
      completed: false,
      type: 'login' as const,
      reward: 50,
    },
    {
      id: `quiz-${date}`,
      title: "Répondre à 5 quiz",
      target: 5,
      progress: 0,
      completed: false,
      type: 'quiz' as const,
      reward: 100,
    },
    {
      id: `doc-${date}`,
      title: "Consulter 3 documents",
      target: 3,
      progress: 0,
      completed: false,
      type: 'document' as const,
      reward: 75,
    }
  ];
};

export const questService = {
  async initializeDailyQuests(user: User): Promise<User> {
    const today = new Date().toISOString().split('T')[0];
    const userDate = user.dailyQuests?.date;

    let updatedUser = { ...user };
    let needsUpdate = false;

    // Check if streak needs update
    let newStreak = { current: 0, longest: 0, lastLoginDate: '' };
    if (user.streak) {
       newStreak = { ...user.streak };
    }

    if (newStreak.lastLoginDate !== today) {
       needsUpdate = true;
       if (newStreak.lastLoginDate) {
          const lastDate = new Date(newStreak.lastLoginDate);
          const currentDate = new Date(today);
          const diffDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          
          if (diffDiff === 1) {
             newStreak.current += 1;
             newStreak.longest = Math.max(newStreak.longest, newStreak.current);
          } else {
             newStreak.current = 1;
          }
       } else {
          newStreak.current = 1;
          newStreak.longest = 1;
       }
       newStreak.lastLoginDate = today;
       updatedUser.streak = newStreak;
    }

    if (userDate !== today) {
      needsUpdate = true;
      updatedUser.dailyQuests = {
        date: today,
        quests: generateDailyQuests(today),
      };
      
      // Update login quest based on streak
      const loginQuest = updatedUser.dailyQuests.quests.find(q => q.type === 'login');
      if (loginQuest) {
         loginQuest.progress = updatedUser.streak?.current || 1;
         if (loginQuest.progress >= loginQuest.target) {
            loginQuest.completed = true;
            // Reward would be added here
            updatedUser.rankingScore = (updatedUser.rankingScore || 0) + loginQuest.reward;
         }
      }
    }

    if (needsUpdate) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          dailyQuests: updatedUser.dailyQuests,
          streak: updatedUser.streak,
          rankingScore: updatedUser.rankingScore || 0
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      }
    }

    return updatedUser;
  },

  async updateQuestProgress(user: User, type: 'quiz' | 'document' | 'post' | 'comment' | 'login', amount: number = 1): Promise<User | null> {
    const today = new Date().toISOString().split('T')[0];
    if (!user.dailyQuests || user.dailyQuests.date !== today) {
       return null; // Should be initialized first
    }

    let updated = false;
    let newScore = user.rankingScore || 0;
    const newQuests = user.dailyQuests.quests.map(quest => {
      if (quest.type === type && !quest.completed) {
        const newProgress = quest.progress + amount;
        const mapped = { ...quest, progress: newProgress };
        if (newProgress >= quest.target) {
           mapped.completed = true;
           newScore += quest.reward;
           updated = true;
        } else if (newProgress !== quest.progress) {
           updated = true;
        }
        return mapped;
      }
      return quest;
    });

    if (updated) {
       try {
           await updateDoc(doc(db, 'users', user.id), {
              'dailyQuests.quests': newQuests,
              rankingScore: newScore
           });
           return { ...user, dailyQuests: { date: today, quests: newQuests }, rankingScore: newScore };
       } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
       }
    }

    return null;
  }
};
