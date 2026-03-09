import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication, SubscriptionRequest } from '@/types';
import { CURRENT_USER, ADMIN_USER, MOCK_APPLICATIONS, MOCK_USERS } from '@/data/mock';

interface AuthContextType {
  user: User | null;
  users: User[];
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
  submitSubscriptionRequest: (type: 'exam' | 'premium' | 'tutor' | 'marketplace', amount: number) => void;
  reviewSubscriptionRequest: (requestId: string, status: 'approved' | 'rejected') => void;
  updateUserRole: (userId: string, role: User['role']) => void;
  deleteUser: (userId: string) => void;
  applications: TutorApplication[];
  subscriptionRequests: SubscriptionRequest[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [applications, setApplications] = useState<TutorApplication[]>(MOCK_APPLICATIONS);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
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
    const storedSubs = localStorage.getItem('campusbf_subscriptions');
    if (storedSubs) {
      setSubscriptionRequests(JSON.parse(storedSubs));
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

  const submitSubscriptionRequest = (type: 'exam' | 'premium' | 'tutor' | 'marketplace' | 'motoride' | 'event', amount: number) => {
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      users,
      login, 
      signup,
      logout, 
      updateUser, 
      submitTutorApplication, 
      reviewApplication, 
      submitSubscriptionRequest,
      reviewSubscriptionRequest,
      updateUserRole,
      deleteUser,
      applications,
      subscriptionRequests,
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
