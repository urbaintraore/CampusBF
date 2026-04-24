import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Document } from '@/types';

export interface UniversityStat {
  university: string;
  studentCount: number;
  documentCount: number;
  totalScore: number;
  totalDownloads: number;
  rank?: number;
}

export const rankingService = {
  async getUniversityRankings(users: User[]): Promise<UniversityStat[]> {
    // Phase 1: Aggregate data from users already fetched in memory
    const universityMap: Record<string, UniversityStat> = {};

    users.forEach(user => {
      if (!user.university) return;
      
      const uni = user.university.trim();
      if (!universityMap[uni]) {
        universityMap[uni] = {
          university: uni,
          studentCount: 0,
          documentCount: 0,
          totalScore: 0,
          totalDownloads: 0
        };
      }

      universityMap[uni].studentCount += 1;
      universityMap[uni].totalScore += (user.rankingScore || 0);
    });

    // Phase 2: Fetch document count and downloads per university
    try {
      const docsSnapshot = await getDocs(collection(db, 'documents'));
      docsSnapshot.forEach(docSnap => {
        const doc = docSnap.data() as Document;
        if (!doc.university) return;
        
        const uni = doc.university.trim();
        if (universityMap[uni]) {
          universityMap[uni].documentCount += 1;
          universityMap[uni].totalDownloads += (doc.downloads || 0);
          // Reward university for content
          universityMap[uni].totalScore += 50; // Each doc adds 50 points to the school
          universityMap[uni].totalScore += (doc.downloads || 0) * 2; // Each download adds 2 points
        }
      });
    } catch (error) {
      console.error("Error fetching documents for ranking:", error);
    }

    // Convert to array and sort
    return Object.values(universityMap)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((uni, index) => ({ ...uni, rank: index + 1 }));
  }
};
