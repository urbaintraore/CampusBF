import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication, SubscriptionRequest, Ad, TeacherApplication, Notification, Internship, Group, CampusEvent, Report, News, LostAndFound, MarketplaceItem, Post, MotoRide, Log, Training, TrainingEnrollment, TrainingReview, TrainingReport, Contest, ContestParticipant, ContestWinner, Quiz, Deal, DealSuggestion, Colocation, ColocationRequest, ColocationReview } from '@/types';
import { ADMIN_USER, MOCK_APPLICATIONS, MOCK_USERS, MOCK_ADS, MOCK_NOTIFICATIONS } from '@/data/mock';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { documentService } from '@/services/documentService';
import { motoRideService } from '@/services/motoRideService';
import { logService } from '@/services/logService';
import { notificationService } from '@/services/notificationService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { internshipService } from '@/services/internshipService';
import { marketplaceService } from '@/services/marketplaceService';
import { contentService } from '@/services/contentService';
import { questService } from '@/services/questService';
import { reportService } from '@/services/reportService';
import { applicationService } from '@/services/applicationService';
import { userService } from '@/services/userService';
import { communityService } from '@/services/communityService';
import { adService } from '@/services/adService';
import { trainingService } from '@/services/trainingService';
import { contestService } from '@/services/contestService';
import { referralService } from '@/services/referralService';
import { quizService } from '@/services/quizService';
import { dealService } from '@/services/dealService';
import { colocationService } from '@/services/colocationService';
import { requestNotificationPermission } from '@/services/messagingService';
import { toast } from 'sonner';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection,
  getDocFromServer,
  addDoc,
  deleteDoc,
  query,
  or,
  where,
  serverTimestamp,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment,
  limit,
  orderBy
} from 'firebase/firestore';

async function fetchWithSessionCache(cacheKey: string, q: any) {
  const cached = localStorage.getItem(cacheKey);
  const cacheTime = localStorage.getItem(cacheKey + '_time');
  const now = Date.now();
  // Cache désormais persistant en localStorage (valide pour 12 heures)
  if (cached && cacheTime && now - parseInt(cacheTime) < 43200000) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }
  
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  try {
    // Basic serialization to remove non-serializable Firestore objects (Timestamps, References)
    const serializableData = data.map(item => {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(item)) {
        if (value && typeof value === 'object') {
          if ('seconds' in value && 'nanoseconds' in value) {
            // Firestore Timestamp fallback
            sanitized[key] = new Date((value as any).seconds * 1000).toISOString();
          } else if ('_firestore' in value || 'path' in value) {
            // Firestore Reference fallback
            sanitized[key] = (value as any).path || '[Reference]';
          } else {
            sanitized[key] = value;
          }
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    });

    localStorage.setItem(cacheKey, JSON.stringify(serializableData));
    localStorage.setItem(cacheKey + '_time', now.toString());
  } catch (e) {
    console.warn("Storage quota full or serialization failed:", e);
  }
  return data;
}

async function fetchCountWithSessionCache(cacheKey: string, ref: any) {
  const cached = localStorage.getItem(cacheKey);
  const cacheTime = localStorage.getItem(cacheKey + '_time');
  const now = Date.now();
  // Cache de 24h pour les compteurs statistiques
  if (cached && cacheTime && now - parseInt(cacheTime) < 86400000) return parseInt(cached);
  
  const { getCountFromServer } = await import('firebase/firestore');
  try {
    const snapshot = await getCountFromServer(ref);
    const count = snapshot.data().count;
    localStorage.setItem(cacheKey, count.toString());
    localStorage.setItem(cacheKey + '_time', now.toString());
    return count;
  } catch (e) {
    return cached ? parseInt(cached) : 0;
  }
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  users: User[];
  tutors: User[];
  teachers: User[];
  totalUsersCount: number;
  totalDocumentsCount: number;
  ads: Ad[];
  documents: any[];
  internships: Internship[];
  events: CampusEvent[];
  news: News[];
  lostAndFound: LostAndFound[];
  marketplace: MarketplaceItem[];
  community: Post[];
  reports: Report[];
  motoRides: MotoRide[];
  logs: Log[];
  trainings: Training[];
  trainingEnrollments: TrainingEnrollment[];
  trainingReviews: TrainingReview[];
  trainingReports: TrainingReport[];
  contests: Contest[];
  contestParticipants: ContestParticipant[];
  quizzes: Quiz[];
  deals: Deal[];
  dealSuggestions: DealSuggestion[];
  colocations: Colocation[];
  colocationRequests: ColocationRequest[];
  colocationReviews: ColocationReview[];
  publicServiceContests: any[];
  addPublicServiceContest: (contest: any) => Promise<string | void>;
  deletePublicServiceContest: (id: string) => Promise<void>;
  addQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt'>) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  updateQuiz: (id: string, data: Partial<Quiz>) => Promise<void>;
  createContest: (contest: Omit<Contest, 'id' | 'createdAt'>) => Promise<void>;
  updateContest: (id: string, data: Partial<Contest>) => Promise<void>;
  deleteContest: (id: string) => Promise<void>;
  registerForContest: (contestId: string) => Promise<void>;
  updateParticipantStatus: (participantId: string, status: ContestParticipant['status']) => Promise<void>;
  publishContestResults: (contestId: string, winners: ContestWinner[]) => Promise<void>;
  createDeal: (deal: Omit<Deal, 'id' | 'createdAt'>) => Promise<void>;
  updateDeal: (id: string, data: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  reviewDealSuggestion: (id: string, status: 'reviewed' | 'rejected') => Promise<void>;
  deleteDealSuggestion: (id: string) => Promise<void>;
  createColocation: (colocation: Omit<Colocation, 'id' | 'createdAt' | 'ownerId' | 'ownerName' | 'ownerAvatar'>) => Promise<void>;
  updateColocation: (id: string, data: Partial<Colocation>) => Promise<void>;
  deleteColocation: (id: string) => Promise<void>;
  sendColocationRequest: (request: Omit<ColocationRequest, 'id' | 'createdAt' | 'senderId' | 'senderName' | 'senderAvatar' | 'senderUniversity' | 'senderLevel' | 'status'>) => Promise<void>;
  updateColocationRequestStatus: (id: string, status: 'accepted' | 'rejected') => Promise<void>;
  addColocationReview: (review: Omit<ColocationReview, 'id' | 'createdAt' | 'authorId' | 'authorName'>) => Promise<void>;
  logActivity: (data: Omit<import('@/services/logService').LogData, 'userId' | 'userName' | 'email' | 'filiere' | 'universite'>) => Promise<void>;
  logAction: (action: string, details?: string) => Promise<void>;
  logDownload: (docData: any) => Promise<void>;
  updateAd: (id: string, data: Partial<Ad>) => Promise<void>;
  createAd: (ad: Omit<Ad, 'id'>) => Promise<void>;
  deleteAd: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, data: Partial<any>) => Promise<void>;
  addDocument: (data: any) => Promise<void>;
  deleteInternship: (id: string) => Promise<void>;
  triggerNotification: (type: 'document' | 'internship' | 'contest' | 'event' | 'reply' | 'marketplace' | 'community' | 'quiz' | 'public_service' | 'deal' | 'colocation', data: any) => Promise<void>;
  updateInternship: (id: string, data: Partial<Internship>) => Promise<void>;
  addInternship: (data: Omit<Internship, 'id' | 'createdAt'>) => Promise<void>;
  applyInternship: (data: any) => Promise<void>;
  deleteMarketplaceItem: (id: string) => Promise<void>;
  updateMarketplaceItem: (id: string, data: Partial<MarketplaceItem>) => Promise<void>;
  addMarketplaceItem: (data: Omit<MarketplaceItem, 'id' | 'createdAt'>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
  addEvent: (event: Omit<CampusEvent, 'id' | 'createdAt' | 'organizerId' | 'organizer' | 'attendees'>) => Promise<void>;
  addComment: (postId: string, content: string, fileUrl?: string, fileType?: string, fileName?: string) => Promise<void>;
  deleteLostAndFound: (id: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  deleteMotoRide: (id: string) => Promise<void>;
  reserveMotoRide: (rideId: string, clientWhatsapp: string) => Promise<void>;
  reportRideUser: (userId: string, rideId: string, reason: string) => Promise<void>;
  reviewRide: (rideId: string, revieweeId: string, rating: number, comment: string) => Promise<void>;
  updateRideStatus: (rideId: string, status: MotoRide['status']) => Promise<void>;
  verifyDriver: (userId: string, vehicleDetails: User['vehicleDetails']) => Promise<void>;
  addReport: (report: Omit<Report, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  addMotoRide: (ride: Omit<MotoRide, 'id' | 'createdAt'>) => Promise<void>;
  addTraining: (training: Omit<Training, 'id' | 'createdAt' | 'status' | 'participants'>) => Promise<void>;
  updateTraining: (trainingId: string, data: Partial<Training>) => Promise<void>;
  enrollInTraining: (trainingId: string) => Promise<void>;
  reviewTraining: (trainingId: string, rating: number, comment: string) => Promise<void>;
  reportTraining: (trainingId: string, reason: string, details: string) => Promise<void>;
  updateTrainingStatus: (trainingId: string, status: Training['status']) => Promise<void>;
  deleteTraining: (trainingId: string) => Promise<void>;
  syncCommunityGroup: () => Promise<void>;
  reviewMarketplaceItem: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  reportMarketplaceItem: (id: string, reason: string) => Promise<void>;
  login: (email?: string, password?: string) => Promise<void>;
  loginOffline: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signup: (userData: Partial<User> & { password?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  syncUserStats: () => Promise<void>;
  isDocumentLocked: (doc: any, mode?: 'view' | 'download') => any;
  incrementActivity: (activity: keyof NonNullable<User['activityStats']>, additionalPoints?: number) => Promise<void>;
  submitTutorApplication: (
    description: string, 
    documentUrl: string,
    subjects: string[],
    hourlyRates: {
      college?: number;
      lycee?: number;
      licence?: number;
      master?: number;
    }
  ) => void;
  reviewApplication: (applicationId: string, status: 'approved' | 'rejected') => void;
  submitTeacherApplication: (data: Omit<TeacherApplication, 'id' | 'userId' | 'user' | 'status' | 'createdAt'>) => void;
  reviewTeacherApplication: (applicationId: string, status: 'approved' | 'rejected') => void;
  submitSubscriptionRequest: (type: 'exam' | 'premium' | 'motoride' | 'event' | 'institution', amount: number) => void;
  reviewSubscriptionRequest: (requestId: string, status: 'approved' | 'rejected') => void;
  updateUserRole: (userId: string, role: User['role']) => void;
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  adminCreateUser: (userData: Partial<User> & { password?: string }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addGroupMember: (groupId: string, userId: string) => Promise<void>;
  removeGroupMember: (groupId: string, userId: string) => Promise<void>;
  applications: TutorApplication[];
  teacherApplications: TeacherApplication[];
  subscriptionRequests: SubscriptionRequest[];
  notifications: Notification[];
  groups: Group[];
  addNotification: (userId: string, notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'userId'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  addTeacherReview: (teacherId: string, rating: number, comment: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  academicNotifications: any[];
  addAcademicNotification: (notification: any) => Promise<void>;
  markAcademicNotificationRead: (id: string) => Promise<void>;
  
  openAuthModal: (callback?: () => void) => void;

  authModalCallback: (() => void) | null;
  setAuthModalCallback: (callback: (() => void) | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tutors, setTutors] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
  const [totalDocumentsCount, setTotalDocumentsCount] = useState<number>(0);
  const [ads, setAds] = useState<Ad[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [community, setCommunity] = useState<Post[]>([]);
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [teacherApplications, setTeacherApplications] = useState<TeacherApplication[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [lostAndFound, setLostAndFound] = useState<LostAndFound[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [motoRides, setMotoRides] = useState<MotoRide[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [trainingEnrollments, setTrainingEnrollments] = useState<TrainingEnrollment[]>([]);
  const [trainingReviews, setTrainingReviews] = useState<TrainingReview[]>([]);
  const [trainingReports, setTrainingReports] = useState<TrainingReport[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestParticipants, setContestParticipants] = useState<ContestParticipant[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealSuggestions, setDealSuggestions] = useState<DealSuggestion[]>([]);
  const [colocations, setColocations] = useState<Colocation[]>([]);
  const [academicNotifications, setAcademicNotifications] = useState<any[]>([]);

  // Implement the functions:
  const addAcademicNotification = async (notification: any) => {
    try {
      const docRef = doc(collection(db, 'academic_notifications'));
      await setDoc(docRef, { ...notification, id: docRef.id, createdAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'academic_notifications');
    }
  };

  const markAcademicNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'academic_notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'academic_notifications');
    }
  };
  const [colocationRequests, setColocationRequests] = useState<ColocationRequest[]>([]);
  const [colocationReviews, setColocationReviews] = useState<ColocationReview[]>([]);
  const [publicServiceContests, setPublicServiceContests] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | null>(null);

  const openAuthModal = (callback?: () => void) => {
    if (callback) {
      setAuthModalCallback(() => callback);
    } else {
      setAuthModalCallback(null);
    }
    setShowAuthModal(true);
  };

  const [firebaseEmail, setFirebaseEmail] = useState<string | null>(null);
  const isSigningUp = React.useRef(false);

  const ADMIN_EMAILS = [
    'urbain.traoreurb@gmail.com',
    'urbain.traoreurb@gmail',
    'urbain.traoreurb@gmail.com.',
    'urbain.traore@gmail.com',
    'urbain.traore@gmail',
    'traoreurb@gmail.com',
    'urbain.traore@yahoo.fr',
    'urbain.traore@yahoo.com',
    'urbain@campusbf.com'
  ];

  const isAdminEmail = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const lowerEmail = email.toLowerCase().trim();
    
    // Explicit list of known admin emails
    const hardcodedAdmins = [
      'urbain.traoreurb@gmail.com',
      'urbain.traoreurb@gmail',
      'traoreurb@gmail.com',
      'urbain.traore@gmail.com',
      'urbain.traore@yahoo.fr',
      'urbain.traoreurb@gmail.com'
    ];

    const isExplicit = hardcodedAdmins.some(ae => lowerEmail.includes(ae.toLowerCase().trim()) || ae.toLowerCase().trim().includes(lowerEmail));
    const isKeywordMatch = lowerEmail.includes('traoreurb') || 
                           (lowerEmail.includes('urbain') && lowerEmail.includes('traore'));
    
    const result = isExplicit || isKeywordMatch;
    if (result) {
      console.log(`ADMIN MATCH: Email "${lowerEmail}" matched as admin (Explicit: ${isExplicit}, Keyword: ${isKeywordMatch})`);
    } else {
      console.log(`NO ADMIN MATCH: Email "${lowerEmail}" (Admins: ${hardcodedAdmins.join(', ')})`);
    }
    return result;
  };

  const isAdmin = React.useMemo(() => {
    // 1. Check direct Firebase Auth email (most reliable)
    const firebaseUserEmail = auth.currentUser?.email?.toLowerCase().trim() || firebaseEmail?.toLowerCase().trim();
    
    // 2. Check profile email
    const profileEmail = user?.email?.toLowerCase().trim();
    
    // 3. Check hardcoded developer email fallback
    const developerEmail = 'urbain.traoreurb@gmail.com';

    if (firebaseUserEmail === developerEmail || profileEmail === developerEmail) {
      console.log("Admin identified via direct developer email match");
      return true;
    }

    const isSpecialAdmin = isAdminEmail(firebaseUserEmail) || isAdminEmail(profileEmail);
    const result = user?.role === 'admin' || isSpecialAdmin;
    
    console.log("isAdmin Memo Evaluation:", { 
      result, 
      userRole: user?.role, 
      isSpecialAdmin,
      firebaseUserEmail,
      profileEmail
    });
    
    return result;
  }, [user, firebaseEmail, auth.currentUser?.email]);

  const isDocumentLocked = React.useCallback((doc: any, mode: 'view' | 'download' = 'view') => {
    // Admins bypass all restrictions
    if (isAdmin) return false;
    if (!user) return { locked: true, reason: 'Vous devez être connecté.' };
    
    // Emergency bypass
    if (user?.forceUnlocked) return false;

    // 1. 24h limit restriction: maximum 3 downloads per 24 hours
    if (mode === 'download') {
      const now = new Date();
      const lastDownloads: string[] = Array.isArray(user.recentDownloads) ? user.recentDownloads : [];
      
      const recentDownloads = lastDownloads.filter(timestamp => {
        try {
          const downloadTime = new Date(timestamp);
          if (isNaN(downloadTime.getTime())) return false;
          const msSinceDownload = now.getTime() - downloadTime.getTime();
          return msSinceDownload < 24 * 60 * 60 * 1000; // 24 hours
        } catch {
          return false;
        }
      });

      if (recentDownloads.length >= 3) {
        // Find oldest active download in the rolling window
        const downloadDates = recentDownloads.map(t => new Date(t).getTime()).sort((a, b) => a - b);
        const oldestDownloadInWindow = downloadDates[0];
        const msToWait = (24 * 60 * 60 * 1000) - (now.getTime() - oldestDownloadInWindow);
        const h = Math.floor(msToWait / (1000 * 60 * 60));
        const m = Math.floor((msToWait - h * 1000 * 60 * 60) / (1000 * 60));
        return { 
          locked: true, 
          reason: `Limite de téléchargement atteint : Maximum de 3 téléchargements par 24h. Veuillez attendre ${h}h et ${m}min.` 
        };
      }
    }
    
    return false;
  }, [user, isAdmin]);

  const syncProfile = async (userId: string, userData: Partial<User>) => {
    try {
      const profileData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        university: userData.university,
        major: userData.major,
        level: userData.level,
        promotion: userData.promotion,
        avatarUrl: userData.avatarUrl,
        role: userData.role,
        phone: userData.phone,
      };
      // Remove undefined fields
      Object.keys(profileData).forEach(key => (profileData as any)[key] === undefined && delete (profileData as any)[key]);
      
      await setDoc(doc(db, 'profiles', userId), profileData, { merge: true });
    } catch (error) {
      console.error("Error syncing profile:", error);
    }
  };

  const logActivity = async (data: Omit<import('@/services/logService').LogData, 'userId' | 'userName' | 'email' | 'filiere' | 'universite'>) => {
    if (!user) return;
    await logService.logActivity({
      ...data,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      universite: user.university,
      filiere: user.major || ''
    });
  };

  const logAction = async (action: string, details?: string) => {
    await logService.logAction(user, action, details);
  };

  const logDownload = async (docData: any) => {
    if (!user) return;
    try {
      const { collection: fsCollection, addDoc: fsAddDoc, serverTimestamp: fsServerTimestamp } = await import('firebase/firestore');
      const ua = navigator.userAgent;
      const browser = ua.includes('Firefox') ? 'Firefox' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : ua.includes('Edge') ? 'Edge' : 'Unknown';
      const device = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ? 'Mobile' : 'Desktop';
      
      const downloadLog = {
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur',
        email: user.email || '',
        documentId: docData.id,
        documentTitle: docData.title || docData.fileName || 'Sans titre',
        filiere: user.major || '',
        universite: user.university || '',
        device,
        browser,
        createdAt: fsServerTimestamp()
      };
      
      await fsAddDoc(fsCollection(db, 'downloads_logs'), downloadLog);
      
      await logActivity({
        action: 'Téléchargement de document',
        module: 'Documents Académiques',
        details: `Téléchargement: ${downloadLog.documentTitle}`,
        metadata: { documentId: docData.id }
      });
    } catch (err) {
      console.error("Error in logDownload:", err);
    }
  };

  const incrementActivity = async (activity: keyof NonNullable<User['activityStats']>, additionalPoints?: number) => {
    if (!user) return;
    
    // Weighted points for each activity
    const weights: Record<string, number> = {
      logins: 1,
      docsViewed: 2,
      docsDownloaded: 5,
      eventsViewed: 1,
      eventParticipations: 10,
      contestParticipations: 15,
      marketplacePosts: 10,
      marketplaceContacts: 5,
      quizzesCompleted: 12,
      cvGenerated: 10,
      motoRideOffers: 15,
      motoRideContacts: 5,
      groupMessages: 2,
      invitations: 50
    };

    const pointValue = additionalPoints !== undefined ? additionalPoints : (weights[activity] || 1);

    try {
      await updateDoc(doc(db, 'users', user.id), {
        [`activityStats.${activity}`]: increment(1),
        rankingScore: increment(pointValue),
        lastActiveAt: serverTimestamp()
      });
      
      // Update Daily Quests
      const questMap: Record<string, 'quiz' | 'document' | 'post' | 'comment' | 'login'> = {
         quizzesCompleted: 'quiz',
         docsViewed: 'document',
         docsDownloaded: 'document',
         marketplacePosts: 'post',
         groupMessages: 'comment',
      };
      const questType = questMap[activity];
      if (questType) {
         await questService.updateQuestProgress(user, questType, 1);
      }
    } catch (error) {
      console.error(`Error incrementing activity ${activity}:`, error);
    }
  };

  const createAd = async (adData: Omit<Ad, 'id'>) => {
    if (!user) return;
    await adService.createAd(user, adData);
  };

  const addGroupMember = async (groupId: string, userId: string) => {
    if (!user || user.role !== 'admin') return;
    await communityService.addGroupMember(user, groupId, userId);
  };

  const removeGroupMember = async (groupId: string, userId: string) => {
    if (!user || user.role !== 'admin') return;
    await communityService.removeGroupMember(user, groupId, userId);
  };

  const updateAd = async (id: string, data: Partial<Ad>) => {
    if (!user) return;
    await adService.updateAd(user, id, data);
  };

  const deleteAd = async (id: string) => {
    if (!user) return;
    await adService.deleteAd(user, id);
  };

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    // Safety timeout to prevent stuck loading state
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth loading took too long, forcing state change");
        setIsLoading(false);
      }
    }, 8000);

    // Offline mode window observers
    const handleOnline = () => {
      console.log("[Network Status] Browser online event triggered. Checking Firestore connection...");
      checkFirestoreConnectionAndHeartbeat();
    };
    const handleOffline = () => {
      console.log("[Network Status] Browser offline event triggered. Setting isOfflineMode to true.");
      setIsOfflineMode(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    unsubscribes.push(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });

    // Firebase & Firestore Connection Diagnostic & Verification Utility
    let connectionAttempts = 0;
    const maxConnectionAttempts = 5;

    const runConnectionDiagnostics = async () => {
      connectionAttempts++;
      console.log(`[Firebase Diagnostic] Starting connection attempt #${connectionAttempts}/${maxConnectionAttempts}...`);
      console.log(`[Firebase Diagnostic] Navigator Online State: ${navigator.onLine ? "ONLINE" : "OFFLINE"}`);

      try {
        // Step 1: Validate Firestore connection via on-server document read
        console.log(`[Firebase Diagnostic] Attempting to read test document from Firestore...`);
        const testDocRef = doc(db, 'test', 'connection');
        await getDocFromServer(testDocRef);
        console.log(`[Firebase Diagnostic] SUCCESS: Connected to Firestore backend on attempt #${connectionAttempts}.`);
        setIsOfflineMode(false);
      } catch (error: any) {
        console.group(`[Firebase Diagnostic] FAILURE DETAILS on attempt #${connectionAttempts}`);
        console.error("Raw Error Object:", error);
         
        const errorCode = error.code || null;
        const errorMessage = error.message || String(error);
        
        console.log(`Parsed Code: ${errorCode}`);
        console.log(`Parsed Message: ${errorMessage}`);

        // Category A: Network / Offline device issues
        const isOfflineError = errorMessage.includes('the client is offline') || 
                               errorCode === 'unavailable' || 
                               errorMessage.includes('Failed to fetch') ||
                               errorMessage.includes('Could not reach Cloud Firestore backend');
                               
        if (isOfflineError || !navigator.onLine) {
          console.warn("[Diagnostic Analysis] Category: NETWORK FAULT");
          console.error("The client is offline or cannot route packets to Google servers. The SDK falls back to offline cache storage.");
          console.info("Suggested Fix: Check local router, proxy configurations, or DNS restrictions in this preview container environment.");
          setIsOfflineMode(true);
        } 
        // Category B: Firebase Auth network request failed specific to SDK
        else if (errorCode === 'auth/network-request-failed' || errorMessage.includes('network-request-failed') || errorMessage.includes('request-failed')) {
          console.warn("[Diagnostic Analysis] Category: AUTHENTICATION NETWORK FAULT");
          console.error("Authentication server request failed. Google Secure Token or Identity Toolkit APIs are blocked or failing to connect.");
          console.info("Suggested Fix: Verify if securetoken.googleapis.com is reachable in your browser tab context.");
          setIsOfflineMode(true);
        }
        // Category C: Firestore Rules Permission denied issues
        else if (errorCode === 'permission-denied' || errorMessage.includes('insufficient permissions') || errorMessage.includes('permission-denied')) {
          console.warn("[Diagnostic Analysis] Category: FIRESTORE SECURITY RULES BLOCKED");
          console.error("Connected successfully to the database, but access is permitted or denied by firestore.rules configuration.");
          console.info("Suggested Fix: Review your rules security schema in firestore.rules. Adhere to systemic permissions.");
          setIsOfflineMode(false); // Connected but blocked by rules schema, not offline
        }
        // Category D: Configuration/Key validity issues
        else if (errorMessage.includes('invalid-api-key') || errorMessage.includes('API key') || errorMessage.includes('invalid-credential')) {
          console.warn("[Diagnostic Analysis] Category: FIREBASE CONFIGURATION MISMATCH / CORRUPTION");
          console.error("The API key, project ID, or app identifier in your configuration structure does not exist or has expired.");
          console.info("Suggested Fix: Check the content of firebase-applet-config.json and re-apply set_up_firebase.");
          setIsOfflineMode(true);
        }
        // Category E: Quota exceeded
        else if (errorMessage.includes('Quota exceeded') || errorCode === 'resource-exhausted') {
          console.warn("[Diagnostic Analysis] Category: SPARK PLAN LIMITATIONS (QUOTA EXCEEDED)");
          console.error("You have reached maximum read/write request quotas allowed daily under the Spark plan.");
          setIsOfflineMode(false);
        }
        // Category F: Unknown error
        else {
          console.warn("[Diagnostic Analysis] Category: UNKNOWN DATABASE ISSUE");
          console.error("No distinctive failure signpost identified. Investigate client error properties directly.");
          setIsOfflineMode(true);
        }

        console.groupEnd();

        // Auto-retry with exponential backoff unless max attempts reached
        if (connectionAttempts < maxConnectionAttempts) {
          // Exponential backoff formulation: 1000 * 2^(attempt - 1) milliseconds (e.g. 1s, 2s, 4s, 8s delay)
          const backoffDelay = Math.min(1000 * Math.pow(2, connectionAttempts - 1), 16000);
          console.log(`[Firebase Diagnostic] Retrying connection diagnostic with exponential backoff in ${backoffDelay}ms...`);
          setTimeout(runConnectionDiagnostics, backoffDelay);
        } else {
          console.error(`[Firebase Diagnostic] Max connection diagnostic attempts reached (${maxConnectionAttempts}). Diagnostics suspended.`);
        }
      }
    };

    // Periodic Heartbeat check ensuring reachable connection to Firestore in real-time
    const checkFirestoreConnectionAndHeartbeat = async () => {
      console.log("[Firebase Heartbeat] Checking Firestore reachability...");
      if (!navigator.onLine) {
        setIsOfflineMode(true);
        return;
      }
      try {
        const testDocRef = doc(db, 'test', 'connection');
        await getDocFromServer(testDocRef);
        console.log("[Firebase Heartbeat] SUCCESS: Reachable! Setting isOfflineMode to false.");
        setIsOfflineMode(false);
      } catch (error: any) {
        const errorCode = error.code || null;
        const errorMessage = error.message || String(error);
        if (errorCode === 'permission-denied' || errorMessage.includes('insufficient permissions')) {
          console.log("[Firebase Heartbeat] Connected but permission denied. This counts as reached/online!");
          setIsOfflineMode(false);
        } else {
          console.warn("[Firebase Heartbeat] FAILS: Reachability check failed. Offline mode active:", errorMessage);
          setIsOfflineMode(true);
        }
      }
    };

    // Run connection diagnostics on startup
    runConnectionDiagnostics();

    // Setup heartbeat loop running every 20 seconds
    const heartbeatInterval = setInterval(() => {
      checkFirestoreConnectionAndHeartbeat();
    }, 20000);

    unsubscribes.push(() => {
      clearInterval(heartbeatInterval);
    });

    let active = true;
    let unsubscribeAuth: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        console.log("Setting Auth Persistence to browserLocalPersistence...");
        await setPersistence(auth, browserLocalPersistence);
      } catch (persistenceError) {
        console.error("Error setting firebase auth persistence:", persistenceError);
      }

      if (!active) return;

      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!active) return;
        console.log("Auth state changed:", firebaseUser?.email);
        setFirebaseEmail(firebaseUser?.email || null);
        clearTimeout(loadingTimeout);
        
        if (!firebaseUser) {
          if (localStorage.getItem('offline_admin_mock') === 'true') {
            console.log("Restoring mock offline admin session");
            const storedEmail = localStorage.getItem('offline_user_email') || 'admin@offline.local';
            const isSpecialAdmin = isAdminEmail(storedEmail);
            const mockUser: User = {
              id: 'offline-admin-mock-id',
              email: storedEmail,
              firstName: isSpecialAdmin ? 'Admin (Hors-ligne)' : 'Étudiant (Hors-ligne)',
              lastName: 'CampusBF',
              role: isSpecialAdmin ? 'admin' : 'student',
              createdAt: new Date(),
              rankingScore: 1
            } as any;
            if (active) {
              setUser(mockUser);
              setIsLoading(false);
            }
            return;
          }

          console.log("No firebase user");
          if (active) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        // If signup is in progress, let it handle the doc creation
        if (isSigningUp.current) {
          console.log("Signup in progress, skipping auto-doc creation in onAuthStateChanged");
          return;
        }

        // Logic for session login marking - avoid repeated writes
        const checkSessionLogin = () => {
          const key = `active_session_${firebaseUser.uid}`;
          const lastLogin = localStorage.getItem(key);
          const day = new Date().toDateString();
          if (lastLogin === day) return true;
          localStorage.setItem(key, day);
          return false;
        };

        try {
          console.log("Auth State Changed for user:", firebaseUser.uid);
          let initialUserData: User;
          
          // Quota safety check
          const quotaHit = sessionStorage.getItem('firestore_quota_hit');
          if (quotaHit) {
            console.warn("Firestore Quota already hit, using fallback");
            throw new Error('Quota exceeded');
          }

          let userDoc;
          try {
            // Use getDocFromServer to bypass local cache if needed, but here we want to be lean
            userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          } catch (err: any) {
            const isQuota = err.message?.includes('Quota') || err.code === 'resource-exhausted';
            if (isQuota) sessionStorage.setItem('firestore_quota_hit', 'true');
            
            const isOffline = err.message?.includes('offline') || err.code === 'unavailable';
            if (isOffline) {
              console.warn("User is offline or Firestore is unreachable. Using fallback profile.");
              throw new Error('offline_fallback');
            }
            throw err;
          }

          if (!active) return;

          if (userDoc.exists()) {
            const data = userDoc.data();
            initialUserData = { id: firebaseUser.uid, ...data } as User;
            
            if (!checkSessionLogin()) {
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), {
                  lastActiveAt: serverTimestamp(),
                  'activityStats.logins': increment(1),
                });
                
                await logService.logActivity({
                  userId: firebaseUser.uid,
                  userName: `${initialUserData.firstName || ''} ${initialUserData.lastName || ''}`.trim() || 'Utilisateur',
                  email: firebaseUser.email || '',
                  filiere: initialUserData.major || '',
                  universite: initialUserData.university || '',
                  action: 'Connexion de l\'utilisateur',
                  module: 'Authentification',
                  details: 'Nouvelle session de connexion',
                  severity: 'info'
                });
              } catch {}
            }

            // Demande de permission pour les notifications
            setTimeout(() => {
              if (active) {
                requestNotificationPermission(firebaseUser.uid);
              }
            }, 3000);
            
            console.log("Firebase User:", firebaseUser.email, "UID:", firebaseUser.uid);
            
            if (isAdminEmail(firebaseUser.email) && (initialUserData as any).role !== 'admin') {
              console.log("CRITICAL: User email is in admin list but role is not admin in Firestore. Forcing upgrade.");
              (initialUserData as any).role = 'admin';
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
                console.log("Firestore role updated to admin for", firebaseUser.email);
              } catch (err: any) {
                 console.error("Firestore updateDoc error for role upgrade:", err);
              }
            } else {
              console.log("Admin check for", firebaseUser.email, ": isAdminEmail:", isAdminEmail(firebaseUser.email), "Current Role:", (initialUserData as any).role);
            }
          } else {
            console.log("User doc does not exist, creating new user...");
            const newUser: Partial<User> = {
              firstName: firebaseUser.displayName?.split(' ')[0] || 'Utilisateur',
              lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || 'CampusBF',
              email: firebaseUser.email || '',
              university: '',
              role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
              avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              status: 'active',
              createdAt: new Date().toISOString(),
              referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
              referralsCount: 0,
              inviteCount: 0,
              invitedUsers: [],
              activityStats: {
                logins: 1,
                docsViewed: 0,
                docsDownloaded: 0,
                eventsViewed: 0,
                eventParticipations: 0,
                contestParticipations: 0,
                marketplacePosts: 0,
                marketplaceContacts: 0,
                quizzesCompleted: 0,
                cvGenerated: 0,
                motoRideOffers: 0,
                motoRideContacts: 0,
                groupMessages: 0,
                invitations: 0
              },
              rankingScore: 1
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              initialUserData = { id: firebaseUser.uid, ...newUser } as User;
              // Join everyone to the community group by default to enable basic platform access
              await communityService.ensureUserInCommunityGroup(firebaseUser.uid);
            } catch (err: any) {
               console.error("Firestore setDoc error for new user creation:", err);
               handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
               return;
            }
          }

          if (!active) return;

          console.log("Setting user state:", initialUserData.id);
          setUser(initialUserData);
          
          // Listen to user profile changes in real-time
          const userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
            if (!active) return;
            if (doc.exists()) {
              const newData = doc.data() as User;
              const normalizedData = { id: firebaseUser.uid, ...newData };
              setUser(normalizedData);
            }
          }, (error) => {
            console.error("userSnapshot Error:", error);
          });
          unsubscribes.push(userUnsubscribe);
          
          // Ensure user is in the community group (except for students who must join manually)
          if (firebaseUser.uid && initialUserData && initialUserData.role !== 'student') {
            communityService.ensureUserInCommunityGroup(firebaseUser.uid).catch(console.error);
          }
          
          // Log login
          try {
            await logService.logActivity({
              userId: initialUserData.id,
              userName: `${initialUserData.firstName} ${initialUserData.lastName}`,
              email: initialUserData.email,
              universite: initialUserData.university,
              filiere: initialUserData.major || '',
              action: 'Connexion',
              module: 'Authentification',
              details: 'Session ouverte',
              severity: 'info'
            });
          } catch (err: any) {
            console.error("Error logging login action:", err);
          }
        } catch (error: any) {
          if (!active) return;
          console.error("Auth context error handle:", error);
          
          const isQuotaHit = error.message?.includes('Quota') || error.code === 'resource-exhausted' || sessionStorage.getItem('firestore_quota_hit');
          const isOffline = error.message?.includes('offline') || error.code === 'unavailable' || error.message?.includes('offline_fallback');
          
          if (isQuotaHit || isOffline) {
            console.warn("Using fallback profile due to quota exhaustion or offline state");
            const fallbackUser: User = { 
              id: firebaseUser.uid, 
              email: firebaseUser.email || '',
              role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
              firstName: firebaseUser.displayName?.split(' ')[0] || 'Utilisateur',
              lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || 'CampusBF',
              status: 'active',
              createdAt: new Date().toISOString(),
              activityStats: { logins: 1 } as any,
              rankingScore: 1
            } as any;
            setUser(fallbackUser);
            const toastMsg = isOffline 
              ? "Vous semblez être hors ligne ou un adblock bloque la base de données. Mode hors ligne activé." 
              : "Limite de service atteinte. CampusBF fonctionne en mode limité jusqu'à demain matin.";
            toast.error(toastMsg, { duration: 8000 });
          } else {
            toast.error(`Erreur: ${error.message || 'Problème de connexion'}`);
            setUser(null);
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      });
    };

    initializeAuth();

    return () => {
      active = false;
      if (unsubscribeAuth) {
        (unsubscribeAuth as any)();
      }
      unsubscribes.forEach(unsub => {
        try {
          unsub();
        } catch (e) {
          console.error("Error running unsubscribe:", e);
        }
      });
    };
  }, []);

  // Listeners for groups
  useEffect(() => {
    if (!user) {
      setGroups([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
    }, (error) => {
      console.error("groups snapshot error in useEffect:", error);
    });
    return () => unsub();
  }, [user?.id]);

  /**
   * Manual or automatic sync of user stats to fix issues like "Still locked"
   */
  const syncUserStats = React.useCallback(async () => {
    if (!user || user.role !== 'student') return;
    
    console.log("[Auth] Starting sync for", user.id, user.email);
    const updates: any = {};
    let shouldUpdate = false;
    let quizDetected = false;
    let presentationDetected = false;
    let groupDetected = false;

    try {
      // 1. Sync Group membership
      try {
        console.log("[Auth] Checking group membership...");
        const communityGroup = groups.find(g => 
          g.id === 'general' || 
          g.id === 'community' || 
          g.name?.toLowerCase().includes('communauté') ||
          g.name?.toLowerCase().includes('campus')
        );
        if (communityGroup && communityGroup.members?.includes(user.id) && !(user.joinedGroups || []).includes(communityGroup.id)) {
          updates.joinedGroups = arrayUnion(communityGroup.id);
          shouldUpdate = true;
          groupDetected = true;
        }
      } catch (e) {
        console.warn("[Auth] Group sync step failed:", e);
      }

      // 2. Sync Presentation
      try {
        if (!user.hasPostedPresentation) {
          console.log("[Auth] Checking posts for presentation...");
          const postsSnap = await getDocs(query(
            collection(db, 'posts'), 
            where('authorId', '==', user.id), // Try both authorId and author.id
            limit(5)
          ));
          
          let longPost = postsSnap.docs.find(d => (d.data().content || '').length > 15);
          
          if (!longPost) {
             const postsSnap2 = await getDocs(query(
               collection(db, 'posts'), 
               where('author.id', '==', user.id),
               limit(5)
             ));
             longPost = postsSnap2.docs.find(d => (d.data().content || '').length > 15);
          }

          if (longPost) {
            updates.hasPostedPresentation = true;
            shouldUpdate = true;
            presentationDetected = true;
          }
        }
      } catch (e) {
        console.warn("[Auth] Presentation sync step failed:", e);
      }

      if (shouldUpdate) {
        console.log("[Auth] Sync applying updates:", updates);
        await updateDoc(doc(db, 'users', user.id), {
           ...updates,
           lastActiveAt: serverTimestamp()
        });
        
        let message = "Profil synchronisé !";
        if (presentationDetected) message += " Message trouvé.";
        if (groupDetected) message += " Groupe trouvé.";
        
        toast.success(message);
      } else {
        console.log("[Auth] Sync finished, no new criteria found");
      }
    } catch (err: any) {
      console.error("[Auth] Overall sync stats failed:", err);
      if (err?.message?.includes('permission')) {
         toast.error("Erreur de permission. Votre profil n'est pas encore modifiable.");
      }
    }
  }, [user, groups]);

  // Sync missing stats for students once they are loaded
  useEffect(() => {
    if (user && user.role === 'student' && groups.length > 0) {
      const timeoutId = setTimeout(syncUserStats, 2000); 
      return () => clearTimeout(timeoutId);
    }
  }, [user?.id, groups.length, syncUserStats]);

  // Other loaders
  useEffect(() => {
    if (!user) {
      setUsers([]);
      setTutors([]);
      setAds([]);
      setDocuments([]);
      setNotifications([]);
      setEvents([]);
      setCommunity([]);
      setGroups([]);
      setApplications([]);
      setTeacherApplications([]);
      setSubscriptionRequests([]);
      setInternships([]);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    // Only fetch minimal strictly necessary global data
    // Groups are needed for permissions check globally
    const unsubscribeGroups = onSnapshot(query(collection(db, 'groups'), limit(10)), (snapshot) => {
      setGroups(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
    }, (error) => {
      console.error("onSnapshot Groups Error:", error);
    });
    unsubscribes.push(unsubscribeGroups);

    // Notifications are important for UX
    const qNotifs = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [user.id, 'all']),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => {
      console.error("onSnapshot Notifications Error:", error);
    });
    unsubscribes.push(unsubNotifs);

    // ACADEMIC NOTIFICATIONS (Real-time listener for messages / timetables logic in user's class)
    const qAcademicNotifs = query(
      collection(db, 'academic_notifications'),
      where('userId', 'in', [user.id, 'all']),
      limit(20)
    );
    const unsubAcademicNotifs = onSnapshot(qAcademicNotifs, (snapshot) => {
      setAcademicNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Dispatch toast for new incoming items
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const isRecent = data.createdAt?.seconds ? data.createdAt.seconds * 1000 > Date.now() - 10000 : false;
          if (isRecent || (data.createdAt && typeof data.createdAt === 'string' && new Date(data.createdAt).getTime() > Date.now() - 10000)) {
            toast.info(`🔔 Academic: ${data.title}\n${data.content}`);
          }
        }
      });
    }, (error) => {
      console.error("onSnapshot Academic Notifications Error:", error);
    });
    unsubscribes.push(unsubAcademicNotifs);

    // Events are used in Dashboard and Events page
    const qEvents = query(collection(db, 'events'), limit(50));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      const loadedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          attendees: data.attendees || [] // Essential fix: ensure attendees is always an array to prevent crash in Events page
        } as CampusEvent;
      });
      console.log(`[AuthContext] Loaded ${loadedEvents.length} events`);
      
      // Auto-seeding for empty events collection to help visibility
      if (loadedEvents.length === 0 && user && (user.role === 'admin' || user.role === 'teacher')) {
        console.log('[AuthContext] Events collection empty, seeding mock events...');
        const mockEvents = [
          {
            title: "Soutenance de Master - Informatique",
            description: "Présentation des travaux de fin d'études sur l'IA appliquée au développement durable.",
            type: "Soutenance",
            location: "Amphi A600, UJKZ",
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            time: "09:00",
            imageUrl: "https://images.unsplash.com/photo-1523050853064-80d1790a7401?w=800&auto=format&fit=crop"
          },
          {
            title: "Conférence : Entrepreneuriat Étudiant",
            description: "Venez apprendre comment lancer votre startup tout en étant étudiant.",
            type: "conference",
            location: "Salle de conférence, UNB",
            date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
            time: "14:30",
            imageUrl: "https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?w=800&auto=format&fit=crop"
          }
        ];
        mockEvents.forEach(evt => addEvent(evt as any));
      }

      // Sort client-side to be resilient to missing fields and avoid index requirement
      const sorted = [...loadedEvents].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateA.localeCompare(dateB);
      });
      setEvents(sorted);
    }, (error) => {
      console.error("onSnapshot Events Error:", error);
      if (error.message?.includes('permission')) {
        console.warn("Permission denied for events. Using empty list.");
      }
    });
    unsubscribes.push(unsubEvents);

    // Load contests
    const qContests = query(collection(db, 'contests'), orderBy('createdAt', 'desc'), limit(50));
    unsubscribes.push(onSnapshot(qContests, (snapshot) => {
      setContests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contest)));
    }, (error) => console.error("onSnapshot Contests Error:", error)));

    // Load Quizzes
    const qQuizzes = query(collection(db, 'quizzes'), limit(100));
    const unsubQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      const sorted = list.sort((a, b) => {
        const t1 = (a.createdAt as any)?.seconds || Date.now() / 1000;
        const t2 = (b.createdAt as any)?.seconds || Date.now() / 1000;
        return t2 - t1;
      });
      setQuizzes(sorted);
    }, (error) => console.error("onSnapshot Quizzes Error:", error));
    unsubscribes.push(unsubQuizzes);

    // Load Deals
    const qDeals = query(collection(db, 'deals'), orderBy('createdAt', 'desc'), limit(50));
    unsubscribes.push(onSnapshot(qDeals, (snapshot) => {
      setDeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deal)));
    }, (error) => console.error("onSnapshot Deals Error:", error)));

    // Load Trainings
    const qTrainings = query(collection(db, 'trainings'), orderBy('createdAt', 'desc'), limit(50));
    unsubscribes.push(onSnapshot(qTrainings, (snapshot) => {
      setTrainings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Training)));
    }, (error) => console.error("onSnapshot Trainings Error:", error)));

    // Load Colocations
    const qColocations = query(collection(db, 'colocations'), orderBy('createdAt', 'desc'), limit(50));
    unsubscribes.push(onSnapshot(qColocations, (snapshot) => {
      setColocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Colocation)));
    }, (error) => console.error("onSnapshot Colocations Error:", error)));

    // Admin only lists
    if (isAdmin) {
      const qApps = query(collection(db, 'applications'), limit(20));
      unsubscribes.push(onSnapshot(qApps, (snapshot) => {
        setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorApplication)));
      }, (error) => {
        console.error("onSnapshot Applications Error:", error);
      }));

      const qTeacherApps = query(collection(db, 'teacherApplications'), limit(20));
      unsubscribes.push(onSnapshot(qTeacherApps, (snapshot) => {
        setTeacherApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherApplication)));
      }, (error) => {
        console.error("onSnapshot TeacherApplications Error:", error);
      }));

      const qSubReqs = query(collection(db, 'subscriptionRequests'), limit(20));
      unsubscribes.push(onSnapshot(qSubReqs, (snapshot) => {
        setSubscriptionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionRequest)));
      }, (error) => {
        console.error("onSnapshot SubscriptionRequests Error:", error);
      }));

      // --- ADD ADMIN CONTENT LISTS ---
      unsubscribes.push(onSnapshot(query(collection(db, 'documents'), orderBy('createdAt', 'desc'), limit(100)), 
        (snap) => setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() }))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'internships'), orderBy('createdAt', 'desc'), limit(50)), 
        (snap) => setInternships(snap.docs.map(d => ({ id: d.id, ...d.data() } as Internship))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), limit(50)), 
        (snap) => setMarketplace(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)), 
        (snap) => setCommunity(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'ads'), orderBy('createdAt', 'desc'), limit(20)), 
        (snap) => setAds(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(20)), 
        (snap) => setNews(snap.docs.map(d => ({ id: d.id, ...d.data() } as News))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'lostAndFound'), orderBy('createdAt', 'desc'), limit(30)), 
        (snap) => setLostAndFound(snap.docs.map(d => ({ id: d.id, ...d.data() } as LostAndFound))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(30)), 
        (snap) => setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'motoride_offers'), orderBy('createdAt', 'desc'), limit(30)), 
        (snap) => setMotoRides(snap.docs.map(d => ({ id: d.id, ...d.data() } as MotoRide))), 
        (err) => console.error(err)));

      unsubscribes.push(onSnapshot(query(collection(db, 'deal_suggestions'), orderBy('createdAt', 'desc'), limit(20)), 
        (snap) => setDealSuggestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as DealSuggestion))), 
        (err) => console.error(err)));
      // -----------------------------
    } else {
      // Non-admins see their own applications
      const qApps = query(collection(db, 'applications'), where('userId', '==', user.id), limit(5));
      const qTeacherApps = query(collection(db, 'teacherApplications'), where('userId', '==', user.id), limit(5));
      
      getDocs(qApps).then(snap => setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as TutorApplication)))).catch(() => {});
      getDocs(qTeacherApps).then(snap => setTeacherApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherApplication)))).catch(() => {});
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user?.id, isAdmin]);

  const ensureUserInCommunityGroup = async (userId: string) => {
    await communityService.ensureUserInCommunityGroup(userId);
  };

  const deletePublicServiceContest = async (id: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) return;
    try {
      await deleteDoc(doc(db, 'public_service_contests', id));
      toast.success('Concours supprimé');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const addPublicServiceContest = async (contestData: any) => {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      console.error("Unauthorised or no user:", user);
      return;
    }
    try {
      console.log("Contest Data Payload:", contestData);
      const { questions, ...lightData } = contestData;
      
      // JSON size check (approximate)
      const dataSize = JSON.stringify(questions).length;
      if (dataSize > 900000) { // Keep safety margin under 1MB (1,048,576 bytes)
        toast.error("Le volume de questions est trop important pour un seul concours (limite 1 Mo).");
        return;
      }

      console.log("Adding contest entry...");
      const contestRef = await addDoc(collection(db, 'public_service_contests'), {
        ...lightData,
        questionCount: questions?.length || 0,
        status: 'active',
        authorId: user.id,
        createdAt: serverTimestamp(),
        date_creation: new Date().toISOString()
      });

      if (questions && questions.length > 0) {
        console.log(`Adding ${questions.length} questions to details...`);
        await setDoc(doc(db, 'public_service_contest_details', contestRef.id), {
          questions: questions,
          contestId: contestRef.id
        });
      }

      await triggerNotification('public_service', contestData);
      toast.success('Concours ajouté avec succès');
      console.log("Contest fully saved with ID:", contestRef.id);
      return contestRef.id;
    } catch (error) {
      console.error("Critical Error adding contest:", error);
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Échec de l'ajout : ${msg}`);
      throw error;
    }
  };

  const syncCommunityGroup = async () => {
    if (user?.role !== 'admin') return;
    try {
      await communityService.syncCommunityGroup(user, users);
      alert('Tous les utilisateurs ont été intégrés au groupe Communauté.');
    } catch (error) {
      alert('Erreur lors de la synchronisation du groupe Communauté.');
    }
  };

  const login = async (email?: string, password?: string) => {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      console.log("Attempting Firebase login for:", normalizedEmail);
      // Removed authStateReady() as it can sometimes hang in specific environments
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      console.log("Firebase login successful");
    } catch (error: any) {
      console.error("Firebase login error:", error);
      
      // Auto-create admin account if it apparently doesn't exist
      if (error.code === 'auth/invalid-credential' && isAdminEmail(normalizedEmail)) {
        console.log("Attempting to auto-create missing admin account...");
        try {
          await signup({ email: normalizedEmail, password, firstName: 'Admin', lastName: 'System', role: 'admin' });
          console.log("Admin account auto-created and logged in.");
          return;
        } catch (signupError: any) {
          if (signupError.code !== 'auth/email-already-in-use') {
             console.error("Admin auto-create failed:", signupError);
          }
        }
      }

      if (error.code === 'auth/network-request-failed' && isAdminEmail(normalizedEmail)) {
        console.warn("Network request failed, but email is admin. Falling back to offline admin mode.");
        const mockAdmin: User = {
          id: 'offline-admin-mock-id',
          email: normalizedEmail,
          firstName: 'Offline',
          lastName: 'Admin',
          role: 'admin',
          createdAt: new Date(),
          rankingScore: 1
        } as any;
        setUser(mockAdmin);
        localStorage.setItem('offline_admin_mock', 'true');
        localStorage.setItem('offline_user_email', normalizedEmail);
        toast.success("Mode administrateur hors ligne activé.", { duration: 5000 });
        return; // Success!
      }

      let errorMessage = 'Erreur de connexion';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou mot de passe incorrect. Si vous n\'avez pas encore de compte, veuillez vous inscrire.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives infructueuses. Veuillez réessayer plus tard.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Problème de connexion réseau. Veuillez vérifier votre accès internet.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const loginOffline = async (email: string) => {
    if (!email) {
      throw new Error('Email requis pour la connexion hors ligne');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const isSpecialAdmin = isAdminEmail(normalizedEmail);
    
    const mockUser: User = {
      id: 'offline-mock-' + Math.random().toString(36).substring(2, 9),
      email: normalizedEmail,
      firstName: isSpecialAdmin ? 'Admin (Hors-ligne)' : 'Étudiant (Hors-ligne)',
      lastName: 'CampusBF',
      role: isSpecialAdmin ? 'admin' : 'student',
      createdAt: new Date().toISOString(),
      rankingScore: 1,
      university: 'Université Virtuelle du Burkina Faso',
      major: 'Informatique',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedEmail}`,
      status: 'active',
      activityStats: {
        logins: 1,
        docsViewed: 0,
        docsDownloaded: 0,
        eventsViewed: 0,
        eventParticipations: 0,
        contestParticipations: 0,
        marketplacePosts: 0,
        marketplaceContacts: 0,
        quizzesCompleted: 0,
        cvGenerated: 0,
        motoRideOffers: 0,
        motoRideContacts: 0,
        groupMessages: 0,
        invitations: 0
      } as any,
    } as any;

    setUser(mockUser);
    localStorage.setItem('offline_admin_mock', 'true');
    localStorage.setItem('offline_user_email', normalizedEmail);
    setIsOfflineMode(true);
    toast.success(`Mode hors ligne activé pour : ${normalizedEmail}`, { duration: 5000 });
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Google login error:", error);
      if (error.code === 'auth/popup-closed-by-user') return;
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error(`Ce domaine (${window.location.hostname}) n'est pas autorisé pour la connexion Google. Veuillez contacter l'administrateur.`);
      }
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) throw new Error('Email requis');
    const normalizedEmail = email.toLowerCase().trim();
    try {
      console.log("Attempting to send password reset email to:", normalizedEmail);
      await sendPasswordResetEmail(auth, normalizedEmail);
      console.log("Password reset email sent successfully");
    } catch (error: any) {
      console.error("Firebase password reset error:", error.code, error.message);
      throw error;
    }
  };

  const signup = async (userData: Partial<User> & { password?: string; referrerId?: string }) => {
    if (!userData.email || !userData.password) {
      throw new Error('Email et mot de passe requis');
    }

    const normalizedEmail = userData.email.toLowerCase().trim();

    isSigningUp.current = true;
    try {
      await auth.authStateReady();
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, userData.password);
      const firebaseUser = userCredential.user;
      
      // L'envoi automatique de l'email de vérification a été retiré pour ne pas obliger l'utilisateur à vérifier son email immédiatement
      // await sendEmailVerification(firebaseUser);

      const newUser: Partial<User> = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: normalizedEmail,
        university: userData.university || '',
        role: isAdminEmail(normalizedEmail) ? 'admin' : (userData.role || 'student'),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.firstName}`,
        status: 'active',
        createdAt: new Date().toISOString(),
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        referralsCount: 0,
        inviteCount: 0,
        invitedUsers: [],
        rankingScore: 1,
        contributionCount: 0,
        notificationPreferences: {
          pushEnabled: true,
          whatsappEnabled: (userData.role || 'student') === 'student',
          whatsappNumber: userData.phone || '',
          documents: true,
          internships: true,
          forums: true,
          contests: true,
          events: true
        },
        activityStats: {
          logins: 1,
          docsViewed: 0,
          docsDownloaded: 0,
          eventsViewed: 0,
          eventParticipations: 0,
          contestParticipations: 0,
          marketplacePosts: 0,
          marketplaceContacts: 0,
          quizzesCompleted: 0,
          cvGenerated: 0,
          motoRideOffers: 0,
          motoRideContacts: 0,
          groupMessages: 0,
          invitations: 0
        }
      };

      if (userData.major) newUser.major = userData.major;
      if (userData.level) newUser.level = userData.level;
      if (userData.promotion) newUser.promotion = userData.promotion;
      if (userData.phone) newUser.phone = userData.phone;
      if (userData.ine) newUser.ine = userData.ine;
      if (userData.teacherStatus) newUser.teacherStatus = userData.teacherStatus;
      if (userData.institutionProfile) newUser.institutionProfile = userData.institutionProfile;

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      await syncProfile(firebaseUser.uid, newUser);
      await ensureUserInCommunityGroup(firebaseUser.uid);
      
      if (userData.referrerId) {
        await referralService.createReferral(userData.referrerId, firebaseUser.uid);
      }
      
      // Connexion directe après inscription
      setUser({ id: firebaseUser.uid, ...newUser } as User);
      isSigningUp.current = false;
    } catch (error: any) {
      isSigningUp.current = false;
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.CREATE, 'users');
      }
      throw new Error(error.message || 'Erreur lors de l\'inscription');
    }
  };

  const logout = async () => {
    try {
      if (user) {
        // Skip logAction if we're in mock offline mode
        if (localStorage.getItem('offline_admin_mock') !== 'true') {
          await logAction('Déconnexion', 'Session terminée');
        }
      }
      localStorage.removeItem('offline_admin_mock');
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUser = async (updatedUser: Partial<User>) => {
    if (user && user.id) {
      try {
        const userRef = doc(db, 'users', user.id);

        await updateDoc(userRef, updatedUser);
        await syncProfile(user.id, updatedUser);
        
        const newUserState = { ...user, ...updatedUser };
        setUser(newUserState);
        
        await logAction('Mise à jour profil', 'Modification des informations personnelles');
      } catch (error) {
        console.error("updateUser: Error", error);
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      }
    } else {
      console.error("updateUser: No user or user.id found");
    }
  };

  const submitTutorApplication = async (
    description: string, 
    documentUrl: string,
    subjects: string[],
    hourlyRates: {
      college?: number;
      lycee?: number;
      licence?: number;
      master?: number;
    }
  ) => {
    if (!user) return;
    try {
      await applicationService.submitTutorApplication(user, description, documentUrl, subjects, hourlyRates);
      await updateUser({ tutorStatus: 'pending' });
    } catch (error) {
      // Error handled in service
    }
  };

  const reviewApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    const app = applications.find(a => a.id === applicationId);
    if (!app) {
      toast.error("Demande introuvable.");
      return;
    }
    try {
      await toast.promise(
        applicationService.reviewTutorApplication(user, app, status),
        {
          loading: 'Traitement de la demande tuteur...',
          success: status === 'approved' ? 'Tuteur approuvé avec succès !' : 'Demande refusée.',
          error: 'Échec du traitement de la demande.'
        }
      );
    } catch (e) {
      console.error("Error reviewing tutor application:", e);
    }
  };

  const submitTeacherApplication = async (data: Omit<TeacherApplication, 'id' | 'userId' | 'user' | 'status' | 'createdAt'>) => {
    if (!user) return;
    try {
      await toast.promise(
        applicationService.submitTeacherApplication(user, data),
        {
          loading: 'Envoi de votre dossier enseignant...',
          success: 'Dossier envoyé avec succès !',
          error: 'Erreur lors de l\'envoi du dossier.'
        }
      );
      await updateUser({ teacherStatus: 'pending_approval' });
    } catch (error) {
      console.error("Error submitting teacher application:", error);
    }
  };

  const reviewTeacherApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    console.log(`AuthContext: reviewTeacherApplication called for ${applicationId} with status ${status}`);
    if (!user) {
      console.error("AuthContext: No user found in context during review");
      return;
    }
    const app = teacherApplications.find(a => a.id === applicationId);
    if (!app) {
      console.warn("AuthContext: Teacher application not found in local state:", applicationId);
      toast.error("Dossier enseignant introuvable.");
      return;
    }
    try {
      console.log("AuthContext: Executing applicationService.reviewTeacherApplication...");
      await toast.promise(
        applicationService.reviewTeacherApplication(user, app, status),
        {
          loading: 'Traitement du dossier enseignant...',
          success: status === 'approved' ? 'Enseignant approuvé avec succès !' : 'Dossier refusé.',
          error: 'Échec du traitement du dossier.'
        }
      );
      console.log("AuthContext: applicationService.reviewTeacherApplication completed successfully");
    } catch (e) {
      console.error("Error reviewing teacher application:", e);
    }
  };

  const submitSubscriptionRequest = async (type: 'exam' | 'premium' | 'motoride' | 'event' | 'institution', amount: number) => {
    if (!user) return;
    try {
      await toast.promise(
        applicationService.submitSubscriptionRequest(user, type, amount),
        {
          loading: 'Envoi de la demande d\'activation...',
          success: 'Demande envoyée ! Un administrateur va vérifier votre paiement.',
          error: 'Erreur lors de l\'envoi de la demande.'
        }
      );
      
      const updateData: Partial<User> = {};
      if (type === 'exam') updateData.examSubscriptionStatus = 'pending';
      else if (type === 'premium') updateData.premiumSubscriptionStatus = 'pending';
      else if (type === 'motoride') updateData.motoRideSubscriptionStatus = 'pending';
      else if (type === 'event') updateData.eventSubscriptionStatus = 'pending';
      else if (type === 'institution') {
        updateData.institutionProfile = {
          ...user.institutionProfile!,
          subscriptionStatus: 'pending'
        };
      }
      await updateUser(updateData);
    } catch (error) {
      console.error("Error submitting subscription request:", error);
    }
  };

  const reviewSubscriptionRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    const req = subscriptionRequests.find(r => r.id === requestId);
    if (!req) {
      toast.error("Demande d'abonnement introuvable.");
      return;
    }
    const targetUser = users.find(u => u.id === req.userId);
    if (!targetUser) {
      toast.error("Utilisateur introuvable pour cette demande.");
      return;
    }

    try {
      await toast.promise(
        applicationService.reviewSubscriptionRequest(user, req, targetUser, status),
        {
          loading: 'Traitement du paiement...',
          success: status === 'approved' ? 'Abonnement activé !' : 'Abonnement refusé.',
          error: 'Erreur lors du traitement du paiement.'
        }
      );
    } catch (e) {
      console.error("Error reviewing subscription request:", e);
    }
  };

  const updateUserRole = async (userId: string, role: User['role']) => {
    if (!user) return;
    await userService.updateUserRole(user, userId, role);
  };

  const activateUser = async (userId: string) => {
    if (!user) return;
    await userService.activateUser(user, userId);
  };

  const deactivateUser = async (userId: string) => {
    if (!user) return;
    await userService.deactivateUser(user, userId);
  };

  const adminCreateUser = async (userData: Partial<User> & { password?: string }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email!, userData.password!);
      const firebaseUser = userCredential.user;
      const newUser: Partial<User> = {
        ...userData,
        id: firebaseUser.uid,
        status: 'active',
        notificationPreferences: {
          pushEnabled: true,
          whatsappEnabled: userData.role === 'student',
          whatsappNumber: userData.phone || '',
          documents: true,
          internships: true,
          forums: true,
          contests: true,
          events: true
        }
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const deleteUser = async (userId: string) => {
    console.log("DEBUG AuthContext.deleteUser: Check user:", user, "isAdmin:", user?.role === 'admin');
    if (!user || user.role !== 'admin') {
      throw new Error('Action non autorisée. Seuls les administrateurs peuvent supprimer des utilisateurs.');
    }
    console.log("DEBUG AuthContext.deleteUser: Calling userService.deleteUser for:", userId);
    await userService.deleteUser(user, userId);
    console.log("DEBUG AuthContext.deleteUser: Successfully called userService.deleteUser");
  };

  const deleteDocument = async (id: string) => {
    await documentService.deleteDocument(id);
  };

  const updateDocument = async (id: string, data: Partial<any>) => {
    await documentService.updateDocument(id, data);
  };

  const addDocument = async (data: any) => {
    await documentService.addDocument(data);
    
    // Increment user contribution count
    if (user) {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        contributionCount: increment(1),
        rankingScore: increment(100) // Reward for sharing
      });
      setUser(prev => prev ? { ...prev, contributionCount: (prev.contributionCount || 0) + 1, rankingScore: (prev.rankingScore || 0) + 100 } : null);
    }

    await triggerNotification('document', {
      title: data.title,
      subject: data.subject,
      university: data.university,
      major: data.major
    });
  };

  const deleteInternship = async (id: string) => {
    await internshipService.deleteInternship(id);
  };

  const triggerNotification = async (type: 'document' | 'internship' | 'contest' | 'event' | 'reply' | 'marketplace' | 'community' | 'quiz' | 'public_service' | 'deal' | 'colocation', data: any) => {
    try {
      const sourceMap: Record<string, string> = {
        document: 'Documents',
        internship: 'Stages - Emplois - Bourses',
        contest: 'Challenges et Concours',
        event: 'Événements',
        marketplace: 'MarketPlace',
        community: 'Communauté',
        quiz: 'Révision et Quiz',
        public_service: 'Concours Fonction Publique',
        deal: 'Bons Plans',
        colocation: 'Colocation',
        reply: 'Réponse'
      };

      const title = `Nouveau dans ${sourceMap[type] || 'CampusBF'}`;
      const body = `Nouvelle publication : ${data.title || data.name || data.subject || 'Découvrez la nouvelle publication'}`;
      const url = `/${type}s`;

      await pushNotificationService.broadcastNotification(
        sourceMap[type] || type,
        title,
        body,
        url
      );

      // Appeler le backend pour envoyer les notifications (FCM & WhatsApp)
      fetch(`/api/notify/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(err => console.error("Error calling notification API:", err));
    } catch (error) {
      console.error(`Error triggering ${type} notification:`, error);
    }
  };

  const updateInternship = async (id: string, data: Partial<Internship>) => {
    await internshipService.updateInternship(id, data);
  };

  const addInternship = async (data: Omit<Internship, 'id' | 'createdAt'>) => {
    await internshipService.addInternship(data);
    await triggerNotification('internship', {
      title: data.title,
      company: data.company,
      major: (data as any).major || 'Autre',
      level: (data as any).level || ''
    });
  };

  const applyInternship = async (data: any) => {
    await internshipService.applyInternship(data);
  };

  const deleteMarketplaceItem = async (id: string) => {
    await marketplaceService.deleteMarketplaceItem(id);
  };

  const updateMarketplaceItem = async (id: string, data: Partial<MarketplaceItem>) => {
    await marketplaceService.updateMarketplaceItem(id, data);
  };

  const addMarketplaceItem = async (data: Omit<MarketplaceItem, 'id' | 'createdAt'>) => {
    await marketplaceService.addMarketplaceItem(data);
    await triggerNotification('marketplace', data);
  };

  const reviewMarketplaceItem = async (id: string, status: 'approved' | 'rejected') => {
    if (!user || user.role !== 'admin') return;
    const item = marketplace.find(i => i.id === id);
    if (!item) return;
    const seller = users.find(u => u.id === item.sellerId);
    
    await marketplaceService.reviewMarketplaceItem(user, item, seller, status);
  };

  const reportMarketplaceItem = async (id: string, reason: string) => {
    if (!user) return;
    const item = marketplace.find(i => i.id === id);
    if (!item) return;
    const seller = users.find(u => u.id === item.sellerId);

    try {
      await marketplaceService.reportMarketplaceItem(user, item, seller, reason);
      alert('Merci pour votre signalement. Nos administrateurs vont examiner cette annonce.');
    } catch (error: any) {
      if (error.message === 'Vous avez déjà signalé cette annonce.') {
        alert(error.message);
      }
    }
  };

  const deletePost = async (id: string) => {
    await contentService.deleteContent('posts', id);
  };

  const deleteEvent = async (id: string) => {
    console.log('AuthContext: Attempting to delete event:', id);
    try {
      await contentService.deleteContent('events', id);
      console.log('AuthContext: Event deleted successfully:', id);
    } catch (error) {
      console.error('AuthContext: Error deleting event:', id, error);
      throw error;
    }
  };

  const deleteNews = async (id: string) => {
    await contentService.deleteContent('news', id);
  };

  const addEvent = async (eventData: Omit<CampusEvent, 'id' | 'createdAt' | 'organizerId' | 'organizer' | 'attendees'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'events'), {
        ...eventData,
        organizerId: user.id,
        organizer: {
          id: user.id,
          firstName: user.firstName || 'Utilisateur',
          lastName: user.lastName || '',
          avatarUrl: user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
          role: user.role || 'student'
        },
        attendees: [user.id],
        createdAt: new Date().toISOString()
      });
      await logAction('Création événement', `Événement: ${eventData.title}`);
      await triggerNotification('event', { title: eventData.title, university: user.university });
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  const addComment = async (postId: string, content: string, fileUrl?: string, fileType?: string, fileName?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'comments'), {
        postId,
        authorId: user.id,
        author: {
          id: user.id,
          firstName: user.firstName || 'Utilisateur',
          lastName: user.lastName || '',
          avatarUrl: user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
          role: user.role || 'student'
        },
        content,
        fileUrl: fileUrl || '',
        fileType: fileType || '',
        fileName: fileName || '',
        createdAt: serverTimestamp(),
      });
      
      const post = community.find(p => p.id === postId);
      if (post && post.authorId !== user.id) {
        await triggerNotification('reply', {
          userId: post.authorId,
          discussionTitle: post.content.substring(0, 30) + '...'
        });
      }

      await logActivity({
        action: 'Commentaires',
        module: 'Communauté',
        details: `Nouveau commentaire sur le post ${postId}`,
        metadata: { postId }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
      throw error;
    }
  };

  const deleteLostAndFound = async (id: string) => {
    await contentService.deleteContent('lostAndFound', id);
  };

  const deleteReport = async (id: string) => {
    await reportService.deleteReport(id);
  };

  const deleteMotoRide = async (id: string) => {
    await motoRideService.deleteMotoRide(id);
  };

  const addReport = async (report: Omit<Report, 'id' | 'createdAt' | 'status'>) => {
    await reportService.addReport(report);
  };

  const addMotoRide = async (ride: Omit<MotoRide, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      await motoRideService.addMotoRide(user, ride);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const reportRideUser = async (userId: string, rideId: string, reason: string) => {
    if (!user) return;
    const reportedUser = users.find(u => u.id === userId);
    if (!reportedUser) return;
    
    try {
      await motoRideService.reportRideUser(user, reportedUser, rideId, reason);
      alert('Signalement enregistré. Merci de contribuer à la sécurité de CampusBF.');
    } catch (error) {
      // Error handled in service
    }
  };

  const reviewRide = async (rideId: string, revieweeId: string, rating: number, comment: string) => {
    if (!user) return;
    const reviewee = users.find(u => u.id === revieweeId);
    if (!reviewee) return;

    try {
      await motoRideService.reviewRide(user, reviewee, rideId, rating, comment);
    } catch (error) {
      // Error handled in service
    }
  };

  const updateRideStatus = async (rideId: string, status: MotoRide['status']) => {
    if (!user) return;
    await motoRideService.updateRideStatus(user, rideId, status);
  };

  const verifyDriver = async (userId: string, vehicleDetails: User['vehicleDetails']) => {
    if (!user) return;
    await motoRideService.verifyDriver(user, userId, vehicleDetails);
  };

  const reserveMotoRide = async (rideId: string, clientWhatsapp: string) => {
    if (!user) return;
    try {
      const ride = motoRides.find(r => r.id === rideId);
      if (!ride) return;

      // Notification for the driver
      await addNotification(ride.driverId, {
        type: 'info',
        title: 'Nouvelle réservation MotoRide',
        message: `${user.firstName} ${user.lastName} a réservé votre trajet de ${ride.departure} vers ${ride.destination}. Contact WhatsApp du client: ${clientWhatsapp}`
      });

      // Notification for the client
      await addNotification(user.id, {
        type: 'success',
        title: 'Réservation confirmée',
        message: `Votre réservation pour le trajet de ${ride.departure} vers ${ride.destination} a été envoyée au conducteur.`
      });
    } catch (error) {
      console.error("Error reserving moto ride:", error);
    }
  };

  const addNotification = async (userId: string, notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>) => {
    await notificationService.addNotification(userId, notification);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    await notificationService.markNotificationAsRead(notificationId);
  };

  const addTeacherReview = async (teacherId: string, rating: number, comment: string) => {
    if (!user) return;
    await userService.addTeacherReview(user, teacherId, rating, comment);
    
    // Notification for the teacher
    await addNotification(teacherId, {
      type: 'success',
      title: 'Nouvel avis reçu',
      message: `${user.firstName} ${user.lastName} a laissé un avis sur votre profil.`
    });
  };

  const addTraining = async (trainingData: Omit<Training, 'id' | 'createdAt' | 'status' | 'participants'>) => {
    if (!user) return;
    await trainingService.addTraining(user, trainingData);
  };

  const updateTraining = async (trainingId: string, data: Partial<Training>) => {
    if (!user) return;
    const training = trainings.find(t => t.id === trainingId);
    if (!training) return;
    
    // Check if the user is an admin or the owner of the training
    if (user.role !== 'admin' && training.trainerId !== user.id) return;
    
    await trainingService.updateTraining(user, trainingId, data);
  };

  const enrollInTraining = async (trainingId: string) => {
    if (!user) return;
    const training = trainings.find(t => t.id === trainingId);
    if (!training) return;
    if (training.participants.includes(user.id)) {
      alert("Vous êtes déjà inscrit à cette formation.");
      return;
    }
    if (training.participants.length >= training.maxParticipants) {
      alert("Cette formation est complète.");
      return;
    }
    await trainingService.enrollInTraining(user, training);
  };

  const reviewTraining = async (trainingId: string, rating: number, comment: string) => {
    if (!user) return;
    const training = trainings.find(t => t.id === trainingId);
    if (!training) return;
    const trainer = users.find(u => u.id === training.trainerId);
    await trainingService.reviewTraining(user, training, rating, comment, trainer);
  };

  const reportTraining = async (trainingId: string, reason: string, details: string) => {
    if (!user) return;
    await trainingService.reportTraining(user, trainingId, reason, details);
  };

  const updateTrainingStatus = async (trainingId: string, status: Training['status']) => {
    if (!user || user.role !== 'admin') return;
    const training = trainings.find(t => t.id === trainingId);
    if (!training) return;
    const trainer = users.find(u => u.id === training.trainerId);
    await trainingService.updateTrainingStatus(user, training, trainer, status);
  };

  const deleteTraining = async (trainingId: string) => {
    console.log("AuthContext: deleteTraining called for id:", trainingId);
    if (!user) { console.log("Aborted: no user"); return; }
    const training = trainings.find(t => t.id === trainingId);
    if (!training) { console.log("Aborted: no training found"); return; }
    if (user.role !== 'admin' && training.trainerId !== user.id) { console.log("Aborted: insufficient permissions"); return; }
    console.log("Calling trainingService.deleteTraining...");
    await trainingService.deleteTraining(user, training);
    console.log("trainingService.deleteTraining completed.");
  };

  const createContest = async (contest: Omit<Contest, 'id' | 'createdAt'>) => {
    if (!user) return;
    await contestService.createContest(user, contest);
    await triggerNotification('contest', contest);
  };

  const updateContest = async (id: string, data: Partial<Contest>) => {
    if (!user) return;
    await contestService.updateContest(user, id, data);
  };

  const deleteContest = async (id: string) => {
    console.log('AuthContext: deleteContest called for:', id);
    if (!user) {
      console.log('AuthContext: deleteContest failed: no user');
      return;
    }
    console.log('AuthContext: Calling contestService.deleteContest');
    await contestService.deleteContest(user, id);
    console.log('AuthContext: contestService.deleteContest called');
  };

  const addQuiz = async (quiz: Omit<Quiz, 'id' | 'createdAt'>) => {
    if (!user) return;
    await quizService.addQuiz(quiz);
    await triggerNotification('quiz', quiz);
  };

  const updateQuiz = async (id: string, quizData: Partial<Quiz>) => {
    if (!user) return;
    await quizService.updateQuiz(id, quizData);
  };

  const deleteQuiz = async (id: string) => {
    if (!user) return;
    await quizService.deleteQuiz(id);
  };

  const createDeal = async (deal: Omit<Deal, 'id' | 'createdAt'>) => {
    if (!user) return;
    await dealService.createDeal(deal);
    await logAction('Création Bon Plan', deal.title);
    await triggerNotification('deal', { title: deal.title });
  };

  const updateDeal = async (id: string, data: Partial<Deal>) => {
    if (!user) return;
    await dealService.updateDeal(id, data);
    await logAction('Modification Bon Plan', `ID: ${id}`);
  };

  const deleteDeal = async (id: string) => {
    if (!user) return;
    await dealService.deleteDeal(id);
    await logAction('Suppression Bon Plan', `ID: ${id}`);
  };

  const reviewDealSuggestion = async (id: string, status: 'reviewed' | 'rejected') => {
    if (!user || user.role !== 'admin') return;
    try {
      const suggestionRef = doc(db, 'deal_suggestions', id);
      await updateDoc(suggestionRef, { status });
      await logAction('Modération Suggestion Bon Plan', `ID: ${id} - Status: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deal_suggestions/${id}`);
    }
  };

  const deleteDealSuggestion = async (id: string) => {
    if (!user || user.role !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'deal_suggestions', id));
      await logAction('Suppression Suggestion Bon Plan', `ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deal_suggestions/${id}`);
    }
  };

  const createColocation = async (colocation: Omit<Colocation, 'id' | 'createdAt' | 'ownerId' | 'ownerName' | 'ownerAvatar'>) => {
    if (!user) return;
    await colocationService.createColocation(user, colocation);
    await logAction('Création Colocation', colocation.title);
    await triggerNotification('colocation', { title: colocation.title });
  };

  const updateColocation = async (id: string, data: Partial<Colocation>) => {
    if (!user) return;
    await colocationService.updateColocation(id, data);
    await logAction('Modification Colocation', `ID: ${id}`);
  };

  const deleteColocation = async (id: string) => {
    if (!user) return;
    await colocationService.deleteColocation(id);
    await logAction('Suppression Colocation', `ID: ${id}`);
  };

  const sendColocationRequest = async (request: Omit<ColocationRequest, 'id' | 'createdAt' | 'senderId' | 'senderName' | 'senderAvatar' | 'senderUniversity' | 'senderLevel' | 'status'>) => {
    if (!user) return;
    await colocationService.sendRequest(user, request);
    await logAction('Demande Colocation', `Coloc ID: ${request.colocationId}`);
  };

  const updateColocationRequestStatus = async (id: string, status: 'accepted' | 'rejected') => {
    if (!user) return;
    await colocationService.updateRequestStatus(id, status);
    await logAction('Statut Demande Colocation', `ID: ${id}, Statut: ${status}`);
  };

  const addColocationReview = async (review: Omit<ColocationReview, 'id' | 'createdAt' | 'authorId' | 'authorName'>) => {
    if (!user) return;
    await colocationService.addReview(user, review);
    await logAction('Avis Colocation', `Cible ID: ${review.targetId}`);
  };

  const registerForContest = async (contestId: string) => {
    if (!user) {
      throw new Error('Veuillez vous connecter pour participer au concours');
    }
    const contest = contests.find(c => c.id === contestId);
    if (!contest) {
      throw new Error('Concours non trouvé');
    }
    const participantsCount = contestParticipants.filter(p => p.contestId === contestId).length;
    const alreadyRegistered = contestParticipants.some(p => p.contestId === contestId && p.userId === user.id);
    await contestService.registerForContest(user, contest, participantsCount, alreadyRegistered);
  };

  const updateParticipantStatus = async (participantId: string, status: ContestParticipant['status']) => {
    if (!user) return;
    await contestService.updateParticipantStatus(user, participantId, status);
  };

  const publishContestResults = async (contestId: string, winners: ContestWinner[]) => {
    if (!user) return;
    await contestService.publishContestResults(user, contestId, winners);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin,
      users,
      tutors,
      teachers,
      totalUsersCount,
      totalDocumentsCount,
      ads,
      documents,
      internships,
      events,
      news,
      lostAndFound,
      marketplace,
      community,
      reports,
      motoRides,
      logs,
      logActivity,
      logAction,
      logDownload,
      deleteAd,
      updateAd,
      createAd,
      deleteDocument,
    updateDocument,
    addDocument,
      deleteInternship,
      triggerNotification,
      updateInternship,
      addInternship,
      applyInternship,
      deleteMarketplaceItem,
      updateMarketplaceItem,
      addMarketplaceItem,
      reviewMarketplaceItem,
      deletePost,
      deleteEvent,
      addEvent,
      addComment,
      deleteNews,
      deleteLostAndFound,
      deleteReport,
      deleteMotoRide,
      reserveMotoRide,
      reportRideUser,
      reviewRide,
      updateRideStatus,
      verifyDriver,
      syncCommunityGroup,
      addReport,
      addMotoRide,
      trainings,
      trainingEnrollments,
      trainingReviews,
      trainingReports,
      addTraining,
      updateTraining,
      enrollInTraining,
      reviewTraining,
      reportTraining,
      updateTrainingStatus,
      deleteTraining,
      publicServiceContests,
      addPublicServiceContest,
      deletePublicServiceContest,
      contests,
      contestParticipants,
      quizzes,
      deals,
      dealSuggestions,
      colocations,
      colocationRequests,
      colocationReviews,
      addQuiz,
      deleteQuiz,
      updateQuiz,
      createDeal,
      updateDeal,
      deleteDeal,
      reviewDealSuggestion,
      deleteDealSuggestion,
      createColocation,
      updateColocation,
      deleteColocation,
      sendColocationRequest,
      updateColocationRequestStatus,
      addColocationReview,
      createContest,
      updateContest,
      deleteContest,
      registerForContest,
      updateParticipantStatus,
      publishContestResults,
      login, 
      loginOffline,
      loginWithGoogle,
      resetPassword,
      signup,
      logout, 
      updateUser, 
      submitTutorApplication, 
      reviewApplication, 
      submitTeacherApplication,
      reviewTeacherApplication,
      submitSubscriptionRequest,
      reviewSubscriptionRequest,
      updateUserRole,
      activateUser,
      deactivateUser,
      adminCreateUser,
      deleteUser,
      addGroupMember,
      removeGroupMember,
      reportMarketplaceItem,
      academicNotifications,
      addAcademicNotification,
      markAcademicNotificationRead,
      applications,
      teacherApplications,
      subscriptionRequests,
      notifications,
      groups,
      addNotification,
      markNotificationAsRead,
      syncUserStats,
      isDocumentLocked,
      incrementActivity,
      addTeacherReview,
      isAuthenticated: !!user, 
      isLoading,
      isOfflineMode,
      showAuthModal,
      setShowAuthModal,
      openAuthModal,
      authModalCallback,
      setAuthModalCallback
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
