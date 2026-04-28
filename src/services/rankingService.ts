import { 
  collection, 
  getDocs,
  query,
  limit
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

/**
 * Normalizes university names to handle case insensitivity, accents,
 * typos, and variations in punctuation (dots, hyphens, etc).
 */
const normalizeUniversityName = (name: string): string => {
  if (!name) return "";
  let n = name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, ' ') // Replace dots, hyphens, etc with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  // Handle common abbreviations and variants
  // Example: "univ" -> "universite", "u j k z" -> "ujkz"
  n = n.replace(/\buniv\b/g, 'universite');
  n = n.replace(/\bu o\b/g, 'uo'); // Universite de Ouagadougou
  n = n.replace(/\bu o 1\b/g, 'uo1'); 
  n = n.replace(/\bu j k z\b/g, 'ujkz');
  
  return n;
};

export const rankingService = {
  async getUniversityRankings(users: User[]): Promise<UniversityStat[]> {
    // Phase 1: Aggregate data from users
    // We use a map with normalized names as keys to group variations together
    const normalizedMap: Record<string, { stat: UniversityStat; originalNames: Record<string, number> }> = {};

    users.forEach(user => {
      if (!user.university) return;
      
      const rawName = user.university.trim();
      const normName = normalizeUniversityName(rawName);
      
      if (!normName) return;

      if (!normalizedMap[normName]) {
        normalizedMap[normName] = {
          stat: {
            university: rawName, // Temporary display name
            studentCount: 0,
            documentCount: 0,
            totalScore: 0,
            totalDownloads: 0
          },
          originalNames: {}
        };
      }

      // Track how many times each variation is used to pick the most common/best display name later
      normalizedMap[normName].originalNames[rawName] = (normalizedMap[normName].originalNames[rawName] || 0) + 1;
      
      normalizedMap[normName].stat.studentCount += 1;
      normalizedMap[normName].stat.totalScore += (user.rankingScore || 0);
    });

    // Phase 2: Fetch document count and downloads per university
    try {
      const q = query(collection(db, 'documents'), limit(500));
      const docsSnapshot = await getDocs(q);
      docsSnapshot.forEach(docSnap => {
        const doc = docSnap.data() as Document;
        if (!doc.university) return;
        
        const normName = normalizeUniversityName(doc.university);
        
        // If this university exists in our student map (or we create it if it's new content)
        if (normName) {
          if (!normalizedMap[normName]) {
            normalizedMap[normName] = {
              stat: {
                university: doc.university.trim(),
                studentCount: 0,
                documentCount: 0,
                totalScore: 0,
                totalDownloads: 0
              },
              originalNames: { [doc.university.trim()]: 1 }
            };
          }

          const entry = normalizedMap[normName];
          entry.stat.documentCount += 1;
          entry.stat.totalDownloads += (doc.downloads || 0);
          entry.stat.totalScore += 50; // Each doc adds 50 points
          entry.stat.totalScore += (doc.downloads || 0) * 2; // Each download adds 2 points
        }
      });
    } catch (error) {
      console.error("Error fetching documents for ranking:", error);
    }

    // Phase 3: Finalize and pick the best display name
    return Object.values(normalizedMap)
      .map(entry => {
        // Pick the most frequent original name as the display name
        const bestName = Object.entries(entry.originalNames)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        return {
          ...entry.stat,
          university: bestName
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((uni, index) => ({ ...uni, rank: index + 1 }));
  }
};
