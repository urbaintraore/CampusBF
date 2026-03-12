import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication, SubscriptionRequest, Ad, TeacherApplication, Notification } from '@/types';
import { CURRENT_USER, ADMIN_USER, MOCK_APPLICATIONS, MOCK_USERS, MOCK_ADS, MOCK_NOTIFICATIONS } from '@/data/mock';

interface AuthContextType {
  user: User | null;
  users: User[];
  ads: Ad[];
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
  addNotification: (userId: string, notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'userId'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  addTeacherReview: (teacherId: string, rating: number, comment: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [ads, setAds] = useState<Ad[]>(MOCK_ADS);
  const [applications, setApplications] = useState<TutorApplication[]>(MOCK_APPLICATIONS);
  const [teacherApplications, setTeacherApplications] = useState<TeacherApplication[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage or simulate session check
    const storedUsers = localStorage.getItem('campusbf_users');
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      localStorage.setItem('campusbf_users', JSON.stringify(MOCK_USERS));
    }

    const storedUser = localStorage.getItem('campusbf_user');
    if (storedUser) {
      // Refresh user from the users list to get latest status
      const parsedUser = JSON.parse(storedUser);
      const foundUser = (JSON.parse(storedUsers || '[]') as User[]).find(u => u.id === parsedUser.id);
      if (foundUser) {
        setUser(foundUser);
      } else {
        setUser(parsedUser);
      }
    }

    const storedApps = localStorage.getItem('campusbf_applications');
    if (storedApps) {
      setApplications(JSON.parse(storedApps));
    }
    const storedTeacherApps = localStorage.getItem('campusbf_teacher_applications');
    if (storedTeacherApps) {
      setTeacherApplications(JSON.parse(storedTeacherApps));
    }
    const storedSubs = localStorage.getItem('campusbf_subscriptions');
    if (storedSubs) {
      setSubscriptionRequests(JSON.parse(storedSubs));
    }
    const storedAds = localStorage.getItem('campusbf_ads');
    if (storedAds) {
      setAds(JSON.parse(storedAds));
    } else {
      localStorage.setItem('campusbf_ads', JSON.stringify(MOCK_ADS));
    }
    const storedNotifs = localStorage.getItem('campusbf_notifications');
    if (storedNotifs) {
      setNotifications(JSON.parse(storedNotifs));
    }
    setIsLoading(false);
  }, []);

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('campusbf_users', JSON.stringify(newUsers));
    
    // Also update current user if it exists
    if (user) {
      const updatedCurrentUser = newUsers.find(u => u.id === user.id);
      if (updatedCurrentUser) {
        setUser(updatedCurrentUser);
        localStorage.setItem('campusbf_user', JSON.stringify(updatedCurrentUser));
      }
    }
  };

  const updateAds = (newAds: Ad[]) => {
    setAds(newAds);
    localStorage.setItem('campusbf_ads', JSON.stringify(newAds));
  };

  const addNotification = (userId: string, notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'userId'>) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      ...notification,
      read: false,
      createdAt: new Date().toISOString(),
    };
    const newNotifications = [newNotification, ...notifications];
    setNotifications(newNotifications);
    localStorage.setItem('campusbf_notifications', JSON.stringify(newNotifications));
  };

  const markNotificationAsRead = (notificationId: string) => {
    const newNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(newNotifications);
    localStorage.setItem('campusbf_notifications', JSON.stringify(newNotifications));
  };

  const login = async (email?: string, password?: string, asAdmin?: boolean) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (asAdmin) {
          const targetUser = ADMIN_USER;
          const foundUser = users.find(u => u.id === targetUser.id) || targetUser;
          setUser(foundUser);
          localStorage.setItem('campusbf_user', JSON.stringify(foundUser));
          resolve();
          return;
        }

        if (!email || !password) {
          reject(new Error('Email et mot de passe requis'));
          return;
        }

        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (foundUser) {
          if (foundUser.email.toLowerCase() === 'urbain.traoreurb@gmail.com' && foundUser.role !== 'admin') {
            foundUser.role = 'admin';
            saveUsers(users.map(u => u.id === foundUser.id ? foundUser : u));
          }

          const expectedPassword = foundUser.password || (foundUser.role === 'admin' ? 'admin123' : '123456');
          if (password !== expectedPassword) {
            reject(new Error(foundUser.role === 'admin' ? 'Mot de passe administrateur incorrect' : 'Mot de passe incorrect (utilisez 123456 pour les comptes de test)'));
            return;
          }

          setUser(foundUser);
          localStorage.setItem('campusbf_user', JSON.stringify(foundUser));
          resolve();
        } else {
          reject(new Error('Utilisateur non trouvé ou mot de passe incorrect'));
        }
      }, 1000);
    });
  };

  const signup = async (userData: Partial<User> & { password?: string }) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (!userData.email || !userData.password) {
          reject(new Error('Email et mot de passe requis'));
          return;
        }

        const existingUser = users.find(u => u.email.toLowerCase() === userData.email?.toLowerCase());
        if (existingUser) {
          reject(new Error('Cet email est déjà utilisé'));
          return;
        }

        const newUser: User = {
          id: `u${Date.now()}`,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email,
          password: userData.password,
          university: userData.university || '',
          major: userData.major || '',
          level: userData.level || '',
          role: userData.email.toLowerCase() === 'urbain.traoreurb@gmail.com' ? 'admin' : 'student',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.firstName}`,
          ...userData
        };

        const newUsers = [...users, newUser];
        saveUsers(newUsers);
        setUser(newUser);
        localStorage.setItem('campusbf_user', JSON.stringify(newUser));
        resolve();
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('campusbf_user');
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      localStorage.setItem('campusbf_user', JSON.stringify(newUser));
      
      // Update in users list as well
      const newUsers = users.map(u => u.id === user.id ? newUser : u);
      saveUsers(newUsers);
    }
  };

  const submitTutorApplication = (
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
    const newApp: TutorApplication = {
      id: `app-${Date.now()}`,
      userId: user.id,
      user: user,
      description,
      documentUrl,
      subjects,
      hourlyRates,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const newApps = [...applications, newApp];
    setApplications(newApps);
    localStorage.setItem('campusbf_applications', JSON.stringify(newApps));
    
    // Update user status
    updateUser({ tutorStatus: 'pending' });
  };

  const reviewApplication = (applicationId: string, status: 'approved' | 'rejected') => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;

    const newApps = applications.map(a => 
      a.id === applicationId ? { ...a, status } : a
    );
    setApplications(newApps);
    localStorage.setItem('campusbf_applications', JSON.stringify(newApps));

    // Update the user who made the application
    const newUsers = users.map(u => {
      if (u.id === app.userId) {
        const updatedUser = { ...u, tutorStatus: status };
        if (status === 'approved') {
          updatedUser.tutorSubjects = app.subjects;
          updatedUser.tutorHourlyRates = app.hourlyRates;
          updatedUser.tutorDescription = app.description;
        }
        return updatedUser;
      }
      return u;
    });
    saveUsers(newUsers);
  };

  const submitTeacherApplication = (data: Omit<TeacherApplication, 'id' | 'userId' | 'user' | 'status' | 'createdAt'>) => {
    if (!user) return;
    const newApp: TeacherApplication = {
      id: `tapp-${Date.now()}`,
      userId: user.id,
      user: user,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const newApps = [...teacherApplications, newApp];
    setTeacherApplications(newApps);
    localStorage.setItem('campusbf_teacher_applications', JSON.stringify(newApps));
    
    updateUser({ teacherStatus: 'pending_approval' });

    // Notify Admin
    const adminUser = users.find(u => u.role === 'admin') || ADMIN_USER;
    addNotification(adminUser.id, {
      type: 'message',
      title: 'Nouveau dossier Enseignant',
      message: `${user.firstName} ${user.lastName} a soumis un dossier pour rejoindre l'annuaire des enseignants.`
    });
  };

  const reviewTeacherApplication = (applicationId: string, status: 'approved' | 'rejected') => {
    const app = teacherApplications.find(a => a.id === applicationId);
    if (!app) return;

    const newApps = teacherApplications.map(a => 
      a.id === applicationId ? { ...a, status } : a
    );
    setTeacherApplications(newApps);
    localStorage.setItem('campusbf_teacher_applications', JSON.stringify(newApps));

    const newUsers = users.map(u => {
      if (u.id === app.userId) {
        const updatedUser = { ...u, teacherStatus: status };
        if (status === 'approved') {
          updatedUser.teacherProfile = {
            academicRank: app.academicRank,
            biography: app.biography,
            yearsOfExperience: 0, // Default or could be added to form
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
        return updatedUser;
      }
      return u;
    });
    saveUsers(newUsers);

    // Send notification to the user
    addNotification(app.userId, {
      type: status === 'approved' ? 'success' : 'alert',
      title: status === 'approved' ? 'Dossier Enseignant Accepté' : 'Dossier Enseignant Refusé',
      message: status === 'approved' 
        ? 'Félicitations ! Votre dossier a été validé. Vous apparaissez désormais dans l\'Annuaire des Enseignants.' 
        : 'Malheureusement, votre dossier n\'a pas pu être validé. Veuillez contacter l\'administration pour plus de détails.'
    });
  };

  const submitSubscriptionRequest = (type: 'exam' | 'premium' | 'tutor' | 'marketplace' | 'motoride' | 'event' | 'institution', amount: number) => {
    if (!user) return;
    const newRequest: SubscriptionRequest = {
      id: `sub-${Date.now()}`,
      userId: user.id,
      user: user,
      type,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const newRequests = [...subscriptionRequests, newRequest];
    setSubscriptionRequests(newRequests);
    localStorage.setItem('campusbf_subscriptions', JSON.stringify(newRequests));

    if (type === 'exam') {
      updateUser({ examSubscriptionStatus: 'pending' });
    } else if (type === 'premium') {
      updateUser({ premiumSubscriptionStatus: 'pending' });
    } else if (type === 'tutor') {
      updateUser({ subscriptionStatus: 'pending' });
    } else if (type === 'marketplace') {
      updateUser({ marketplaceSubscriptionStatus: 'pending' });
    } else if (type === 'motoride') {
      updateUser({ motoRideSubscriptionStatus: 'pending' });
    } else if (type === 'event') {
      updateUser({ eventSubscriptionStatus: 'pending' });
    } else if (type === 'institution') {
      updateUser({ 
        institutionProfile: {
          ...user.institutionProfile!,
          subscriptionStatus: 'pending'
        }
      });
    }
  };

  const reviewSubscriptionRequest = (requestId: string, status: 'approved' | 'rejected') => {
    const req = subscriptionRequests.find(r => r.id === requestId);
    if (!req) return;

    const newRequests = subscriptionRequests.map(r => 
      r.id === requestId ? { ...r, status } : r
    );
    setSubscriptionRequests(newRequests);
    localStorage.setItem('campusbf_subscriptions', JSON.stringify(newRequests));

    // Update the user who made the request
    const newUsers = users.map(u => {
      if (u.id === req.userId) {
        const updatedUser = { ...u };
        
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
            expiry.setDate(expiry.getDate() + 30); // 30 days for tutor
            updatedUser.subscriptionStatus = 'active';
            updatedUser.subscriptionExpiry = expiry.toISOString();
            updatedUser.role = 'tutor'; // Promote to tutor role if approved
          } else if (req.type === 'marketplace') {
            expiry.setDate(expiry.getDate() + 30); // 30 days for marketplace
            updatedUser.marketplaceSubscriptionStatus = 'active';
            updatedUser.marketplaceSubscriptionExpiry = expiry.toISOString();
          } else if (req.type === 'motoride') {
            expiry.setDate(expiry.getDate() + 30); // 30 days for motoride
            updatedUser.motoRideSubscriptionStatus = 'active';
            updatedUser.motoRideSubscriptionExpiry = expiry.toISOString();
          } else if (req.type === 'event') {
            expiry.setDate(expiry.getDate() + 30); // 30 days for event
            updatedUser.eventSubscriptionStatus = 'active';
            updatedUser.eventSubscriptionExpiry = expiry.toISOString();
          } else if (req.type === 'institution') {
            expiry.setDate(expiry.getDate() + 365); // 1 year for institution
            updatedUser.institutionProfile = {
              ...updatedUser.institutionProfile!,
              subscriptionStatus: 'active',
              subscriptionExpiry: expiry.toISOString()
            };
          }
        } else {
          if (req.type === 'exam') {
            updatedUser.examSubscriptionStatus = 'none';
          } else if (req.type === 'premium') {
            updatedUser.premiumSubscriptionStatus = 'none';
          } else if (req.type === 'tutor') {
            updatedUser.subscriptionStatus = 'none';
          } else if (req.type === 'marketplace') {
            updatedUser.marketplaceSubscriptionStatus = 'none';
          } else if (req.type === 'motoride') {
            updatedUser.motoRideSubscriptionStatus = 'none';
          } else if (req.type === 'event') {
            updatedUser.eventSubscriptionStatus = 'none';
          } else if (req.type === 'institution') {
            updatedUser.institutionProfile = {
              ...updatedUser.institutionProfile!,
              subscriptionStatus: 'none'
            };
          }
        }
        return updatedUser;
      }
      return u;
    });
    saveUsers(newUsers);
  };

  const updateUserRole = (userId: string, role: User['role']) => {
    const newUsers = users.map(u => u.id === userId ? { ...u, role } : u);
    saveUsers(newUsers);
  };

  const deleteUser = (userId: string) => {
    const newUsers = users.filter(u => u.id !== userId);
    saveUsers(newUsers);
  };

  const addTeacherReview = (teacherId: string, rating: number, comment: string) => {
    if (!user) return;
    const newUsers = users.map(u => {
      if (u.id === teacherId && u.teacherProfile) {
        const newReview = {
          id: `rev-${Date.now()}`,
          authorId: user.id,
          authorName: `${user.firstName} ${user.lastName}`,
          rating,
          comment,
          createdAt: new Date().toISOString()
        };
        return {
          ...u,
          teacherProfile: {
            ...u.teacherProfile,
            reviews: [...(u.teacherProfile.reviews || []), newReview]
          }
        };
      }
      return u;
    });
    saveUsers(newUsers);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users,
      ads,
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
