import React from 'react';
// CampusBF - Plateforme pour les étudiants du Burkina Faso
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Tutors from './pages/Tutors';
import Marketplace from './pages/Marketplace';
import Internships from './pages/Internships';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Quizzes from './pages/Quizzes';
import CVGenerator from './pages/CVGenerator';
import Deals from './pages/Deals';
import Colocation from './pages/Colocation';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import MotoRide from './pages/MotoRide';
import Events from './pages/Events';
import Scholarships from './pages/Scholarships';
import Orientation from './pages/Orientation';
import TeachersDirectory from './pages/TeachersDirectory';
import Notifications from './pages/Notifications';
import Portfolio from './pages/Portfolio';
import AlumniMentorship from './pages/AlumniMentorship';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Chatbot from './components/Chatbot';
import AuthModal from './components/AuthModal';
import Features from './pages/Features';
import Messages from './pages/Messages';
import FindClassmates from './pages/FindClassmates';
import Trainings from './pages/Trainings';
import Contests from './pages/Contests';
import PublicServiceContests from './pages/PublicServiceContests';
import UserGuide from './pages/UserGuide';
import EnterprisePortal from './pages/EnterprisePortal';
import UniversityPortal from './pages/UniversityPortal';
import ParentPortal from './pages/ParentPortal';
import CommunityVideos from './pages/CommunityVideos';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force profile completion for students (who are not admins)
  if (user?.role === 'student' && !isAdmin) {
    const isProfileComplete = 
      !!user.firstName && 
      !!user.lastName && 
      !!user.phone &&
      !!user.university && 
      !!user.major && 
      !!user.level;
    
    if (!isProfileComplete && location.pathname !== '/profile') {
      return <Navigate to="/profile" state={{ forceComplete: true }} replace />;
    }
  }

  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Force profile completion ONLY for logged-in students (not guests)
  if (isAuthenticated && user?.role === 'student' && !isAdmin) {
    const isProfileComplete = 
      !!user.firstName && 
      !!user.lastName && 
      !!user.phone &&
      !!user.university && 
      !!user.major && 
      !!user.level;
    
    if (!isProfileComplete && location.pathname !== '/profile') {
      return <Navigate to="/profile" state={{ forceComplete: true }} replace />;
    }
  }

  return <Layout>{children}</Layout>;
}

import { Toaster as SonnerToaster } from 'sonner';
import Rankings from './pages/Ranking';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          
          <Route path="/" element={
            <GuestRoute>
              <Dashboard />
            </GuestRoute>
          } />
          <Route path="/ranking" element={
            <ProtectedRoute>
              <Rankings />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          } />
          <Route path="/tutors" element={
            <GuestRoute>
              <Tutors />
            </GuestRoute>
          } />
          <Route path="/quizzes" element={
            <ProtectedRoute>
              <Quizzes />
            </ProtectedRoute>
          } />
          <Route path="/guide" element={
            <GuestRoute>
              <UserGuide />
            </GuestRoute>
          } />
          <Route path="/cv-generator" element={
            <ProtectedRoute>
              <CVGenerator />
            </ProtectedRoute>
          } />
          <Route path="/deals" element={
            <GuestRoute>
              <Deals />
            </GuestRoute>
          } />
          <Route path="/colocation" element={
            <GuestRoute>
              <Colocation />
            </GuestRoute>
          } />
          <Route path="/marketplace" element={
            <GuestRoute>
              <Marketplace />
            </GuestRoute>
          } />
          <Route path="/internships" element={
            <GuestRoute>
              <Internships />
            </GuestRoute>
          } />
          <Route path="/scholarships" element={
            <ProtectedRoute>
              <Scholarships />
            </ProtectedRoute>
          } />
          <Route path="/community" element={
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          } />
          <Route path="/motoride" element={
            <GuestRoute>
              <MotoRide />
            </GuestRoute>
          } />
          <Route path="/events" element={
            <GuestRoute>
              <Events />
            </GuestRoute>
          } />
          <Route path="/orientation" element={
            <GuestRoute>
              <Orientation />
            </GuestRoute>
          } />
          <Route path="/teachers" element={
            <GuestRoute>
              <TeachersDirectory />
            </GuestRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/features" element={
            <GuestRoute>
              <Features />
            </GuestRoute>
          } />
          
          <Route path="/portfolio" element={
            <ProtectedRoute>
              <Portfolio />
            </ProtectedRoute>
          } />
          <Route path="/mentorship" element={
            <ProtectedRoute>
              <AlumniMentorship />
            </ProtectedRoute>
          } />
          <Route path="/find-classmates" element={
            <ProtectedRoute>
              <FindClassmates />
            </ProtectedRoute>
          } />
          <Route path="/trainings" element={
            <GuestRoute>
              <Trainings />
            </GuestRoute>
          } />
          <Route path="/contests" element={
            <ProtectedRoute>
              <Contests />
            </ProtectedRoute>
          } />
          <Route path="/public-service-contests" element={
            <ProtectedRoute>
              <PublicServiceContests />
            </ProtectedRoute>
          } />
          
          <Route path="/enterprise-portal" element={
            <GuestRoute>
              <EnterprisePortal />
            </GuestRoute>
          } />
          <Route path="/university-portal" element={
            <GuestRoute>
              <UniversityPortal />
            </GuestRoute>
          } />
          <Route path="/parent-portal" element={
            <GuestRoute>
              <ParentPortal />
            </GuestRoute>
          } />
          <Route path="/videos" element={<Navigate to="/videos-communautaires" replace />} />
          <Route path="/shorts" element={<Navigate to="/videos-communautaires" replace />} />
          <Route path="/campus-short" element={<Navigate to="/videos-communautaires" replace />} />
          <Route path="/videos-communautaires" element={
            <GuestRoute>
              <CommunityVideos />
            </GuestRoute>
          } />
        </Routes>
        <Chatbot />
        <AuthModal />
        <SonnerToaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </AuthProvider>
  );
}
