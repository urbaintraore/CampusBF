import { 
  collection, 
  getDocs,
  query,
  limit,
  where,
  orderBy
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

const getCanonicalUniversity = (rawName: string): { normName: string, displayName: string | null } => {
  if (!rawName) return { normName: "", displayName: null };
  const rawLower = rawName.toLowerCase();

  if (rawLower.includes("joseph ki") || rawLower.includes("ujkz")) {
    return { normName: "ujkz", displayName: "Université Joseph KI-ZERBO" };
  }
  if (rawLower.includes("virtuelle") || rawLower === "uvbf" || rawLower.includes("uvbf")) {
    return { normName: "uvbf", displayName: "Université Virtuelle du Burkina Faso" };
  }
  if (rawLower.includes("thomas d'aquin") || rawLower.includes("thomas d aquin") || rawLower === "usta" || rawLower.includes("usta")) {
    return { normName: "usta", displayName: "Université Saint Thomas d'Aquin" };
  }
  
  let n = rawName
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
  
  return { normName: n, displayName: null };
};

export const rankingService = {
  async getUniversityRankings(_usersFallback: User[]): Promise<UniversityStat[]> {
    // Phase 1: Aggregate data from users
    // We use a map with normalized names as keys to group variations together
    const normalizedMap: Record<string, { stat: UniversityStat; originalNames: Record<string, number>; canonicalName: string | null }> = {};

    let allUsers: User[] = _usersFallback || [];
    let allDocuments: Document[] = [];

    try {
      const now = Date.now();
      const statsCache = localStorage.getItem('local_cache_uni_rankings');
      const statsTime = localStorage.getItem('local_cache_uni_rankings_time');
      
      // Cache valid for 24 hours to save quota
      if (statsCache && statsTime && now - parseInt(statsTime) < 86400000) {
        return JSON.parse(statsCache);
      }

      // To save quota, we pull only a small subset or use an aggregation strategy.
      // Since we don't have cloud functions, let's limit to 100 recent active users and 100 docs
      // to get a representative sample without blowing the quota.
      // In a real production app, this should be done via a dedicated stats collection.
      
      console.log("Fetching sample data for university rankings calculation...");
      const [uSnap, dSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('rankingScore', '>', 0), orderBy('rankingScore', 'desc'), limit(150))),
        getDocs(query(collection(db, 'documents'), orderBy('downloads', 'desc'), limit(150)))
      ]);
      
      allUsers = uSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      allDocuments = dSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    } catch(error) {
      console.error("Error fetching ranking stats:", error);
    }

    allUsers.forEach(user => {
      if (!user.university) return;
      
      const rawName = user.university.trim();
      const { normName, displayName } = getCanonicalUniversity(rawName);
      
      if (!normName) return;

      if (!normalizedMap[normName]) {
        normalizedMap[normName] = {
          stat: {
            university: rawName,
            studentCount: 0,
            documentCount: 0,
            totalScore: 0,
            totalDownloads: 0
          },
          originalNames: {},
          canonicalName: displayName
        };
      }

      normalizedMap[normName].originalNames[rawName] = (normalizedMap[normName].originalNames[rawName] || 0) + 1;
      normalizedMap[normName].stat.studentCount += 1;
      normalizedMap[normName].stat.totalScore += (user.rankingScore || 0);
    });

    try {
      allDocuments.forEach(doc => {
        if (!doc.university) return;
        
        const { normName, displayName } = getCanonicalUniversity(doc.university);
        
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
              originalNames: { [doc.university.trim()]: 1 },
              canonicalName: displayName
            };
          }

          const entry = normalizedMap[normName];
          entry.stat.documentCount += 1;
          entry.stat.totalDownloads += (doc.downloads || 0);
          entry.stat.totalScore += 50;
          entry.stat.totalScore += (doc.downloads || 0) * 2;
        }
      });
    } catch (error) {
      console.error("Error calculating document rankings:", error);
    }

    const result = Object.values(normalizedMap)
      .map(entry => {
        let finalName = entry.canonicalName;
        if (!finalName) {
          const names = Object.entries(entry.originalNames);
          if (names.length > 0) {
            finalName = names.sort((a, b) => b[1] - a[1])[0][0];
          } else {
            finalName = entry.stat.university;
          }
        }
        
        return {
          ...entry.stat,
          university: finalName
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((uni, index) => ({ ...uni, rank: index + 1 }));

    try {
      localStorage.setItem('local_cache_uni_rankings', JSON.stringify(result));
      localStorage.setItem('local_cache_uni_rankings_time', Date.now().toString());
    } catch (e) {}

    return result;
  }
};

