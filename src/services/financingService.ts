import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { User } from '@/types';
import { useState, useEffect, useCallback } from 'react';

export interface FinancingDocument {
  id: string;
  type: 'inscription' | 'notes' | 'identity' | 'cv' | string;
  name: string;
  status: 'pending' | 'ready' | 'invalid' | string;
  url: string;
  uploadedAt: string;
}

export interface FinancingProfile {
  id: string; // Matches user.id
  userId: string;
  userEmail: string;
  userName: string;
  academicLevel: string;
  academicLevelScore: number;
  profileCompletionScore: number;
  activityScore: number;
  documentsScore: number;
  totalEligibilityScore: number;
  eligibilityBadge: 'Peu Éligible' | 'Moyennement Éligible' | 'Très Éligible' | 'Excellent';
  documents: FinancingDocument[];
  createdAt: any;
  updatedAt: any;
}

export interface InstitutionalScholarship {
  id?: string;
  titre: string;
  pays: string;
  niveau: string;
  domaine: string;
  description: string;
  montant: string | number;
  date_limite: string;
  lien_officiel?: string;
  source: string;
  createdBy: string;
  createdAt?: any;
  date_publication?: any;
}

export interface AidApplication {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: 'bourse_nationale' | 'aide_logement' | 'aide_transport' | 'aide_scolarite' | 'aide_alimentaire' | 'aide_manuels';
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt: any;
  scholarshipId?: string;
  scholarshipTitle?: string;
}

/**
 * Scoring engine that calculates user's financing eligibility score.
 * Sum is out of 100 points maximum.
 */
export async function calculateEligibilityScore(
  user: User,
  documents: FinancingDocument[]
): Promise<{
  academicLevelScore: number;
  profileCompletionScore: number;
  activityScore: number;
  documentsScore: number;
  totalEligibilityScore: number;
  eligibilityBadge: 'Peu Éligible' | 'Moyennement Éligible' | 'Très Éligible' | 'Excellent';
}> {
  // 1. Academic Level Score (Max 30 points)
  // License/L1/L2/L3 represents maximum priority/necessity for financing aids
  let academicLevelScore = 5;
  const level = (user.level || '').toUpperCase();
  if (level) {
    if (level.includes('L1') || level.includes('L2') || level.includes('L3') || level.includes('LICENCE')) {
      academicLevelScore = 30;
    } else if (level.includes('M1') || level.includes('M2') || level.includes('MASTER')) {
      academicLevelScore = 20;
    } else if (level.includes('D1') || level.includes('D2') || level.includes('D3') || level.includes('DOCTORAT')) {
      academicLevelScore = 15;
    }
  }

  // 2. Profile Completion Score (Max 30 points)
  let profileCompletionScore = 0;
  if (user.firstName && user.lastName) profileCompletionScore += 10;
  if (user.university) profileCompletionScore += 5;
  if (user.major) profileCompletionScore += 5;
  if (user.ine) profileCompletionScore += 5;
  if (user.phone) profileCompletionScore += 3;
  if (user.city || user.neighborhood) profileCompletionScore += 2;

  // 3. Uploaded Document Status Score (Max 20 points)
  // 5 points per uploaded document, 5 points extra bonus if document is approved/ready
  let documentsScore = 0;
  if (documents && documents.length > 0) {
    documents.forEach(doc => {
      let benefit = 5; // uploaded
      if (doc.status === 'ready') {
        benefit += 5; // approved/verified
      }
      documentsScore += benefit;
    });
    if (documentsScore > 20) documentsScore = 20;
  }

  // 4. Existing CampusBF Activities Score (Max 20 points)
  let activityScore = 0;

  // A: Check shared documents
  try {
    const docsQuery = query(collection(db, 'processed_documents'), where('uploadedBy', '==', user.id));
    const docsSnapshot = await getDocs(docsQuery);
    if (!docsSnapshot.empty) {
      activityScore += 10;
    } else if (user.contributionCount && user.contributionCount > 0) {
      activityScore += 10;
    }
  } catch (error) {
    console.warn("[Scoring Engine] Error retrieving user shared documents:", error);
    if (user.contributionCount && user.contributionCount > 0) {
      activityScore += 10;
    }
  }

  // B: Check Quiz attempts
  try {
    const quizResultsQuery = query(collection(db, 'quizResults'), where('userId', '==', user.id));
    const resultsSnapshot = await getDocs(quizResultsQuery);
    if (!resultsSnapshot.empty) {
      activityScore += 5;
    } else {
      const psResultsQuery = query(collection(db, 'public_service_results'), where('user_id', '==', user.id));
      const psSnapshot = await getDocs(psResultsQuery);
      if (!psSnapshot.empty) {
        activityScore += 5;
      }
    }
  } catch (error) {
    console.warn("[Scoring Engine] Error checking quiz/contest activities:", error);
  }

  // C: Check referrals (At least one invite)
  if ((user.referralsCount && user.referralsCount > 0) || (user.inviteCount && user.inviteCount > 0)) {
    activityScore += 5;
  }

  if (activityScore > 20) activityScore = 20;

  // Total Eligibility Score out of 100
  const totalEligibilityScore = academicLevelScore + profileCompletionScore + activityScore + documentsScore;

  // Calculate Eligibility Badge Designation
  let eligibilityBadge: 'Peu Éligible' | 'Moyennement Éligible' | 'Très Éligible' | 'Excellent' = 'Peu Éligible';
  if (totalEligibilityScore >= 80) {
    eligibilityBadge = 'Excellent';
  } else if (totalEligibilityScore >= 60) {
    eligibilityBadge = 'Très Éligible';
  } else if (totalEligibilityScore >= 40) {
    eligibilityBadge = 'Moyennement Éligible';
  }

  return {
    academicLevelScore,
    profileCompletionScore,
    activityScore,
    documentsScore,
    totalEligibilityScore,
    eligibilityBadge
  };
}

/**
 * Service handlers for the Financing module
 */
export const financingService = {
  /**
   * Retrieves user's eligibility profile
   */
  getProfile: async (userId: string): Promise<FinancingProfile | null> => {
    const path = `financing_profiles/${userId}`;
    try {
      const docRef = doc(db, 'financing_profiles', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as FinancingProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  /**
   * Updates or saves user eligibility profile
   */
  saveProfile: async (userId: string, profile: FinancingProfile): Promise<void> => {
    const path = `financing_profiles/${userId}`;
    try {
      const docRef = doc(db, 'financing_profiles', userId);
      await setDoc(docRef, profile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Submits a new financial student aid application
   */
  applyForAid: async (application: Omit<AidApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const path = 'aid_applications';
    try {
      const payload = {
        ...application,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'aid_applications'), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  /**
   * Returns aid applications submitted by a certain user
   */
  getUserApplications: async (userId: string): Promise<AidApplication[]> => {
    const path = 'aid_applications';
    try {
      const q = query(
        collection(db, 'aid_applications'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const applications: AidApplication[] = [];
      snapshot.forEach(docSnap => {
        applications.push({
          id: docSnap.id,
          ...docSnap.data()
        } as AidApplication);
      });
      return applications;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  /**
   * Returns all aid applications (Admin panel view)
   */
  getAllApplications: async (): Promise<AidApplication[]> => {
    const path = 'aid_applications';
    try {
      const q = collection(db, 'aid_applications');
      const snapshot = await getDocs(q);
      const applications: AidApplication[] = [];
      snapshot.forEach(docSnap => {
        applications.push({
          id: docSnap.id,
          ...docSnap.data()
        } as AidApplication);
      });
      return applications;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  /**
   * Updates the status of an application (Admin action)
   */
  updateApplicationStatus: async (applicationId: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> => {
    const path = `aid_applications/${applicationId}`;
    try {
      const docRef = doc(db, 'aid_applications', applicationId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Deletes an aid application (User cancel action)
   */
  deleteApplication: async (applicationId: string): Promise<void> => {
    const path = `aid_applications/${applicationId}`;
    try {
      const docRef = doc(db, 'aid_applications', applicationId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Retrieves all administrator and mentor published scholarships
   */
  getScholarships: async (): Promise<InstitutionalScholarship[]> => {
    const path = 'scholarships';
    try {
      const q = collection(db, 'scholarships');
      const snapshot = await getDocs(q);
      const list: InstitutionalScholarship[] = [];
      snapshot.forEach(docSnap => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        } as InstitutionalScholarship);
      });

      return list;
    } catch (error) {
      console.error("Error holding scholarships:", error);
      return [];
    }
  },

  /**
   * Publishes an institutional or mentor scholarship
   */
  publishScholarship: async (scholarship: Omit<InstitutionalScholarship, 'id' | 'createdAt' | 'date_publication'>): Promise<string> => {
    const path = 'scholarships';
    try {
      const payload = {
        ...scholarship,
        createdAt: serverTimestamp(),
        date_publication: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'scholarships'), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  /**
   * Deletes a published local scholarship
   */
  deleteScholarship: async (scholarshipId: string): Promise<void> => {
    const path = `scholarships/${scholarshipId}`;
    try {
      const docRef = doc(db, 'scholarships', scholarshipId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }
};

/**
 * Custom hook to safely maintain, sync, and create user financing profile
 */
export function useFinancingProfile(user: User | null) {
  const [profile, setProfile] = useState<FinancingProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorString, setErrorString] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorString(null);

      // Check if financing profile exists
      let storedProfile = await financingService.getProfile(user.id);

      if (!storedProfile) {
        console.log(`[Financing Hook] No profile found for user ${user.id}. Creating a new one...`);
        // Calculate initial scores based on user object and 0 documents
        const scores = await calculateEligibilityScore(user, []);
        
        const newProfile: FinancingProfile = {
          id: user.id,
          userId: user.id,
          userEmail: user.email || 'student@campusbf.org',
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Étudiant',
          academicLevel: user.level || 'Non défini',
          documents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...scores
        };

        await financingService.saveProfile(user.id, newProfile);
        storedProfile = newProfile;
      } else {
        // Automatically check if academic properties or user details changed and re-evaluate score
        const scores = await calculateEligibilityScore(user, storedProfile.documents);
        
        const updatedProfile: FinancingProfile = {
          ...storedProfile,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || storedProfile.userName,
          academicLevel: user.level || storedProfile.academicLevel,
          updatedAt: new Date().toISOString(),
          ...scores
        };

        if (
          storedProfile.totalEligibilityScore !== updatedProfile.totalEligibilityScore ||
          storedProfile.academicLevelScore !== updatedProfile.academicLevelScore ||
          storedProfile.profileCompletionScore !== updatedProfile.profileCompletionScore ||
          storedProfile.activityScore !== updatedProfile.activityScore ||
          storedProfile.documentsScore !== updatedProfile.documentsScore
        ) {
          console.log("[Financing Hook] Re-scoring triggered due to user details updates.");
          await financingService.saveProfile(user.id, updatedProfile);
          storedProfile = updatedProfile;
        }
      }

      if (storedProfile) {
        try {
          localStorage.setItem(`campusbf_financing_profile_${user.id}`, JSON.stringify(storedProfile));
        } catch (e) {}
      }
      setProfile(storedProfile);
    } catch (err: any) {
      console.warn("[Financing Hook] Could not read profile from Firestore, attempting local storage recovery:", err);
      
      const cacheKey = `campusbf_financing_profile_${user.id}`;
      let cachedData: FinancingProfile | null = null;
      try {
        const localVal = localStorage.getItem(cacheKey);
        if (localVal) {
          cachedData = JSON.parse(localVal);
        }
      } catch (localErr) {
        console.warn("localStorage read failed:", localErr);
      }

      if (cachedData) {
        console.log("[Financing Hook] Successfully recovered profile from local cache.");
        setProfile(cachedData);
      } else {
        // Build a beautiful default profile if no cache exists yet
        const defaultProfile: FinancingProfile = {
          id: user.id,
          userId: user.id,
          userEmail: user.email || 'student@campusbf.org',
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Étudiant',
          academicLevel: user.level || 'Non défini',
          documents: [],
          academicLevelScore: 10,
          profileCompletionScore: 10,
          activityScore: 5,
          documentsScore: 0,
          totalEligibilityScore: 25,
          eligibilityBadge: 'Peu Éligible',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setProfile(defaultProfile);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Triggers upload of a new student verification document
   */
  const uploadDocument = async (type: string, name: string, urlPlaceholder: string = '') => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      const newDoc: FinancingDocument = {
        id: `doc_${Date.now()}`,
        type,
        name,
        status: 'pending',
        url: urlPlaceholder || `https://firebasestorage.googleapis.com/v0/b/mock-file-service/o/${type}.pdf?alt=media`,
        uploadedAt: new Date().toISOString()
      };

      const updatedDocs = [...profile.documents, newDoc];
      const scores = await calculateEligibilityScore(user, updatedDocs);

      const updatedProfile: FinancingProfile = {
        ...profile,
        documents: updatedDocs,
        updatedAt: new Date().toISOString(),
        ...scores
      };

      await financingService.saveProfile(user.id, updatedProfile);
      setProfile(updatedProfile);
    } catch (err: any) {
      console.error("[Financing Hook] Document upload error:", err);
      setErrorString(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Revokes or deletes an uploaded verification document
   */
  const removeDocument = async (docId: string) => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      const updatedDocs = profile.documents.filter(d => d.id !== docId);
      const scores = await calculateEligibilityScore(user, updatedDocs);

      const updatedProfile: FinancingProfile = {
        ...profile,
        documents: updatedDocs,
        updatedAt: new Date().toISOString(),
        ...scores
      };

      await financingService.saveProfile(user.id, updatedProfile);
      setProfile(updatedProfile);
    } catch (err: any) {
      console.error("[Financing Hook] Document removal error:", err);
      setErrorString(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error: errorString,
    refresh: fetchProfile,
    uploadDocument,
    removeDocument
  };
}
