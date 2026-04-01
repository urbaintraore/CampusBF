import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication, SubscriptionRequest, Ad, TeacherApplication, Notification, Internship, Group, CampusEvent, Report, News, LostAndFound, MarketplaceItem, Post, MotoRide, Log } from '@/types';
import { ADMIN_USER, MOCK_APPLICATIONS, MOCK_USERS, MOCK_ADS, MOCK_NOTIFICATIONS } from '@/data/mock';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider
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
  logAction: (action: string, details?: string) => Promise<void>;
  updateAd: (id: string, data: Partial<Ad>) => Promise<void>;
  createAd: (ad: Omit<Ad, 'id'>) => Promise<void>;
  deleteAd: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, data: Partial<any>) => Promise<void>;
  addDocument: (data: any) => Promise<void>;
  deleteInternship: (id: string) => Promise<void>;
  deleteMarketplaceItem: (id: string) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
  deleteLostAndFound: (id: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  deleteMotoRide: (id: string) => Promise<void>;
  reserveMotoRide: (rideId: string, clientWhatsapp: string) => Promise<void>;
  addReport: (report: Omit<Report, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  addMotoRide: (ride: Omit<MotoRide, 'id' | 'createdAt'>) => Promise<void>;
  syncCommunityGroup: () => Promise<void>;
  login: (email?: string, password?: string, asAdmin?: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
  submitSubscriptionRequest: (type: 'exam' | 'premium' | 'tutor' | 'motoride' | 'event' | 'institution', amount: number) => void;
  reviewSubscriptionRequest: (requestId: string, status: 'approved' | 'rejected') => void;
  updateUserRole: (userId: string, role: User['role']) => void;
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  adminCreateUser: (userData: Partial<User> & { password?: string }) => Promise<void>;
  deleteUser: (userId: string) => void;
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    // Handle redirect result for Google Login on mobile/Vercel
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const firebaseUser = result.user;
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (!userDoc.exists()) {
            const [firstName, ...lastNameParts] = (firebaseUser.displayName || 'Utilisateur').split(' ');
            const lastName = lastNameParts.join(' ') || 'CampusBF';
            
            const isAdminEmail = (email: string | null | undefined) => {
              if (!email) return false;
              const lowerEmail = email.toLowerCase();
              return lowerEmail === 'urbain.traoreurb@gmail.com' || 
                     lowerEmail === 'urbain.traoreurb@gmail' || 
                     lowerEmail === 'urbain.traoreurb@gmail.com.';
            };

            const newUser: Partial<User> = {
              firstName,
              lastName,
              email: firebaseUser.email || '',
              university: '',
              major: '',
              level: '',
              role: isAdminEmail(firebaseUser.email) ? 'admin' : 'student',
              avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`,
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          }
        }
      } catch (error) {
        console.error("Redirect auth error:", error);
      }
    };
    handleRedirectResult();

    let unsubscribes: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email);
      // Clear existing listeners when auth state changes
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];

      if (firebaseUser) {
        // La vérification stricte de l'email a été retirée pour permettre
        // aux utilisateurs (ex: Yahoo) de se connecter même si l'email de
        // vérification Firebase est bloqué par les filtres anti-spam.
        
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
          
          const isAdminEmail = (email: string | null | undefined) => {
            if (!email) return false;
            const lowerEmail = email.toLowerCase();
            return lowerEmail === 'urbain.traoreurb@gmail.com' || 
                   lowerEmail === 'urbain.traoreurb@gmail' || 
                   lowerEmail === 'urbain.traoreurb@gmail.com.';
          };

          let initialUserData: User;

          if (userDoc.exists()) {
            console.log("User doc exists");
            const data = userDoc.data();
            initialUserData = { id: firebaseUser.uid, ...data } as User;
            
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

            unsubscribes.push(onSnapshot(collection(db, 'marketplace'), (snapshot) => {
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

            unsubscribes.push(onSnapshot(collection(db, 'motoRides'), (snapshot) => {
              setMotoRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MotoRide)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'motoRides')));

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
            const qApps = query(collection(db, 'applications'), where('studentId', '==', firebaseUser.uid));
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
    if (asAdmin || (email === 'admin@campusbf.bf' && password === 'admin')) {
      // For testing purposes, we allow mock admin login
      setUser(ADMIN_USER);
      setIsLoading(false);
      return;
    }

    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    try {
      await auth.authStateReady();
      await signInWithEmailAndPassword(auth, email, password);
      // La vérification stricte de l'email a été retirée ici
    } catch (error: any) {
      throw new Error(error.message || 'Erreur de connexion');
    }
  };

  const loginWithGoogle = async () => {
    await auth.authStateReady();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request' || error.message?.includes('popup')) {
        // Fallback to redirect on mobile/Vercel
        await signInWithRedirect(auth, provider);
      } else {
        throw new Error(error.message || 'Erreur de connexion avec Google');
      }
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
      if (userData.teacherStatus) newUser.teacherStatus = userData.teacherStatus;
      if (userData.institutionProfile) newUser.institutionProfile = userData.institutionProfile;

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
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
        setUser({ ...user, ...updatedUser });
        console.log("updateUser: User updated successfully");
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
        studentId: user.id,
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
        updatedUserData.role = 'tutor';
      }
      
      await updateDoc(doc(db, 'users', app.studentId), updatedUserData);

      await addNotification(app.studentId, {
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

  const submitSubscriptionRequest = async (type: 'exam' | 'premium' | 'tutor' | 'motoride' | 'event' | 'institution', amount: number) => {
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

      const updateData: Partial<User> = {};
      if (type === 'exam') updateData.examSubscriptionStatus = 'pending';
      else if (type === 'premium') updateData.premiumSubscriptionStatus = 'pending';
      else if (type === 'tutor') updateData.subscriptionStatus = 'pending';
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
        } else if (req.type === 'tutor') {
          expiry.setDate(expiry.getDate() + 30);
          updatedUser.subscriptionStatus = 'active';
          updatedUser.subscriptionExpiry = expiry.toISOString();
          updatedUser.role = 'tutor';
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
        else if (req.type === 'tutor') updatedUser.subscriptionStatus = 'none';
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'inactive' });
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
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
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

  const deleteMarketplaceItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'marketplace', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `marketplace/${id}`);
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
    try {
      await addDoc(collection(db, 'motoRides'), {
        ...ride,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'motoRides');
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
      deleteMarketplaceItem,
      deletePost,
      deleteEvent,
      deleteNews,
      deleteLostAndFound,
      deleteReport,
      deleteMotoRide,
      reserveMotoRide,
      syncCommunityGroup,
      addReport,
      addMotoRide,
      login, 
      loginWithGoogle,
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
