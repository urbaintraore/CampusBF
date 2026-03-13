import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication, SubscriptionRequest, Ad, TeacherApplication, Notification, Internship, Group, CampusEvent } from '@/types';
import { ADMIN_USER, MOCK_APPLICATIONS, MOCK_USERS, MOCK_ADS, MOCK_NOTIFICATIONS } from '@/data/mock';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
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
  where
} from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  users: User[];
  ads: Ad[];
  documents: any[];
  updateAds: (newAds: Ad[]) => void;
  login: (email?: string, password?: string, asAdmin?: boolean) => Promise<void>;
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
  submitSubscriptionRequest: (type: 'exam' | 'premium' | 'tutor' | 'marketplace' | 'motoride' | 'event' | 'institution', amount: number) => void;
  reviewSubscriptionRequest: (requestId: string, status: 'approved' | 'rejected') => void;
  updateUserRole: (userId: string, role: User['role']) => void;
  deleteUser: (userId: string) => void;
  applications: TutorApplication[];
  teacherApplications: TeacherApplication[];
  subscriptionRequests: SubscriptionRequest[];
  notifications: Notification[];
  internships: Internship[];
  events: CampusEvent[];
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
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [teacherApplications, setTeacherApplications] = useState<TeacherApplication[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const updateAds = (newAds: Ad[]) => {
    setAds(newAds);
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
      // Clear existing listeners when auth state changes
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];

      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            setUser(userData);

            // Start listeners only after we have the user data and role
            
            // Public/Authenticated lists
            unsubscribes.push(onSnapshot(collection(db, 'ads'), (snapshot) => {
              setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'ads')));

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

            // User-specific notifications
            const qNotifs = query(collection(db, 'notifications'), where('userId', '==', firebaseUser.uid));
            unsubscribes.push(onSnapshot(qNotifs, (snapshot) => {
              setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')));

            // Admin-only or restricted lists
            if (userData.role === 'admin') {
              unsubscribes.push(onSnapshot(collection(db, 'users'), (snapshot) => {
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'users')));

              unsubscribes.push(onSnapshot(collection(db, 'applications'), (snapshot) => {
                setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorApplication)));
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'applications')));

              unsubscribes.push(onSnapshot(collection(db, 'teacherApplications'), (snapshot) => {
                setTeacherApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherApplication)));
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'teacherApplications')));

              unsubscribes.push(onSnapshot(collection(db, 'subscriptionRequests'), (snapshot) => {
                setSubscriptionRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionRequest)));
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'subscriptionRequests')));
            } else {
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

          } else {
            setUser(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
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
        setGroups([]);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const login = async (email?: string, password?: string, asAdmin?: boolean) => {
    if (asAdmin) {
      // For testing purposes, we can still allow mock admin login if needed, 
      // but ideally we use real auth.
      setUser(ADMIN_USER);
      return;
    }

    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message || 'Erreur de connexion');
    }
  };

  const signup = async (userData: Partial<User> & { password?: string }) => {
    if (!userData.email || !userData.password) {
      throw new Error('Email et mot de passe requis');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;

      const newUser: Partial<User> = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email,
        university: userData.university || '',
        major: userData.major || '',
        level: userData.level || '',
        role: userData.email.toLowerCase() === 'urbain.traoreurb@gmail.com' ? 'admin' : 'student',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.firstName}`,
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
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
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, updatedUser);
        setUser({ ...user, ...updatedUser });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      }
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
        createdAt: new Date().toISOString(),
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
      }
      
      await updateDoc(doc(db, 'users', app.userId), updatedUserData);

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
    if (!user) return;
    try {
      const newApp = {
        userId: user.id,
        user: user,
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'teacherApplications'), newApp);
      await updateUser({ teacherStatus: 'pending_approval' });

      const adminUser = users.find(u => u.role === 'admin') || ADMIN_USER;
      await addNotification(adminUser.id, {
        type: 'message',
        title: 'Nouveau dossier Enseignant',
        message: `${user.firstName} ${user.lastName} a soumis un dossier pour rejoindre l'annuaire des enseignants.`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'teacherApplications');
    }
  };

  const reviewTeacherApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      const app = teacherApplications.find(a => a.id === applicationId);
      if (!app) return;

      await updateDoc(doc(db, 'teacherApplications', applicationId), { status });

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

  const submitSubscriptionRequest = async (type: 'exam' | 'premium' | 'tutor' | 'marketplace' | 'motoride' | 'event' | 'institution', amount: number) => {
    if (!user) return;
    try {
      const newRequest = {
        userId: user.id,
        user: user,
        type,
        amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'subscriptionRequests'), newRequest);

      const updateData: Partial<User> = {};
      if (type === 'exam') updateData.examSubscriptionStatus = 'pending';
      else if (type === 'premium') updateData.premiumSubscriptionStatus = 'pending';
      else if (type === 'tutor') updateData.subscriptionStatus = 'pending';
      else if (type === 'marketplace') updateData.marketplaceSubscriptionStatus = 'pending';
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
        } else if (req.type === 'marketplace') {
          expiry.setDate(expiry.getDate() + 30);
          updatedUser.marketplaceSubscriptionStatus = 'active';
          updatedUser.marketplaceSubscriptionExpiry = expiry.toISOString();
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
        else if (req.type === 'marketplace') updatedUser.marketplaceSubscriptionStatus = 'none';
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

  const deleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
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
      const teacher = users.find(u => u.id === teacherId);
      if (!teacher || !teacher.teacherProfile) return;

      const newReview = {
        id: `rev-${Date.now()}`,
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`,
        rating,
        comment,
        createdAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'users', teacherId), {
        'teacherProfile.reviews': [...(teacher.teacherProfile.reviews || []), newReview]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${teacherId}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users,
      ads,
      documents,
      updateAds,
      login, 
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
      deleteUser,
      applications,
      teacherApplications,
      subscriptionRequests,
      notifications,
      internships,
      events,
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
