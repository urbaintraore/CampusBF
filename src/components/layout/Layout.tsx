import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, GraduationCap, Briefcase, ShoppingBag, Users, User, Menu, X, Shield, MessageCircle, Bell, Search, LogOut, Bike, Calendar, Compass, Library, Sparkles, Share, CheckCircle2, BookOpen, Trophy, Brain, Tag, Home, School, Building2, Video, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';

import { NotificationsCenter } from '@/components/NotificationsCenter';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAdmin, logout, notifications, markNotificationAsRead, logActivity } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isFinancingExpanded, setIsFinancingExpanded] = useState(location.pathname.startsWith('/financing'));

  React.useEffect(() => {
    if (user && logActivity) {
      const path = location.pathname;
      const matchingItem = allNavItems.find(item => item.to === path);
      const pageName = matchingItem ? matchingItem.label : path;
      
      logActivity({
        action: `Ouverture page: ${pageName}`,
        module: 'Navigation',
        details: `Navigation vers ${path}`,
        severity: 'info'
      }).catch(err => console.error("Error logging navigation:", err));
    }
  }, [location.pathname, user?.id]);

  React.useEffect(() => {
    if (location.pathname.startsWith('/financing')) {
      setIsFinancingExpanded(true);
    }
  }, [location.pathname]);

  const userNotifications = notifications.filter(n => n.userId === user?.id || n.userId === 'all');
  const unreadNotifications = userNotifications.filter(n => !n.read).length;

  const allNavItems = [
    { icon: LayoutDashboard, label: 'Accueil', to: '/' },
    { icon: Sparkles, label: 'Bourses & Opportunités IA', to: '/scholarships', roles: ['student', 'admin', 'teacher', 'alumni', 'parent', 'public'] },
    { icon: GraduationCap, label: '🎓 Financement', to: '/financing', roles: ['student', 'admin', 'teacher', 'alumni', 'parent', 'company', 'institution', 'public'] },
    { icon: Shield, label: 'Administration', to: '/admin', roles: ['admin'] },
    { icon: Briefcase, label: 'Portail Entreprise', to: '/enterprise-portal', roles: ['company', 'institution', 'admin', 'teacher', 'parent'] },
    { icon: Building2, label: 'Portail Université', to: '/university-portal', roles: ['institution', 'company', 'admin', 'teacher', 'student', 'parent'] },
    { icon: User, label: 'Portail Parents', to: '/parent-portal', roles: ['parent', 'admin'] },
    { icon: School, label: 'Classement Universités', to: '/ranking', roles: ['alumni', 'admin'] },
    { icon: Trophy, label: 'Challenge & Concours', to: '/contests', roles: ['student', 'admin', 'alumni'] },
    { icon: Video, label: 'Vidéos Communautaires', to: '/videos-communautaires', roles: ['alumni', 'admin'] },
    { icon: FileText, label: 'Documents', to: '/documents', roles: ['student', 'admin', 'teacher'] },
    { icon: Calendar, label: 'Agenda Étudiant', to: '/agenda', roles: ['student', 'admin', 'teacher', 'alumni', 'public'] },
    { icon: GraduationCap, label: 'Répétiteurs & Prof de maison', to: '/tutors', roles: ['student', 'admin', 'parent', 'public'] },
    { icon: Library, label: 'Portails Enseignants', to: '/teachers', roles: ['admin', 'company', 'institution', 'parent'] },
    { icon: Briefcase, label: 'Stages & Emplois & Bourses', to: '/internships', roles: ['student', 'admin', 'company', 'institution', 'public', 'parent'] },
    { icon: Briefcase, label: 'Missions Freelance', to: '/missions', roles: ['student', 'admin', 'company', 'institution', 'public', 'parent'] },
    { icon: ShoppingBag, label: 'Marketplace', to: '/marketplace', roles: ['student', 'admin', 'alumni', 'company', 'public'] },
    { icon: Users, label: 'Communauté', to: '/community', roles: ['admin', 'alumni', 'student'] },
    { icon: Bike, label: 'MotoRide', to: '/motoride', roles: ['admin', 'alumni'] },
    { icon: Calendar, label: 'Événements', to: '/events', roles: ['student', 'admin', 'alumni', 'parent', 'company', 'institution', 'public', 'teacher'] },
    { icon: Compass, label: 'Orientation', to: '/orientation', roles: ['admin', 'parent'] },
    { icon: Brain, label: 'Révisions & Quiz', to: '/quizzes', roles: ['admin'] },
    { icon: Trophy, label: 'Concours Fonction Publique 🇧🇫', to: '/public-service-contests', roles: ['admin', 'alumni', 'public'] },
    { icon: FileText, label: 'Générateur de CV', to: '/cv-generator', roles: ['admin', 'alumni'] },
    { icon: Tag, label: 'Bons Plans', to: '/deals', roles: ['admin', 'alumni', 'public'] },
    { icon: Home, label: 'Colocation', to: '/colocation', roles: ['admin', 'alumni', 'public'] },
    { icon: User, label: 'Portfolio', roles: ['teacher', 'admin', 'company', 'institution'], to: '/portfolio' },
    { icon: Users, label: 'Mentorat', to: '/mentorship', roles: ['admin', 'alumni', 'teacher', 'parent', 'institution', 'company'] },
    { icon: BookOpen, label: 'Formations', to: '/trainings', roles: ['student', 'admin', 'teacher', 'alumni', 'parent', 'company', 'institution', 'public'] },
    { icon: Sparkles, label: 'Fonctionnalités', to: '/features', roles: ['admin', 'alumni'] },
    { icon: BookOpen, label: 'Guide d\'utilisation', to: '/guide', roles: ['admin', 'teacher', 'alumni', 'parent', 'company', 'institution'] },
  ];

  console.log("Layout Navigation State:", { isAdmin, userRole: user?.role, userId: user?.id });
  
  const navItems = allNavItems.filter(item => {
    // If user is Admin, they see everything they have permission for or portals
    if (isAdmin) {
      if (!item.roles) return true;
      if (item.roles.includes('admin')) return true;
      if (item.to === '/admin' || item.to === '/enterprise-portal' || item.to === '/university-portal' || item.to === '/parent-portal') return true;
    }
    
    // If user is a visitor (guest / non-connected)
    if (!user) {
      // Exclude admin dashboard and partner portals
      if (
        item.to === '/admin' || 
        item.to === '/enterprise-portal' || 
        item.to === '/university-portal' || 
        item.to === '/parent-portal' || 
        item.to === '/teachers' || 
        item.to === '/portfolio'
      ) {
        return false;
      }
      return true;
    }
    
    // If logged in, check normal roles filter
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });
  console.log("Computed NavItems length:", navItems.length);

  const filteredNavItems = navItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAdmin) {
    console.log("Admin detecté - Accès Administration autorisé");
  } else {
    console.log("Admin non detecté - Role:", user?.role, "Email:", user?.email);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-900">
      {/* Admin Banner */}
      {isAdmin && (
        <div className="bg-emerald-600 text-white px-4 py-1.5 text-[10px] md:text-xs font-medium flex items-center justify-between fixed top-0 left-0 right-0 z-[100] shadow-md no-print">
          <div className="flex items-center gap-2">
            <Shield size={12} className="animate-pulse" />
            <span className="font-bold uppercase tracking-wider">Mode Administrateur</span>
            <span className="opacity-40">|</span>
            <span className="hidden sm:inline">URL Actuelle:</span>
            <code className="bg-emerald-700 px-1.5 py-0.5 rounded text-[10px]">{window.location.origin}</code>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden lg:inline opacity-90 italic">Note: Les domaines campusbf.com doivent être configurés dans Cloud Run.</span>
            <a href="https://console.cloud.google.com/run" target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors flex items-center gap-1">
              Console Cloud
            </a>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <header className={cn(
        "md:hidden bg-white/90 backdrop-blur-md border-b border-slate-200/60 p-4 flex items-center justify-between sticky z-50 shadow-sm no-print",
        isAdmin ? "top-[32px]" : "top-0"
      )}>
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/notifications')}
            className="p-2 text-slate-500 relative hover:text-emerald-600 transition-colors"
          >
            <Bell size={24} />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
            )}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={cn(
          "md:hidden fixed inset-0 z-40 bg-white px-4 animate-in slide-in-from-top-10 duration-200 overflow-y-auto pb-10",
          isAdmin ? "pt-[80px]" : "pt-20"
        )}>
          {/* Mobile Search input */}
          <div className="mb-4 mt-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Recherche de pages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {filteredNavItems.map((item) => {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setSearchQuery('');
                  }}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 p-4 rounded-xl transition-all",
                      isActive ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm" : "text-slate-600 hover:bg-slate-50"
                    )
                  }
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              );
            })}

            {filteredNavItems.length === 0 && (
              <div className="px-4 py-8 text-sm text-slate-400 text-center">
                Aucune page trouvée
              </div>
            )}

            {user ? (
              <button 
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }} 
                className="flex items-center gap-3 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-all mt-4 w-full"
              >
                <LogOut size={20} />
                Déconnexion
              </button>
            ) : (
              <div className="flex flex-col gap-2.5 mt-6 pt-6 border-t border-slate-100">
                <NavLink 
                  to="/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-center text-sm"
                >
                  Se connecter
                </NavLink>
                <NavLink 
                  to="/signup" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 p-3.5 border border-slate-200 hover:border-emerald-600 text-slate-700 font-bold rounded-xl transition-all text-center text-sm"
                >
                  S'inscrire (Gratuit)
                </NavLink>
              </div>
            )}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col w-72 bg-white/90 backdrop-blur-xl border-r border-slate-200/60 h-screen sticky z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] no-print",
        isAdmin ? "top-[32px]" : "top-0"
      )}>
        <div className="p-6">
          <Logo size="lg" />
        </div>

        <div className="px-4 mb-6">
           <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Recherche de pages..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-100/50 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-2">Menu Principal</p>
          {filteredNavItems.map((item) => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSearchQuery('')}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-emerald-50/80 text-emerald-700 font-semibold shadow-sm ring-1 ring-emerald-500/10" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )
                }
              >
                <item.icon size={20} className="transition-colors duration-300 z-10" />
                <span className="z-10">{item.label}</span>
              </NavLink>
            );
          })}

          {filteredNavItems.length === 0 && (
            <div className="px-4 py-8 text-sm text-slate-400 text-center">
              Aucune page trouvée
            </div>
          )}
          
          <div className="pt-4 px-4">
            <button 
              onClick={async () => {
                const shareUrl = window.location.origin;
                const shareData = {
                  title: 'CampusBF',
                  text: 'Rejoins-moi sur CampusBF, la plateforme pour les étudiants !',
                  url: shareUrl,
                };
                
                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(shareUrl);
                    setShowShareToast(true);
                    setTimeout(() => setShowShareToast(false), 3000);
                  }
                } catch (err) {
                  if (err instanceof Error && err.name !== 'AbortError') {
                    // Fallback to clipboard if share fails
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setShowShareToast(true);
                      setTimeout(() => setShowShareToast(false), 3000);
                    } catch (clipboardErr) {
                      console.error('Failed to copy:', clipboardErr);
                    }
                  }
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 font-medium text-sm"
            >
              <Share size={18} />
              <span>Inviter des amis</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200/60 bg-slate-50/50">
          {user ? (
            <div className="space-y-2">
              <NavLink to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 transition-all group">
                <div className="relative">
                  <img src={user?.avatarUrl} alt="Profile" className="w-10 h-10 rounded-full bg-slate-200 object-cover ring-2 ring-white shadow-sm" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[11px] text-slate-500 truncate font-medium">{user?.university}</p>
                </div>
              </NavLink>
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group"
              >
                <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                <span className="text-sm font-semibold">Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 p-1.5">
              <NavLink 
                to="/login" 
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/10 active:scale-95 transition-all text-center"
              >
                Se connecter
              </NavLink>
              <NavLink 
                to="/signup" 
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 font-bold text-sm rounded-xl active:scale-95 transition-all text-center"
              >
                Créer un compte
              </NavLink>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto relative bg-[#F8FAFC]",
        isAdmin ? "h-[calc(100vh-64px-32px)] md:h-[calc(100vh-32px)] mt-[32px]" : "h-[calc(100vh-64px)] md:h-screen"
      )}>
        {/* Share Toast */}
        {showShareToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
            <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
              <CheckCircle2 size={20} />
              <span className="font-medium">Lien d'invitation copié !</span>
            </div>
          </div>
        )}

        {user && (
          <div className="hidden md:flex justify-end px-8 py-4 sticky top-0 z-20 bg-[#F8FAFC]/80 backdrop-blur-md border-b border-slate-200/50 no-print">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 bg-white rounded-full border border-slate-200/60 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition-all shadow-sm active:scale-95 hover:shadow-md"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <NotificationsCenter onClose={() => setShowNotifications(false)} />
                </div>
              )}
            </div>
          </div>
        )}

        <div className={cn("max-w-6xl mx-auto p-4 md:p-8", user ? "md:pt-0" : "md:pt-8")}>
          {children}
        </div>
      </main>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/22663375257"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-50 bg-[#128C7E] text-white p-3.5 md:p-4 rounded-full shadow-lg shadow-[#128C7E]/30 hover:bg-[#075E54] hover:scale-110 transition-all duration-300 flex items-center justify-center group no-print"
        title="Contacter l'administrateur"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="fill-current">
          <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.065-.301-.15-1.265-.462-2.406-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.21 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.195-.572-.345z"/>
          <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.48-8.45zM12.046 21.77c-1.775 0-3.516-.476-5.04-1.376l-.36-.214-3.75.975.996-3.645-.235-.373c-.988-1.57-1.508-3.385-1.508-5.245 0-5.445 4.445-9.875 9.9-9.875 2.64 0 5.12 1.025 6.985 2.885 1.865 1.86 2.89 4.335 2.89 6.975-.005 5.44-4.45 9.88-9.878 9.88z"/>
        </svg>
        <span className="absolute left-full ml-4 bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none hidden md:block">
          Contacter l'administrateur
        </span>
      </a>
    </div>
  );
}
