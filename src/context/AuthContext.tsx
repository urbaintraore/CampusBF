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
import toast from 'react-hot-toast';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail
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
  const cached = sessionStorage.getItem(cacheKey);
  const cacheTime = sessionStorage.getItem(cacheKey + '_time');
  const now = Date.now();
  // Cache valide pour 30 minutes (1800000 ms)
  if (cached && cacheTime && now - parseInt(cacheTime) < 1800000) {
    return JSON.parse(cached);
  }
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    sessionStorage.setItem(cacheKey + '_time', now.toString());
  } catch (e) {
    // Ignorer en cas de quota dépassé localement
  }
  return data;
}

async function fetchCountWithSessionCache(cacheKey: string, ref: any) {
  const cached = sessionStorage.getItem(cacheKey);
  const cacheTime = sessionStorage.getItem(cacheKey + '_time');
  const now = Date.now();
  if (cached && cacheTime && now - parseInt(cacheTime) < 1800000) return parseInt(cached);
  
  // Importer dynamiquement pour éviter un chargement inutile si pas besoin
  const { getCountFromServer } = await import('firebase/firestore');
  const snapshot = await getCountFromServer(ref);
  const count = snapshot.data().count;
  try {
    sessionStorage.setItem(cacheKey, count.toString());
    sessionStorage.setItem(cacheKey + '_time', now.toString());
  } catch (e) {}
  return count;
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
  logAction: (action: string, details?: string) => Promise<void>;
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
  enrollInTraining: (trainingId: string) => Promise<void>;
  reviewTraining: (trainingId: string, rating: number, comment: string) => Promise<void>;
  reportTraining: (trainingId: string, reason: string, details: string) => Promise<void>;
  updateTrainingStatus: (trainingId: string, status: Training['status']) => Promise<void>;
  deleteTraining: (trainingId: string) => Promise<void>;
  syncCommunityGroup: () => Promise<void>;
  reviewMarketplaceItem: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  reportMarketplaceItem: (id: string, reason: string) => Promise<void>;
  login: (email?: string, password?: string, asAdmin?: boolean) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signup: (userData: Partial<User> & { password?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
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
  incrementActivity: (activity: keyof NonNullable<User['activityStats']>) => Promise<void>;
  addTeacherReview: (teacherId: string, rating: number, comment: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  const [colocationRequests, setColocationRequests] = useState<ColocationRequest[]>([]);
  const [colocationReviews, setColocationReviews] = useState<ColocationReview[]>([]);
  const [publicServiceContests, setPublicServiceContests] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      'urbain.traoreurb@gmail.com.'
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
  }, [user, firebaseEmail, auth.currentUser?.email]); // Include auth.currentUser?.email just in case

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
      };
      // Remove undefined fields
      Object.keys(profileData).forEach(key => (profileData as any)[key] === undefined && delete (profileData as any)[key]);
      
      await setDoc(doc(db, 'profiles', userId), profileData, { merge: true });
    } catch (error) {
      console.error("Error syncing profile:", error);
    }
  };

  const logAction = async (action: string, details?: string) => {
    await logService.logAction(user, action, details);
  };

  const incrementActivity = async (activity: keyof NonNullable<User['activityStats']>) => {
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

    const pointValue = weights[activity] || 1;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        [`activityStats.${activity}`]: increment(1),
        rankingScore: increment(pointValue)
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
    // Safety timeout to prevent stuck loading state
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth loading took too long, forcing state change");
        setIsLoading(false);
      }
    }, 8000);

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or internet connection.");
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email);
      setFirebaseEmail(firebaseUser?.email || null);
      clearTimeout(loadingTimeout);
      
      if (!firebaseUser) {
        console.log("No firebase user");
        setUser(null);
        setIsLoading(false);
        return;
      }

      // If signup is in progress, let it handle the doc creation
      if (isSigningUp.current) {
        console.log("Signup in progress, skipping auto-doc creation in onAuthStateChanged");
        return;
      }

      try {
        console.log("Auth State Changed for user:", firebaseUser.uid);
        let initialUserData: User;
        
        console.log("Fetching user doc for:", firebaseUser.uid);
        let userDoc;
        try {
          userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        } catch (err: any) {
          console.error("Firestore getDoc error for users collection:", err);
          if (err.message?.includes('Quota limit exceeded')) {
            toast.error("Quota Firestore dépassé. L'application risque de ne pas fonctionner correctement jusqu'à demain.");
            setIsLoading(false);
            return;
          }
          // On some environments, IndexedDB might be failing. We don't want to block the whole app.
          console.warn("Falling back to minimal profile due to Firestore error");
          initialUserData = { 
            id: firebaseUser.uid, 
            email: firebaseUser.email || '',
            role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            createdAt: new Date().toISOString()
          } as any;
          setUser(initialUserData);
          setIsLoading(false);
          return;
        }

        if (userDoc.exists()) {
          console.log("User doc exists, updating last active...");
          const data = userDoc.data();
          initialUserData = { id: firebaseUser.uid, ...data } as User;
          
          // Initializes daily quests and updates consecutive logins logic
          initialUserData = await questService.initializeDailyQuests(initialUserData);

          // Mise à jour de la dernière activité et stats de connexion
          try {
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastActiveAt: serverTimestamp(),
              'activityStats.logins': increment(1),
            });
          } catch (err: any) {
             console.error("Firestore updateDoc error for lastActiveAt/stats:", err);
          }

          // Demande de permission pour les notifications
          setTimeout(() => {
            requestNotificationPermission(firebaseUser.uid);
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
            if (newUser.role !== 'student') {
              await communityService.ensureUserInCommunityGroup(firebaseUser.uid);
            }
          } catch (err: any) {
             console.error("Firestore setDoc error for new user creation:", err);
             handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
             return;
          }
        }

        console.log("Setting user state:", initialUserData.id);
        setUser(initialUserData);
        
        // Ensure user is in the community group (except for students who must join manually)
        if (firebaseUser.uid && initialUserData && initialUserData.role !== 'student') {
          communityService.ensureUserInCommunityGroup(firebaseUser.uid).catch(console.error);
        }
        
        // Log login
        try {
          await logService.logAction(initialUserData, 'Connexion', 'Session ouverte');
        } catch (err: any) {
          console.error("Error logging login action:", err);
        }
      } catch (error: any) {
        console.error("Unexpected error in onAuthStateChanged:", error);
        if (error.code !== 'auth/network-request-failed' && error.code !== 'unavailable') {
          toast.error(`Erreur d'authentification: ${error.message || 'Problème de connexion'}`);
        }
        if (error.message && error.message.includes('{')) {
          const errData = JSON.parse(error.message);
          if (errData.error?.includes('offline')) {
             console.log("Suppressing offline error throw");
          } else {
             throw error;
          }
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listeners for data fetching - re-runs when user role changes
  useEffect(() => {
    if (!user) {
      // Clear data state on logout
      setUsers([]);
      setTutors([]);
      setTeachers([]);
      setAds([]);
      setDocuments([]);
      setApplications([]);
      setTeacherApplications([]);
      setSubscriptionRequests([]);
      setNotifications([]);
      setInternships([]);
      setEvents([]);
      setNews([]);
      setLostAndFound([]);
      setMarketplace([]);
      setCommunity([]);
      setGroups([]);
      setLogs([]);
      setTrainings([]);
      setTrainingEnrollments([]);
      setTrainingReviews([]);
      setTrainingReports([]);
      setContests([]);
      setContestParticipants([]);
      setQuizzes([]);
      setDeals([]);
      setDealSuggestions([]);
      setColocations([]);
      setColocationRequests([]);
      setColocationReviews([]);
      return;
    }

    console.log("Starting listeners for user role:", user.role);
    const unsubscribes: (() => void)[] = [];

    // User document listener (already covered for current user basically, but let's keep it robust)
    unsubscribes.push(onSnapshot(doc(db, 'users', user.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser(prev => prev ? { ...prev, ...data } : null);
      }
    }));

    // Public/Authenticated lists
    fetchWithSessionCache('cache_Ads', query(collection(db, 'ads'), limit(50))).then(data => setAds(data as Ad[]));

    // fetchWithSessionCache('cache_Documents', query(collection(db, 'documents'))).then(data => setDocuments(data as any[]));
    getDocs(query(collection(db, 'documents'))).then(snapshot => setDocuments(snapshot.docs.map(d => ({id: d.id, ...d.data()}))));

    fetchWithSessionCache('cache_Internships', query(collection(db, 'internships'), limit(50))).then(data => setInternships(data as Internship[]));

    fetchWithSessionCache('cache_Events', query(collection(db, 'events'), limit(50))).then(data => setEvents(data as CampusEvent[]));

    const unsubscribeGroups = onSnapshot(query(collection(db, 'groups'), limit(50)), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(data as Group[]);
    });
    unsubscribes.push(unsubscribeGroups);

    fetchWithSessionCache('cache_Community', query(collection(db, 'posts'), limit(50))).then(data => setCommunity(data as Post[]));

    fetchWithSessionCache('cache_News', query(collection(db, 'news'), limit(50))).then(data => setNews(data as News[]));

    fetchWithSessionCache('cache_LostAndFound', query(collection(db, 'lostAndFound'), limit(50))).then(data => setLostAndFound(data as LostAndFound[]));

    fetchWithSessionCache('cache_Reports', query(collection(db, 'reports'), limit(50))).then(data => setReports(data as Report[]));

    fetchWithSessionCache('cache_Quizzes', query(collection(db, 'quizzes'), limit(50))).then(data => setQuizzes(data as Quiz[]));

    fetchWithSessionCache('cache_Contests', query(collection(db, 'contests'), limit(50))).then(data => setContests(data as Contest[]));

    fetchWithSessionCache('cache_Deals', query(collection(db, 'deals'), limit(50))).then(data => setDeals(data as Deal[]));

    fetchWithSessionCache('cache_DealSuggestions', query(collection(db, 'deal_suggestions'), limit(50))).then(data => setDealSuggestions(data as DealSuggestion[]));

    fetchWithSessionCache('cache_Colocations', query(collection(db, 'colocations'), limit(50))).then(data => setColocations(data as Colocation[]));

    fetchWithSessionCache('cache_ColocationRequests', query(collection(db, 'colocation_requests'), limit(50))).then(data => setColocationRequests(data as ColocationRequest[]));

    fetchWithSessionCache('cache_ColocationReviews', query(collection(db, 'colocation_reviews'), limit(50))).then(data => setColocationReviews(data as ColocationReview[]));

    fetchWithSessionCache('cache_ContestParticipants', query(collection(db, 'contest_participants'), limit(1000))).then(data => setContestParticipants(data as ContestParticipant[]));

    fetchWithSessionCache('cache_TrainingEnrollments', query(collection(db, 'training_enrollments'), limit(50))).then(data => setTrainingEnrollments(data as TrainingEnrollment[]));

    fetchWithSessionCache('cache_TrainingReviews', query(collection(db, 'training_reviews'), limit(50))).then(data => setTrainingReviews(data as TrainingReview[]));

    // unsubscribes.push(onSnapshot(collection(db, 'public_service_contests'), (snapshot) => {
    //   setPublicServiceContests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    // }));

    // Restricted/Conditional lists
    const marketplaceQuery = user.role === 'admin' 
      ? query(collection(db, 'marketplace'), limit(100))
      : query(collection(db, 'marketplace'), or(where('status', '==', 'approved'), where('sellerId', '==', user.id)), limit(50));
    fetchWithSessionCache('cache_Marketplace', marketplaceQuery).then(data => setMarketplace(data as MarketplaceItem[]));

    const motoRideQuery = user.role === 'admin'
      ? query(collection(db, 'motoRides'), limit(100))
      : query(collection(db, 'motoRides'), or(where('status', '==', 'active'), where('driverId', '==', user.id)), limit(50));
    fetchWithSessionCache('cache_MotoRides', motoRideQuery).then(data => setMotoRides(data as MotoRide[]));

    const trainingsQuery = user.role === 'admin'
      ? query(collection(db, 'trainings'), limit(100))
      : query(collection(db, 'trainings'), or(where('status', '==', 'approved'), where('authorId', '==', user.id)), limit(50));
    fetchWithSessionCache('cache_Trainings', trainingsQuery).then(data => setTrainings(data as Training[]));

    // Count exact users instead of fetching them all to save quota
    fetchCountWithSessionCache('cache_count_TotalUsersCount', collection(db, 'users')).then(count => setTotalUsersCount(count)).catch(e => console.error(e));
    fetchCountWithSessionCache('cache_count_TotalDocumentsCount', collection(db, 'documents')).then(count => setTotalDocumentsCount(count)).catch(e => console.error(e));

    // Extremely heavy query causing quota exhaustion. Limit to 10 for basic display if needed.
    const usersQuery = query(collection(db, 'users'), limit(10));
    fetchWithSessionCache('cache_Users', usersQuery).then(data => setUsers(data as User[]));

    const tutorsQuery = query(collection(db, 'users'), where('tutorStatus', '==', 'approved'), limit(200));
    fetchWithSessionCache('cache_Tutors', tutorsQuery).then(data => setTutors(data as User[]));

    const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'), limit(200));
    fetchWithSessionCache('cache_Teachers', teachersQuery).then(data => setTeachers(data as User[]));

    // Notifications for current user limited to 50 to prevent huge reads
    const qNotifs = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [user.id, 'all']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubscribes.push(onSnapshot(qNotifs, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => {
      console.error("onSnapshot Notifications Error:", error);
    }));

    // Admin only lists
    if (isAdmin) {
      unsubscribes.push(onSnapshot(query(collection(db, 'applications'), limit(100)), (snapshot) => {
        setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorApplication)));
      }, (error) => {
        console.error("onSnapshot Applications Error:", error);
      }));

      unsubscribes.push(onSnapshot(query(collection(db, 'teacherApplications'), limit(100)), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherApplication));
        console.log("AuthContext: teacherApplications updated via onSnapshot:", data.length);
        setTeacherApplications(data);
      }, (error) => {
        console.error("onSnapshot TeacherApplications Error:", error);
      }));

      unsubscribes.push(onSnapshot(query(collection(db, 'subscriptionRequests'), limit(100)), (snapshot) => {
        setSubscriptionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionRequest)));
      }, (error) => {
        console.error("onSnapshot SubscriptionRequests Error:", error);
      }));

      fetchWithSessionCache('cache_TrainingReports', query(collection(db, 'training_reports'), limit(100))).then(data => setTrainingReports(data as TrainingReport[]));

      fetchWithSessionCache('cache_Logs', query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100))).then(data => setLogs(data as Log[]));
    } else {
      // Non-admins see their own applications
      const qApps = query(collection(db, 'applications'), where('userId', '==', user.id));
      fetchWithSessionCache('cache_Applications', qApps).then(data => setApplications(data as TutorApplication[]));

      const qTeacherApps = query(collection(db, 'teacherApplications'), where('userId', '==', user.id));
      fetchWithSessionCache('cache_TeacherApplications', qTeacherApps).then(data => setTeacherApplications(data as TeacherApplication[]));
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user?.id, user?.role]);

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
      await auth.authStateReady();
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase login successful");
    } catch (error: any) {
      console.error("Firebase login error:", error);
      let errorMessage = 'Erreur de connexion';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou mot de passe incorrect. Si vous utilisiez la connexion Google auparavant, veuillez utiliser "Mot de passe oublié" pour définir un nouveau mot de passe.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives infructueuses. Veuillez réessayer plus tard.';
      } else if (error.message?.includes('400')) {
        errorMessage = 'Identifiants invalides. Si vous utilisiez Google, réinitialisez votre mot de passe.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) throw new Error('Email requis');
    try {
      console.log("Attempting to send password reset email to:", email);
      await sendPasswordResetEmail(auth, email);
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

    isSigningUp.current = true;
    try {
      await auth.authStateReady();
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;
      
      // L'envoi automatique de l'email de vérification a été retiré pour ne pas obliger l'utilisateur à vérifier son email immédiatement
      // await sendEmailVerification(firebaseUser);

      const newUser: Partial<User> = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email,
        university: userData.university || '',
        role: isAdminEmail(userData.email) ? 'admin' : (userData.role || 'student'),
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
        await logAction('Déconnexion', 'Session terminée');
      }
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUser = async (updatedUser: Partial<User>) => {
    if (user && user.id) {
      console.log("updateUser: Updating user", user.id, "with", updatedUser);
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, updatedUser);
        await syncProfile(user.id, updatedUser);
        setUser({ ...user, ...updatedUser });
        console.log("updateUser: User updated successfully");
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
    if (!user || user.role !== 'admin') {
      throw new Error('Action non autorisée. Seuls les administrateurs peuvent supprimer des utilisateurs.');
    }
    await userService.deleteUser(user, userId);
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
    if (!user.isVerified) {
      alert("Vous devez vérifier votre compte avant de publier une formation.");
      return;
    }
    await trainingService.addTraining(user, trainingData);
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
    if (!user) return;
    const training = trainings.find(t => t.id === trainingId);
    if (!training) return;
    if (user.role !== 'admin' && training.trainerId !== user.id) return;
    await trainingService.deleteTraining(user, training);
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
      logAction,
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
      applications,
      teacherApplications,
      subscriptionRequests,
      notifications,
      groups,
      addNotification,
      markNotificationAsRead,
      incrementActivity,
      addTeacherReview,
      isAuthenticated: !!user, 
      isLoading 
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
