import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication, SubscriptionRequest, Ad, TeacherApplication, Notification, Internship, Group, CampusEvent, Report, News, LostAndFound, MarketplaceItem, Post, MotoRide, Log, Training, TrainingEnrollment, TrainingReview, TrainingReport, Contest, ContestParticipant, ContestWinner } from '@/types';
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
  createContest: (contest: Omit<Contest, 'id' | 'createdAt'>) => Promise<void>;
  updateContest: (id: string, data: Partial<Contest>) => Promise<void>;
  deleteContest: (id: string) => Promise<void>;
  registerForContest: (contestId: string) => Promise<void>;
  updateParticipantStatus: (participantId: string, status: ContestParticipant['status']) => Promise<void>;
  publishContestResults: (contestId: string, winners: ContestWinner[]) => Promise<void>;
  logAction: (action: string, details?: string) => Promise<void>;
  updateAd: (id: string, data: Partial<Ad>) => Promise<void>;
  createAd: (ad: Omit<Ad, 'id'>) => Promise<void>;
  deleteAd: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, data: Partial<any>) => Promise<void>;
  addDocument: (data: any) => Promise<void>;
  deleteInternship: (id: string) => Promise<void>;
  updateInternship: (id: string, data: Partial<Internship>) => Promise<void>;
  addInternship: (data: Omit<Internship, 'id' | 'createdAt'>) => Promise<void>;
  applyInternship: (data: any) => Promise<void>;
  deleteMarketplaceItem: (id: string) => Promise<void>;
  updateMarketplaceItem: (id: string, data: Partial<MarketplaceItem>) => Promise<void>;
  addMarketplaceItem: (data: Omit<MarketplaceItem, 'id' | 'createdAt'>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdminEmail = (email: string | null | undefined) => {
    if (!email) return false;
    const lowerEmail = email.toLowerCase().trim();
    return lowerEmail === 'urbain.traoreurb@gmail.com' || 
           lowerEmail === 'urbain.traoreurb@gmail' || 
           lowerEmail === 'urbain.traoreurb@gmail.com.';
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
    // Test connection
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

    let unsubscribes: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email);
      // Clear existing listeners when auth state changes
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];

      if (firebaseUser) {
        // Listener pour les publicités (accessible à tous les utilisateurs authentifiés)
        unsubscribes.push(onSnapshot(collection(db, 'ads'), (snapshot) => {
          console.log("Ads snapshot received, count:", snapshot.size);
          setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad)));
        }, (error) => {
          console.error("Error loading ads:", error);
          handleFirestoreError(error, OperationType.LIST, 'ads');
        }));

        try {
          console.log("Fetching user doc for:", firebaseUser.uid);
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let retries = 0;
          while (!userDoc.exists() && retries < 5) {
            console.log("User doc not found, waiting...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            retries++;
          }
          
          let initialUserData: User;

          if (userDoc.exists()) {
            console.log("User doc exists");
            const data = userDoc.data();
            initialUserData = { id: firebaseUser.uid, ...data } as User;
            
            // Sync profile for existing users to ensure they appear in "Find Classmates"
            await syncProfile(firebaseUser.uid, data);

            // Force admin role for the owner email if not already set
            console.log("Checking admin email for:", firebaseUser.email);
            if (isAdminEmail(firebaseUser.email)) {
              console.log("Email matches admin list");
              if (initialUserData.role !== 'admin') {
                console.log("Forcing admin role in local state and Firestore");
                initialUserData.role = 'admin';
                try {
                  await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
                  console.log("Firestore updated with admin role");
                } catch (e) {
                  console.error("Failed to auto-upgrade to admin:", e);
                }
              } else {
                console.log("User already has admin role in Firestore");
              }
            } else {
              console.log("Email does not match admin list");
            }
          } else {
            console.log("User doc does not exist, creating default");
            const newUser: Partial<User> = {
              firstName: firebaseUser.displayName?.split(' ')[0] || 'Utilisateur',
              lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || 'CampusBF',
              email: firebaseUser.email || '',
              university: '',
              role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
              avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              await syncProfile(firebaseUser.uid, newUser);
              initialUserData = { id: firebaseUser.uid, ...newUser } as User;
              await ensureUserInCommunityGroup(firebaseUser.uid);
            } catch (err) {
              console.error("Failed to create default user doc", err);
              await signOut(auth);
              setUser(null);
              return;
            }
          }

          setUser(initialUserData);
          console.log("User set:", initialUserData);

          // Log login
          await logService.logAction(initialUserData, 'Connexion', 'Session ouverte');

          // Set up real-time listener for the user's own document
          unsubscribes.push(onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              setUser({ id: firebaseUser.uid, ...docSnap.data() } as User);
            }
          }, (error) => {
            console.error("Error listening to user doc:", error);
          }));

          // Start listeners only after we have the user data and role
          
          // Public/Authenticated lists
          unsubscribes.push(onSnapshot(collection(db, 'documents'), (snapshot) => {
              setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'documents')));

            unsubscribes.push(onSnapshot(collection(db, 'internships'), (snapshot) => {
              setInternships(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Internship)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'internships')));

            unsubscribes.push(onSnapshot(collection(db, 'events'), (snapshot) => {
              setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampusEvent)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'events')));

            unsubscribes.push(onSnapshot(collection(db, 'groups'), (snapshot) => {
              setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'groups')));

            const marketplaceQuery = initialUserData.role === 'admin' 
              ? collection(db, 'marketplace')
              : query(collection(db, 'marketplace'), where('status', '==', 'approved'));

            unsubscribes.push(onSnapshot(marketplaceQuery, (snapshot) => {
              setMarketplace(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'marketplace')));

            unsubscribes.push(onSnapshot(collection(db, 'posts'), (snapshot) => {
              setCommunity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts')));

            unsubscribes.push(onSnapshot(collection(db, 'news'), (snapshot) => {
              setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'news')));

            unsubscribes.push(onSnapshot(collection(db, 'lostAndFound'), (snapshot) => {
              setLostAndFound(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LostAndFound)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'lostAndFound')));

            unsubscribes.push(onSnapshot(collection(db, 'reports'), (snapshot) => {
              setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'reports')));

            const motoRideQuery = initialUserData.role === 'admin'
              ? collection(db, 'motoRides')
              : query(
                  collection(db, 'motoRides'), 
                  where('status', '==', 'active'),
                  where('university', '==', initialUserData.university)
                );

            unsubscribes.push(onSnapshot(motoRideQuery, (snapshot) => {
              setMotoRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MotoRide)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'motoRides')));

            const trainingsQuery = initialUserData.role === 'admin'
              ? collection(db, 'trainings')
              : query(collection(db, 'trainings'), where('status', '==', 'approved'));

            unsubscribes.push(onSnapshot(trainingsQuery, (snapshot) => {
              setTrainings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Training)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'trainings')));

            unsubscribes.push(onSnapshot(collection(db, 'training_enrollments'), (snapshot) => {
              setTrainingEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingEnrollment)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'training_enrollments')));

            unsubscribes.push(onSnapshot(collection(db, 'training_reviews'), (snapshot) => {
              setTrainingReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingReview)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'training_reviews')));

            // Public users list (only teachers and tutors for non-admins)
            const usersQuery = initialUserData.role === 'admin'
              ? collection(db, 'users')
              : query(collection(db, 'users'), where('role', 'in', ['teacher', 'tutor']));

            unsubscribes.push(onSnapshot(usersQuery, (snapshot) => {
              setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'users')));

            // User-specific notifications
            const qNotifs = query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid));
            unsubscribes.push(onSnapshot(qNotifs, (snapshot) => {
              setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')));

            // Admin-only or restricted lists
          if (initialUserData.role === 'admin') {
            console.log("User is admin, starting admin listeners");
              unsubscribes.push(onSnapshot(collection(db, 'applications'), (snapshot) => {
                setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorApplication)));
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'applications')));

              unsubscribes.push(onSnapshot(collection(db, 'teacherApplications'), (snapshot) => {
                const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherApplication));
                console.log("AuthContext: teacherApplications updated:", apps);
                setTeacherApplications(apps);
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'teacherApplications')));

              unsubscribes.push(onSnapshot(collection(db, 'subscriptionRequests'), (snapshot) => {
                setSubscriptionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionRequest)));
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'subscriptionRequests')));

              unsubscribes.push(onSnapshot(collection(db, 'training_reports'), (snapshot) => {
                setTrainingReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingReport)));
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'training_reports')));

            unsubscribes.push(onSnapshot(collection(db, 'contests'), (snapshot) => {
              setContests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contest)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'contests')));

            unsubscribes.push(onSnapshot(collection(db, 'contest_participants'), (snapshot) => {
              setContestParticipants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContestParticipant)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'contest_participants')));

            unsubscribes.push(onSnapshot(collection(db, 'logs'), (snapshot) => {
              setLogs(snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                } as Log;
              }));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'logs')));
          } else {
            console.log("User is not admin, starting user listeners");
            // Non-admins see their own applications
            const qApps = query(collection(db, 'applications'), where('userId', '==', firebaseUser.uid));
            unsubscribes.push(onSnapshot(qApps, (snapshot) => {
              setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorApplication)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'applications')));

            const qTeacherApps = query(collection(db, 'teacherApplications'), where('userId', '==', firebaseUser.uid));
            unsubscribes.push(onSnapshot(qTeacherApps, (snapshot) => {
              setTeacherApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherApplication)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'teacherApplications')));
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
          // Don't throw here to allow app to load even if user doc fetch fails
          // handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setUser(null);
        }
      } else {
        console.log("No firebase user");
        setUser(null);
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
      }
      setIsLoading(false);
      console.log("Auth state changed processing complete");
    });

    return () => {
      unsubscribeAuth();
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

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

  const login = async (email?: string, password?: string, asAdmin?: boolean) => {
    const normalizedEmail = email?.toLowerCase().trim();
    
    if (asAdmin || (normalizedEmail === 'admin@campusbf.bf' && password === 'admin')) {
      // For testing purposes, we allow mock admin login
      console.log("Mock login successful for:", normalizedEmail);
      setUser(ADMIN_USER);
      setIsLoading(false);
      return;
    }

    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

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

      const isAdminEmail = (email: string | null | undefined) => {
        if (!email) return false;
        const lowerEmail = email.toLowerCase();
        return lowerEmail === 'urbain.traoreurb@gmail.com' || 
               lowerEmail === 'urbain.traoreurb@gmail' || 
               lowerEmail === 'urbain.traoreurb@gmail.com.';
      };

      const newUser: Partial<User> = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email,
        university: userData.university || '',
        role: isAdminEmail(userData.email) ? 'admin' : (userData.role || 'student'),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.firstName}`,
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
  };

  const deleteInternship = async (id: string) => {
    await internshipService.deleteInternship(id);
  };

  const updateInternship = async (id: string, data: Partial<Internship>) => {
    await internshipService.updateInternship(id, data);
  };

  const addInternship = async (data: Omit<Internship, 'id' | 'createdAt'>) => {
    await internshipService.addInternship(data);
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
    await contentService.deleteContent('events', id);
  };

  const deleteNews = async (id: string) => {
    await contentService.deleteContent('news', id);
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
      updateInternship,
      addInternship,
      applyInternship,
      deleteMarketplaceItem,
      updateMarketplaceItem,
      addMarketplaceItem,
      reviewMarketplaceItem,
      deletePost,
      deleteEvent,
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
