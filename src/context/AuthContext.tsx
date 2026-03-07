import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, TutorApplication } from '@/types';
import { CURRENT_USER, ADMIN_USER, MOCK_APPLICATIONS } from '@/data/mock';

interface AuthContextType {
  user: User | null;
  login: (asAdmin?: boolean) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  submitTutorApplication: (description: string, documentUrl: string) => void;
  reviewApplication: (applicationId: string, status: 'approved' | 'rejected') => void;
  paySubscription: () => void;
  payPostSubscription: () => void;
  payInternshipSubscription: () => void;
  applications: TutorApplication[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<TutorApplication[]>(MOCK_APPLICATIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage or simulate session check
    const storedUser = localStorage.getItem('campusbf_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    const storedApps = localStorage.getItem('campusbf_applications');
    if (storedApps) {
      setApplications(JSON.parse(storedApps));
    }
    setIsLoading(false);
  }, []);

  const login = (asAdmin?: boolean) => {
    // Simulate login
    const userToLogin = asAdmin ? ADMIN_USER : CURRENT_USER;
    setUser(userToLogin);
    localStorage.setItem('campusbf_user', JSON.stringify(userToLogin));
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
    }
  };

  const submitTutorApplication = (description: string, documentUrl: string) => {
    if (!user) return;
    const newApp: TutorApplication = {
      id: `app-${Date.now()}`,
      userId: user.id,
      user: user,
      description,
      documentUrl,
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
    const newApps = applications.map(app => {
      if (app.id === applicationId) {
        // Update user status if it's the current user (simulating backend update)
        if (user && app.userId === user.id) {
          updateUser({ tutorStatus: status });
        }
        return { ...app, status };
      }
      return app;
    });
    setApplications(newApps);
    localStorage.setItem('campusbf_applications', JSON.stringify(newApps));
  };

  const paySubscription = () => {
    if (!user) return;
    
    let expiry = new Date();
    // If subscription is already active and not expired, extend it
    if (user.subscriptionStatus === 'active' && user.subscriptionExpiry) {
      const currentExpiry = new Date(user.subscriptionExpiry);
      if (currentExpiry > new Date()) {
        expiry = currentExpiry;
      }
    }
    
    expiry.setMonth(expiry.getMonth() + 3); // 3 months for a quarter
    updateUser({ 
      subscriptionStatus: 'active', 
      subscriptionExpiry: expiry.toISOString(),
      role: 'tutor' // Upgrade role once paid and approved
    });
  };

  const payPostSubscription = () => {
    if (!user) return;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // 30 days
    updateUser({ 
      postSubscriptionStatus: 'active', 
      postSubscriptionExpiry: expiry.toISOString()
    });
  };

  const payInternshipSubscription = () => {
    if (!user) return;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // 30 days
    updateUser({ 
      internshipSubscriptionStatus: 'active', 
      internshipSubscriptionExpiry: expiry.toISOString()
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser, 
      submitTutorApplication, 
      reviewApplication, 
      paySubscription,
      payPostSubscription,
      payInternshipSubscription,
      applications,
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
