import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication, SubscriptionRequest, Ad, TeacherApplication, Notification, Internship, Group, CampusEvent, Report, News, LostAndFound, MarketplaceItem, Post, MotoRide, Log, Training, TrainingEnrollment, TrainingReview, TrainingReport, Contest, ContestParticipant, ContestWinner, Quiz, Deal, DealSuggestion, Colocation, ColocationRequest, ColocationReview } from '@/types';
import { ADMIN_USER, MOCK_APPLICATIONS, MOCK_USERS, MOCK_ADS, MOCK_NOTIFICATIONS } from '@/data/mock';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { documentService } from '@/services/documentService';
import { motoRideService } from '@/services/motoRideService';
import { logService } from '@/services/logService';
import { notificationService } from '@/services/notificationService';
import { internshipService } from '@/services/internshipService';
import { marketplaceService } from '@/services/marketplaceService';
import { contentService } from '@/services/contentService';
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
  where,
  serverTimestamp,
  getDocs,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  users: User[];
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
  triggerNotification: (type: 'document' | 'internship' | 'contest' | 'event' | 'reply', data: any) => Promise<void>;
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
  addTeacherReview: (teacherId: string, rating: number, comment: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ADMIN_EMAILS = [
    'urbain.traoreurb@gmail.com',
    'urbain.traoreurb@gmail',
    'urbain.traoreurb@gmail.com.',
    'urbain.traore@yahoo.fr'
  ];

  const isAdminEmail = (email: string | null | undefined) => {
    if (!email) return false;
    const lowerEmail = email.toLowerCase().trim();
    return ADMIN_EMAILS.some(adminEmail => lowerEmail === adminEmail.toLowerCase().trim());
  };

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
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email);
      
      if (!firebaseUser) {
        console.log("No firebase user");
        setUser(null);
        setIsLoading(false);
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
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          return;
        }

        if (userDoc.exists()) {
          console.log("User doc exists, updating last active...");
          const data = userDoc.data();
          initialUserData = { id: firebaseUser.uid, ...data } as User;
          
          // Mise à jour de la dernière activité
          try {
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastActiveAt: serverTimestamp()
            });
          } catch (err: any) {
             console.error("Firestore updateDoc error for lastActiveAt:", err);
             // Non-critical, continue
          }

          // Demande de permission pour les notifications
          setTimeout(() => {
            requestNotificationPermission(firebaseUser.uid);
          }, 3000);
          
          if (isAdminEmail(firebaseUser.email) && (initialUserData as any).role !== 'admin') {
            console.log("Upgrading user to admin...");
            (initialUserData as any).role = 'admin';
            try {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
            } catch (err: any) {
               console.error("Firestore updateDoc error for role upgrade:", err);
            }
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
            invitedUsers: []
          };
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            initialUserData = { id: firebaseUser.uid, ...newUser } as User;
            await communityService.ensureUserInCommunityGroup(firebaseUser.uid);
          } catch (err: any) {
             console.error("Firestore setDoc error for new user creation:", err);
             handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
             return;
          }
        }

        console.log("Setting user state:", initialUserData.id);
        setUser(initialUserData);
        // Log login
        try {
          await logService.logAction(initialUserData, 'Connexion', 'Session ouverte');
        } catch (err: any) {
          console.error("Error logging login action:", err);
        }
      } catch (error: any) {
        console.error("Unexpected error in onAuthStateChanged:", error);
        if (error.message && error.message.includes('{')) {
          // Already handled by handleFirestoreError and caught here
          throw error;
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
    unsubscribes.push(onSnapshot(collection(db, 'ads'), (snapshot) => {
      setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'documents'), (snapshot) => {
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'internships'), (snapshot) => {
      setInternships(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Internship)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampusEvent)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'posts'), (snapshot) => {
      setCommunity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'news'), (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'lostAndFound'), (snapshot) => {
      setLostAndFound(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LostAndFound)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'reports'), (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'quizzes'), (snapshot) => {
      setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'contests'), (snapshot) => {
      setContests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contest)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'deals'), (snapshot) => {
      setDeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deal)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'deal_suggestions'), (snapshot) => {
      setDealSuggestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DealSuggestion)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'colocations'), (snapshot) => {
      setColocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Colocation)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'colocation_requests'), (snapshot) => {
      setColocationRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ColocationRequest)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'colocation_reviews'), (snapshot) => {
      setColocationReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ColocationReview)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'contest_participants'), (snapshot) => {
      setContestParticipants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContestParticipant)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'training_enrollments'), (snapshot) => {
      setTrainingEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingEnrollment)));
    }));

    unsubscribes.push(onSnapshot(collection(db, 'training_reviews'), (snapshot) => {
      setTrainingReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingReview)));
    }));

    // Restricted/Conditional lists
    const marketplaceQuery = user.role === 'admin' 
      ? collection(db, 'marketplace')
      : query(collection(db, 'marketplace'), where('status', '==', 'approved'));
    unsubscribes.push(onSnapshot(marketplaceQuery, (snapshot) => {
      setMarketplace(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem)));
    }));

    const motoRideQuery = user.role === 'admin'
      ? collection(db, 'motoRides')
      : query(collection(db, 'motoRides'), where('status', '==', 'active'));
    unsubscribes.push(onSnapshot(motoRideQuery, (snapshot) => {
      setMotoRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MotoRide)));
    }));

    const trainingsQuery = user.role === 'admin'
      ? collection(db, 'trainings')
      : query(collection(db, 'trainings'), where('status', '==', 'approved'));
    unsubscribes.push(onSnapshot(trainingsQuery, (snapshot) => {
      setTrainings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Training)));
    }));

    const usersQuery = collection(db, 'users');
    unsubscribes.push(onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }));

    // Notifications for current user
    const qNotifs = query(collection(db, 'notifications'), where('userId', '==', user.id));
    unsubscribes.push(onSnapshot(qNotifs, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }));

    // Admin only lists
    if (user.role === 'admin') {
      unsubscribes.push(onSnapshot(collection(db, 'applications'), (snapshot) => {
        setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorApplication)));
      }));

      unsubscribes.push(onSnapshot(collection(db, 'teacherApplications'), (snapshot) => {
        setTeacherApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherApplication)));
      }));

      unsubscribes.push(onSnapshot(collection(db, 'subscriptionRequests'), (snapshot) => {
        setSubscriptionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionRequest)));
      }));

      unsubscribes.push(onSnapshot(collection(db, 'training_reports'), (snapshot) => {
        setTrainingReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingReport)));
      }));

      unsubscribes.push(onSnapshot(collection(db, 'logs'), (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log)));
      }));
    } else {
      // Non-admins see their own applications
      const qApps = query(collection(db, 'applications'), where('userId', '==', user.id));
      unsubscribes.push(onSnapshot(qApps, (snapshot) => {
        setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorApplication)));
      }));

      const qTeacherApps = query(collection(db, 'teacherApplications'), where('userId', '==', user.id));
      unsubscribes.push(onSnapshot(qTeacherApps, (snapshot) => {
        setTeacherApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherApplication)));
      }));
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user?.id, user?.role]);

  const ensureUserInCommunityGroup = async (userId: string) => {
    await communityService.ensureUserInCommunityGroup(userId);
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
        invitedUsers: []
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
    } catch (error: any) {
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
    if (!app) return;
    await applicationService.reviewTutorApplication(user, app, status);
  };

  const submitTeacherApplication = async (data: Omit<TeacherApplication, 'id' | 'userId' | 'user' | 'status' | 'createdAt'>) => {
    if (!user) return;
    try {
      await applicationService.submitTeacherApplication(user, data);
      await updateUser({ teacherStatus: 'pending_approval' });
    } catch (error) {
      // Error handled in service
    }
  };

  const reviewTeacherApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    const app = teacherApplications.find(a => a.id === applicationId);
    if (!app) return;
    await applicationService.reviewTeacherApplication(user, app, status);
  };

  const submitSubscriptionRequest = async (type: 'exam' | 'premium' | 'motoride' | 'event' | 'institution', amount: number) => {
    if (!user) return;
    try {
      await applicationService.submitSubscriptionRequest(user, type, amount);
      
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
      // Error handled in service
    }
  };

  const reviewSubscriptionRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    const req = subscriptionRequests.find(r => r.id === requestId);
    if (!req) return;
    const targetUser = users.find(u => u.id === req.userId);
    if (!targetUser) return;

    await applicationService.reviewSubscriptionRequest(user, req, targetUser, status);
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
        status: 'active'
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

  const triggerNotification = async (type: 'document' | 'internship' | 'contest' | 'event' | 'reply', data: any) => {
    try {
      await fetch(`/api/notify/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
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
      console.error('Error adding comment:', error);
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
  };

  const deleteQuiz = async (id: string) => {
    if (!user) return;
    await quizService.deleteQuiz(id);
  };

  const createDeal = async (deal: Omit<Deal, 'id' | 'createdAt'>) => {
    if (!user) return;
    await dealService.createDeal(deal);
    await logAction('Création Bon Plan', deal.title);
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
      users,
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
