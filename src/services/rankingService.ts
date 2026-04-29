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

    let allUsers: User[] = _usersFallback;
    let allDocuments: Document[] = [];

    try {
      const now = Date.now();
      const usersCache = sessionStorage.getItem('ranking_full_users');
      const usersTime = sessionStorage.getItem('ranking_full_users_time');
      
      if (usersCache && usersTime && now - parseInt(usersTime) < 3600000) {
        allUsers = JSON.parse(usersCache);
      } else {
        const q = query(collection(db, 'users'), limit(5000));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data() as User);
        if (data.length > 0) allUsers = data;
        try {
          sessionStorage.setItem('ranking_full_users', JSON.stringify(data));
          sessionStorage.setItem('ranking_full_users_time', now.toString());
        } catch(e) {}
      }
      
      const docsCache = sessionStorage.getItem('ranking_full_docs');
      const docsTime = sessionStorage.getItem('ranking_full_docs_time');
      
      if (docsCache && docsTime && now - parseInt(docsTime) < 3600000) {
        allDocuments = JSON.parse(docsCache);
      } else {
        const qDocs = query(collection(db, 'documents'), limit(5000));
        const snapDocs = await getDocs(qDocs);
        const dataDocs = snapDocs.docs.map(d => d.data() as Document);
        if (dataDocs.length > 0) allDocuments = dataDocs;
        try {
          sessionStorage.setItem('ranking_full_docs', JSON.stringify(dataDocs));
          sessionStorage.setItem('ranking_full_docs_time', now.toString());
        } catch(e) {}
      }
    } catch(error) {
      console.error("Error fetching full ranking stats, falling back to local memory", error);
    }

    allUsers.forEach(user => {
      if (!user.university) return;
      
      const rawName = user.university.trim();
      const { normName, displayName } = getCanonicalUniversity(rawName);
      
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
          originalNames: {},
          canonicalName: displayName
        };
      }

      // Track how many times each variation is used to pick the most common/best display name later
      normalizedMap[normName].originalNames[rawName] = (normalizedMap[normName].originalNames[rawName] || 0) + 1;
      
      normalizedMap[normName].stat.studentCount += 1;
      normalizedMap[normName].stat.totalScore += (user.rankingScore || 0);
    });

    // Phase 2: Fetch document count and downloads per university
    try {
      allDocuments.forEach(doc => {
        if (!doc.university) return;
        
        const { normName, displayName } = getCanonicalUniversity(doc.university);
        
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
              originalNames: { [doc.university.trim()]: 1 },
              canonicalName: displayName
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
      console.error("Error calculating document rankings:", error);
    }

    // Phase 3: Finalize and pick the best display name
    return Object.values(normalizedMap)
      .map(entry => {
        let finalName = entry.canonicalName;
        
        if (!finalName) {
          // Pick the most frequent original name as the display name
          finalName = Object.entries(entry.originalNames)
            .sort((a, b) => b[1] - a[1])[0][0];
        }
        
        return {
          ...entry.stat,
          university: finalName
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((uni, index) => ({ ...uni, rank: index + 1 }));
  }
};
