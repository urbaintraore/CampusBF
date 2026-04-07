import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication, SubscriptionRequest, Ad, TeacherApplication, Notification, Internship, Group, CampusEvent, Report, News, LostAndFound, MarketplaceItem, Post, MotoRide, Log, Training, TrainingEnrollment, TrainingReview, TrainingReport } from '@/types';
import { ADMIN_USER, MOCK_APPLICATIONS, MOCK_USERS, MOCK_ADS, MOCK_NOTIFICATIONS } from '@/data/mock';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
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
  logAction: (action: string, details?: string) => Promise<void>;
  updateAd: (id: string, data: Partial<Ad>) => Promise<void>;
  createAd: (ad: Omit<Ad, 'id'>) => Promise<void>;
  deleteAd: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, data: Partial<any>) => Promise<void>;
  addDocument: (data: any) => Promise<void>;
  deleteInternship: (id: string) => Promise<void>;
  updateInternship: (id: string, data: Partial<Internship>) => Promise<void>;
  deleteMarketplaceItem: (id: string) => Promise<void>;
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
    if (!user) return;
    try {
      await addDoc(collection(db, 'logs'), {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action,
        details: details || '',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging action:", error);
    }
  };

  const createAd = async (adData: Partial<Ad>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'ads'), {
        ...adData,
        userId: user.id,
        createdAt: serverTimestamp(),
        active: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ads');
    }
  };

  const addGroupMember = async (groupId: string, userId: string) => {
    if (!user || user.role !== 'admin') return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(userId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

  const removeGroupMember = async (groupId: string, userId: string) => {
    if (!user || user.role !== 'admin') return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        members: arrayRemove(userId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

  const updateAd = async (id: string, data: Partial<Ad>) => {
    try {
      await updateDoc(doc(db, 'ads', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ads/${id}`);
    }
  };

  const deleteAd = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ads', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ads/${id}`);
    }
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
          try {
            await addDoc(collection(db, 'logs'), {
              userId: initialUserData.id,
              userName: `${initialUserData.firstName} ${initialUserData.lastName}`,
              action: 'Connexion',
              details: 'Session ouverte',
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Failed to log login:", e);
          }

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
              : query(collection(db, 'motoRides'), where('status', '==', 'active'));

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

            // User-specific notifications
            const qNotifs = query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid));
            unsubscribes.push(onSnapshot(qNotifs, (snapshot) => {
              setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')));

            // Admin-only or restricted lists
          if (initialUserData.role === 'admin') {
            console.log("User is admin, starting admin listeners");
            unsubscribes.push(onSnapshot(collection(db, 'users'), (snapshot) => {
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'users')));

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
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('name', '==', 'Communauté'));
      const querySnapshot = await getDocs(q);
      
      let communityGroupId = '';
      if (querySnapshot.empty) {
        // Create the group if it doesn't exist
        const newGroup = await addDoc(groupsRef, {
          name: 'Communauté',
          description: 'Groupe général pour toute la communauté CampusBF',
          category: 'university',
          members: [userId],
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        });
        communityGroupId = newGroup.id;
      } else {
        // Update existing group
        const groupDoc = querySnapshot.docs[0];
        communityGroupId = groupDoc.id;
        const members = groupDoc.data().members || [];
        if (!members.includes(userId)) {
          await updateDoc(doc(db, 'groups', communityGroupId), {
            members: arrayUnion(userId)
          });
        }
      }
    } catch (error) {
      console.error("Error ensuring user in community group:", error);
    }
  };

  const syncCommunityGroup = async () => {
    if (user?.role !== 'admin') return;
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('name', '==', 'Communauté'));
      const querySnapshot = await getDocs(q);
      
      const allUserIds = users.map(u => u.id);
      
      if (querySnapshot.empty) {
        await addDoc(groupsRef, {
          name: 'Communauté',
          description: 'Groupe général pour toute la communauté CampusBF',
          category: 'university',
          members: allUserIds,
          createdAt: new Date().toISOString(),
          createdBy: user.id
        });
      } else {
        const groupDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'groups', groupDoc.id), {
          members: allUserIds
        });
      }
      alert('Tous les utilisateurs ont été intégrés au groupe Communauté.');
    } catch (error) {
      console.error("Error syncing community group:", error);
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

  const signup = async (userData: Partial<User> & { password?: string }) => {
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
      const newApp = {
        userId: user.id,
        user: user,
        description,
        documentUrl,
        subjects,
        hourlyRates,
        status: 'pending',
        appliedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'applications'), newApp);
      await updateUser({ tutorStatus: 'pending' });
      await logAction('Demande Tuteur', `Sujets: ${subjects.join(', ')}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
    }
  };

  const reviewApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      const app = applications.find(a => a.id === applicationId);
      if (!app) return;

      await updateDoc(doc(db, 'applications', applicationId), { status });

      const updatedUserData: Partial<User> = { tutorStatus: status };
      if (status === 'approved') {
        updatedUserData.tutorSubjects = app.subjects;
        updatedUserData.tutorHourlyRates = app.hourlyRates;
        updatedUserData.tutorDescription = app.description;
        // Only change role to tutor if they were a student
        if (app.user.role === 'student') {
          updatedUserData.role = 'tutor';
        }
      }
      
      await updateDoc(doc(db, 'users', app.userId), updatedUserData);
      await logAction('Examen demande tuteur', `ID: ${applicationId}, Statut: ${status}`);

      await addNotification(app.userId, {
        type: status === 'approved' ? 'success' : 'alert',
        title: status === 'approved' ? 'Demande Répétiteur Approuvée' : 'Demande Répétiteur Refusée',
        message: status === 'approved' 
          ? 'Votre demande pour devenir répétiteur a été acceptée.' 
          : 'Votre demande pour devenir répétiteur a été refusée.'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `applications/${applicationId}`);
    }
  };

  const submitTeacherApplication = async (data: Omit<TeacherApplication, 'id' | 'userId' | 'user' | 'status' | 'createdAt'>) => {
    if (!user) {
      console.error("submitTeacherApplication: No user found");
      return;
    }
    console.log("submitTeacherApplication: Starting submission for user", user.id);
    try {
      const newApp = {
        userId: user.id,
        user: user,
        ...data,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      console.log("submitTeacherApplication: Adding doc to teacherApplications");
      await addDoc(collection(db, 'teacherApplications'), newApp);
      console.log("submitTeacherApplication: Updating user teacherStatus to pending_approval");
      await updateUser({ teacherStatus: 'pending_approval' });
      console.log("submitTeacherApplication: Submission successful");
      await logAction('Demande Enseignant', `Rang: ${data.academicRank}`);

      const adminUser = users.find(u => u.role === 'admin') || ADMIN_USER;
      await addNotification(adminUser.id, {
        type: 'message',
        title: 'Nouveau dossier Enseignant',
        message: `${user.firstName} ${user.lastName} a soumis un dossier pour rejoindre l'annuaire des enseignants.`
      });
    } catch (error) {
      console.error("submitTeacherApplication: Error", error);
      handleFirestoreError(error, OperationType.CREATE, 'teacherApplications');
    }
  };

  const reviewTeacherApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    console.log("reviewTeacherApplication: Starting review for", applicationId, "status:", status);
    try {
      const app = teacherApplications.find(a => a.id === applicationId);
      if (!app) {
        console.error("reviewTeacherApplication: Application not found", applicationId);
        return;
      }
      console.log("reviewTeacherApplication: Updating Firestore status");
      await updateDoc(doc(db, 'teacherApplications', applicationId), { status });
      console.log("reviewTeacherApplication: Firestore status updated");

      const updatedUserData: Partial<User> = { teacherStatus: status };
      if (status === 'approved') {
        updatedUserData.teacherProfile = {
          academicRank: app.academicRank,
          biography: app.biography,
          yearsOfExperience: 0,
          languages: ['Français'],
          specialties: app.specialties,
          domains: app.domains,
          publications: [],
          courses: app.courses,
          availability: {
            isAvailable: true,
            willingToTravel: false
          }
        };
      }
      
      await updateDoc(doc(db, 'users', app.userId), updatedUserData);
      await logAction('Examen demande enseignant', `ID: ${applicationId}, Statut: ${status}`);

      await addNotification(app.userId, {
        type: status === 'approved' ? 'success' : 'alert',
        title: status === 'approved' ? 'Dossier Enseignant Accepté' : 'Dossier Enseignant Refusé',
        message: status === 'approved' 
          ? 'Votre dossier enseignant a été validé.' 
          : 'Votre dossier enseignant a été refusé.'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teacherApplications/${applicationId}`);
    }
  };

  const submitSubscriptionRequest = async (type: 'exam' | 'premium' | 'motoride' | 'event' | 'institution', amount: number) => {
    if (!user) return;
    try {
      const newRequest = {
        userId: user.id,
        user: user,
        type,
        amount,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'subscriptionRequests'), newRequest);
      await logAction('Demande Abonnement', `Type: ${type}, Montant: ${amount} FCFA`);

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
      handleFirestoreError(error, OperationType.CREATE, 'subscriptionRequests');
    }
  };

  const reviewSubscriptionRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const req = subscriptionRequests.find(r => r.id === requestId);
      if (!req) return;

      await updateDoc(doc(db, 'subscriptionRequests', requestId), { status });
      await logAction('Examen demande abonnement', `ID: ${requestId}, Statut: ${status}`);

      const targetUser = users.find(u => u.id === req.userId);
      if (!targetUser) return;

      const updatedUser: Partial<User> = {};
      if (status === 'approved') {
        const expiry = new Date();
        if (req.type === 'exam') {
          expiry.setDate(expiry.getDate() + 360);
          updatedUser.examSubscriptionStatus = 'active';
          updatedUser.examSubscriptionExpiry = expiry.toISOString();
        } else if (req.type === 'premium') {
          expiry.setDate(expiry.getDate() + 30);
          updatedUser.premiumSubscriptionStatus = 'active';
          updatedUser.premiumSubscriptionExpiry = expiry.toISOString();
        } else if (req.type === 'motoride') {
          expiry.setDate(expiry.getDate() + 30);
          updatedUser.motoRideSubscriptionStatus = 'active';
          updatedUser.motoRideSubscriptionExpiry = expiry.toISOString();
        } else if (req.type === 'event') {
          expiry.setDate(expiry.getDate() + 30);
          updatedUser.eventSubscriptionStatus = 'active';
          updatedUser.eventSubscriptionExpiry = expiry.toISOString();
        } else if (req.type === 'institution') {
          expiry.setDate(expiry.getDate() + 365);
          updatedUser.institutionProfile = {
            ...targetUser.institutionProfile!,
            subscriptionStatus: 'active',
            subscriptionExpiry: expiry.toISOString()
          };
        }
      } else {
        if (req.type === 'exam') updatedUser.examSubscriptionStatus = 'none';
        else if (req.type === 'premium') updatedUser.premiumSubscriptionStatus = 'none';
        else if (req.type === 'motoride') updatedUser.motoRideSubscriptionStatus = 'none';
        else if (req.type === 'event') updatedUser.eventSubscriptionStatus = 'none';
        else if (req.type === 'institution') {
          updatedUser.institutionProfile = {
            ...targetUser.institutionProfile!,
            subscriptionStatus: 'none'
          };
        }
      }
      
      await updateDoc(doc(db, 'users', req.userId), updatedUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subscriptionRequests/${requestId}`);
    }
  };

  const updateUserRole = async (userId: string, role: User['role']) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const activateUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'active' });
      await logAction('Activation utilisateur', `Utilisateur ID: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'inactive' });
      await logAction('Désactivation utilisateur', `Utilisateur ID: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
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
    
    try {
      console.log("Attempting to delete user:", userId);
      await deleteDoc(doc(db, 'users', userId));
      // Also delete profile
      try {
        await deleteDoc(doc(db, 'profiles', userId));
      } catch (e) {
        console.warn("Failed to delete profile, it might not exist:", e);
      }
      console.log("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'documents', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
    }
  };

  const updateDocument = async (id: string, data: Partial<any>) => {
    try {
      await updateDoc(doc(db, 'documents', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${id}`);
    }
  };

  const addDocument = async (data: any) => {
    try {
      await addDoc(collection(db, 'documents'), {
        ...data,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
    }
  };

  const deleteInternship = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'internships', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `internships/${id}`);
    }
  };

  const updateInternship = async (id: string, data: Partial<Internship>) => {
    try {
      await updateDoc(doc(db, 'internships', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `internships/${id}`);
    }
  };

  const deleteMarketplaceItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'marketplace', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `marketplace/${id}`);
    }
  };

  const reviewMarketplaceItem = async (id: string, status: 'approved' | 'rejected') => {
    if (!user || user.role !== 'admin') return;
    try {
      const itemRef = doc(db, 'marketplace', id);
      await updateDoc(itemRef, { status });
      
      const item = marketplace.find(i => i.id === id);
      if (item && status === 'approved') {
        const sellerRef = doc(db, 'users', item.sellerId);
        const seller = users.find(u => u.id === item.sellerId);
        const currentStats = seller?.marketplaceStats || { published: 0, sold: 0, reports: 0 };
        await updateDoc(sellerRef, {
          'marketplaceStats.published': (currentStats.published || 0) + 1
        });
      }
      
      await logAction('Examen annonce marketplace', `ID: ${id}, Statut: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${id}`);
    }
  };

  const reportMarketplaceItem = async (id: string, reason: string) => {
    if (!user) return;
    try {
      const itemRef = doc(db, 'marketplace', id);
      const item = marketplace.find(i => i.id === id);
      if (!item) return;

      if (item.reports?.includes(user.id)) {
        alert('Vous avez déjà signalé cette annonce.');
        return;
      }

      const newReports = [...(item.reports || []), user.id];
      const newReportCount = (item.reportCount || 0) + 1;
      
      const updateData: any = {
        reports: arrayUnion(user.id),
        reportCount: newReportCount
      };

      // Auto-hide if 3 or more reports
      if (newReportCount >= 3) {
        updateData.status = 'pending'; // Back to pending for admin review
      }

      await updateDoc(itemRef, updateData);

      // Update seller stats
      const sellerRef = doc(db, 'users', item.sellerId);
      const seller = users.find(u => u.id === item.sellerId);
      const currentStats = seller?.marketplaceStats || { published: 0, sold: 0, reports: 0 };
      await updateDoc(sellerRef, {
        'marketplaceStats.reports': (currentStats.reports || 0) + 1
      });

      // Notify admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        type: 'alert',
        title: 'Annonce signalée',
        message: `L'annonce "${item.title}" a été signalée pour: ${reason}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await logAction('Signalement annonce', `Annonce: ${item.title}, Raison: ${reason}`);
      alert('Merci pour votre signalement. Nos administrateurs vont examiner cette annonce.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${id}`);
    }
  };

  const deletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
    }
  };

  const deleteNews = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'news', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `news/${id}`);
    }
  };

  const deleteLostAndFound = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lostAndFound', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lostAndFound/${id}`);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
    }
  };

  const deleteMotoRide = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'motoRides', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `motoRides/${id}`);
    }
  };

  const addReport = async (report: Omit<Report, 'id' | 'createdAt' | 'status'>) => {
    try {
      await addDoc(collection(db, 'reports'), {
        ...report,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const addMotoRide = async (ride: Omit<MotoRide, 'id' | 'createdAt'>) => {
    if (!user) return;
    if (user.motoRideStatus === 'suspended') {
      alert('Votre compte MotoRide est suspendu. Vous ne pouvez pas proposer de trajets.');
      return;
    }
    if (!user.isVerified) {
      alert('Vous devez vérifier votre compte avant de proposer un trajet.');
      return;
    }
    if (!user.isDriverVerified) {
      alert('Vous devez être un conducteur vérifié pour proposer un trajet.');
      return;
    }

    try {
      await addDoc(collection(db, 'motoRides'), {
        ...ride,
        status: 'active',
        passengers: [],
        createdAt: new Date().toISOString()
      });
      await logAction('Nouveau trajet MotoRide', `De ${ride.departure} vers ${ride.destination}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'motoRides');
    }
  };

  const reportRideUser = async (userId: string, rideId: string, reason: string) => {
    if (!user) return;
    try {
      // Add report to user document
      const userRef = doc(db, 'users', userId);
      const reportedUser = users.find(u => u.id === userId);
      const currentReports = (reportedUser?.motoRideStats?.totalReports || 0) + 1;
      
      const updateData: any = {
        'motoRideStats.totalReports': currentReports
      };

      // Auto-suspend if 3 or more reports
      if (currentReports >= 3) {
        updateData.motoRideStatus = 'suspended';
      }

      await updateDoc(userRef, updateData);

      // Add report to ride document if applicable
      if (rideId) {
        const rideRef = doc(db, 'motoRides', rideId);
        await updateDoc(rideRef, {
          reports: arrayUnion({
            reporterId: user.id,
            reason,
            createdAt: new Date().toISOString()
          })
        });
      }

      // Notify admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        type: 'alert',
        title: 'Utilisateur MotoRide signalé',
        message: `L'utilisateur ${reportedUser?.firstName} ${reportedUser?.lastName} a été signalé pour: ${reason}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await logAction('Signalement utilisateur MotoRide', `Utilisateur: ${userId}, Raison: ${reason}`);
      alert('Signalement enregistré. Merci de contribuer à la sécurité de CampusBF.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const reviewRide = async (rideId: string, revieweeId: string, rating: number, comment: string) => {
    if (!user) return;
    try {
      const reviewId = `review_${Date.now()}`;
      await setDoc(doc(db, 'rideReviews', reviewId), {
        id: reviewId,
        rideId,
        reviewerId: user.id,
        revieweeId,
        rating,
        comment,
        createdAt: new Date().toISOString()
      });

      // Update user stats
      const userRef = doc(db, 'users', revieweeId);
      const reviewee = users.find(u => u.id === revieweeId);
      const currentStats = reviewee?.motoRideStats || { ridesCompleted: 0, averageRating: 0, totalReports: 0 };
      
      const newRidesCompleted = (currentStats.ridesCompleted || 0) + 1;
      const newAverageRating = ((currentStats.averageRating || 0) * (currentStats.ridesCompleted || 0) + rating) / newRidesCompleted;

      await updateDoc(userRef, {
        'motoRideStats.ridesCompleted': newRidesCompleted,
        'motoRideStats.averageRating': newAverageRating
      });

      await logAction('Avis MotoRide', `Note: ${rating} pour ${revieweeId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rideReviews');
    }
  };

  const updateRideStatus = async (rideId: string, status: MotoRide['status']) => {
    if (!user) return;
    try {
      const rideRef = doc(db, 'motoRides', rideId);
      await updateDoc(rideRef, { status });
      await logAction('Mise à jour statut trajet', `ID: ${rideId}, Statut: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `motoRides/${rideId}`);
    }
  };

  const verifyDriver = async (userId: string, vehicleDetails: User['vehicleDetails']) => {
    if (!user || user.role !== 'admin') return;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isDriverVerified: true,
        vehicleDetails
      });
      
      await addNotification(userId, {
        type: 'success',
        title: 'Conducteur vérifié',
        message: 'Votre profil de conducteur a été vérifié. Vous pouvez maintenant proposer des trajets sur MotoRide.'
      });

      await logAction('Vérification conducteur', `Utilisateur: ${userId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
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
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        userId,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const addTeacherReview = async (teacherId: string, rating: number, comment: string) => {
    if (!user) return;
    try {
      const reviewData = {
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`,
        rating,
        comment,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'users', teacherId, 'reviews'), reviewData);
      
      // Notification for the teacher
      await addNotification(teacherId, {
        type: 'success',
        title: 'Nouvel avis reçu',
        message: `${user.firstName} ${user.lastName} a laissé un avis sur votre profil.`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${teacherId}/reviews`);
    }
  };

  const addTraining = async (trainingData: Omit<Training, 'id' | 'createdAt' | 'status' | 'participants'>) => {
    if (!user) return;
    if (!user.isVerified) {
      alert("Vous devez vérifier votre compte avant de publier une formation.");
      return;
    }
    try {
      await addDoc(collection(db, 'trainings'), {
        ...trainingData,
        status: 'pending',
        participants: [],
        createdAt: new Date().toISOString()
      });
      await logAction('Publication formation', trainingData.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trainings');
    }
  };

  const enrollInTraining = async (trainingId: string) => {
    if (!user) return;
    try {
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

      await updateDoc(doc(db, 'trainings', trainingId), {
        participants: arrayUnion(user.id)
      });

      await addDoc(collection(db, 'training_enrollments'), {
        trainingId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userAvatar: user.avatarUrl,
        enrolledAt: new Date().toISOString()
      });

      await addNotification(user.id, {
        type: 'success',
        title: 'Inscription réussie',
        message: `Vous êtes inscrit à la formation : ${training.title}`
      });

      await logAction('Inscription formation', training.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainings/${trainingId}`);
    }
  };

  const reviewTraining = async (trainingId: string, rating: number, comment: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'training_reviews'), {
        trainingId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        rating,
        comment,
        createdAt: new Date().toISOString()
      });

      // Update trainer stats
      const training = trainings.find(t => t.id === trainingId);
      if (training) {
        const trainerRef = doc(db, 'users', training.trainerId);
        const trainer = users.find(u => u.id === training.trainerId);
        const currentStats = trainer?.trainingStats || { trainingsOrganized: 0, averageRating: 0 };
        const newRating = ((currentStats.averageRating || 0) * (currentStats.trainingsOrganized || 0) + rating) / (currentStats.trainingsOrganized || 1);
        
        await updateDoc(trainerRef, {
          'trainingStats.averageRating': newRating
        });
      }

      await logAction('Avis formation', `Note: ${rating}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'training_reviews');
    }
  };

  const reportTraining = async (trainingId: string, reason: string, details: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'training_reports'), {
        trainingId,
        reporterId: user.id,
        reason,
        details,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      await logAction('Signalement formation', `ID: ${trainingId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'training_reports');
    }
  };

  const updateTrainingStatus = async (trainingId: string, status: Training['status']) => {
    if (!user || user.role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'trainings', trainingId), { status });
      
      const training = trainings.find(t => t.id === trainingId);
      if (training) {
        if (status === 'approved') {
          const trainerRef = doc(db, 'users', training.trainerId);
          const trainer = users.find(u => u.id === training.trainerId);
          const currentStats = trainer?.trainingStats || { trainingsOrganized: 0, averageRating: 0 };
          await updateDoc(trainerRef, {
            'trainingStats.trainingsOrganized': (currentStats.trainingsOrganized || 0) + 1
          });
        }

        await addNotification(training.trainerId, {
          type: status === 'approved' ? 'success' : 'alert',
          title: status === 'approved' ? 'Formation validée' : 'Formation refusée',
          message: `Votre formation "${training.title}" a été ${status === 'approved' ? 'validée' : 'refusée'} par l'administration.`
        });
      }
      
      await logAction('Statut formation', `ID: ${trainingId}, Statut: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainings/${trainingId}`);
    }
  };

  const deleteTraining = async (trainingId: string) => {
    if (!user) return;
    try {
      const training = trainings.find(t => t.id === trainingId);
      if (!training) return;
      if (user.role !== 'admin' && training.trainerId !== user.id) return;

      await deleteDoc(doc(db, 'trainings', trainingId));
      
      // Notify participants if cancelled
      for (const participantId of training.participants) {
        await addNotification(participantId, {
          type: 'alert',
          title: 'Formation annulée',
          message: `La formation "${training.title}" a été annulée.`
        });
      }

      await logAction('Suppression formation', training.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trainings/${trainingId}`);
    }
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
      deleteMarketplaceItem,
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
      reviewMarketplaceItem,
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
