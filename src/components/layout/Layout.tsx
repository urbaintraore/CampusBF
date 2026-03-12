import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, GraduationCap, Briefcase, ShoppingBag, Users, User, Menu, X, Shield, MessageCircle, Bell, Search, LogOut, Bike, Calendar, Compass, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout, notifications, markNotificationAsRead } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const userNotifications = notifications.filter(n => n.userId === user?.id || n.userId === 'all');
  const unreadNotifications = userNotifications.filter(n => !n.read).length;

  const navItems = [
    { icon: LayoutDashboard, label: 'Accueil', to: '/' },
    { icon: MessageCircle, label: 'Messages', to: '/messages' },
    { icon: FileText, label: 'Documents', to: '/documents' },
    { icon: GraduationCap, label: 'Répétiteurs', to: '/tutors' },
    { icon: Library, label: 'Enseignants', to: '/teachers' },
    { icon: Briefcase, label: 'Stages', to: '/internships' },
    { icon: ShoppingBag, label: 'Marketplace', to: '/marketplace' },
    { icon: Users, label: 'Communauté', to: '/community' },
    { icon: Bike, label: 'MotoRide', to: '/motoride' },
    { icon: Calendar, label: 'Événements', to: '/events' },
    { icon: Compass, label: 'Orientation', to: '/orientation' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ icon: Shield, label: 'Administration', to: '/admin' });
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-900">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-200">C</div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">CampusBF</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/notifications')}
            className="p-2 text-slate-500 relative"
          >
            <Bell size={24} />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            )}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 px-4 animate-in slide-in-from-top-10 duration-200">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
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
            ))}
            <button onClick={logout} className="flex items-center gap-3 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-all mt-4">
              <LogOut size={20} />
              Déconnexion
            </button>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 h-screen sticky top-0 z-30">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">C</div>
          <span className="font-bold text-2xl text-slate-900 tracking-tight">CampusBF</span>
        </div>

        <div className="px-4 mb-6">
           <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Recherche rapide..." 
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2">Menu</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <item.icon size={20} className={cn("transition-colors", ({ isActive }: { isActive: boolean }) => isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600")} />
              {item.label}
              {item.label === 'Messages' && (
                <span className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">2</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <NavLink to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
            <div className="relative">
              <img src={user?.avatarUrl} alt="Profile" className="w-10 h-10 rounded-full bg-slate-200 object-cover ring-2 ring-white shadow-sm" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.university}</p>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen relative">
        {/* Desktop Header for Notifications */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center md:hidden">
           {/* Mobile header handles this, but we might want a desktop top bar for notifications if not in sidebar */}
        </div>

        <div className="hidden md:flex justify-end px-8 py-4 sticky top-0 z-20 bg-[#F8FAFC]/80 backdrop-blur-sm">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 bg-white rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition-all shadow-sm active:scale-95"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Notifications</h3>
                  <button 
                    onClick={() => {
                      userNotifications.forEach(n => {
                        if (!n.read) markNotificationAsRead(n.id);
                      });
                    }}
                    className="text-xs text-emerald-600 font-medium hover:underline"
                  >
                    Tout marquer comme lu
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {userNotifications.length > 0 ? (
                    userNotifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={cn("p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer", !notif.read && "bg-emerald-50/30")}
                        onClick={() => {
                          if (!notif.read) markNotificationAsRead(notif.id);
                        }}
                      >
                        <div className="flex gap-3">
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-red-500"></div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{notif.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Aucune notification
                    </div>
                  )}
                </div>
                <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                  <button 
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notifications');
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-emerald-600"
                  >
                    Voir tout l'historique
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-4 md:p-8 md:pt-0">
          {children}
        </div>
      </main>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/22663375257"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 bg-[#25D366] text-white p-3.5 md:p-4 rounded-full shadow-lg shadow-[#25D366]/30 hover:bg-[#128C7E] hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        title="Contacter l'administrateur"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="fill-current">
          <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.065-.301-.15-1.265-.462-2.406-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.21 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.195-.572-.345z"/>
          <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.48-8.45zM12.046 21.77c-1.775 0-3.516-.476-5.04-1.376l-.36-.214-3.75.975.996-3.645-.235-.373c-.988-1.57-1.508-3.385-1.508-5.245 0-5.445 4.445-9.875 9.9-9.875 2.64 0 5.12 1.025 6.985 2.885 1.865 1.86 2.89 4.335 2.89 6.975-.005 5.44-4.45 9.88-9.878 9.88z"/>
        </svg>
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none hidden md:block">
          Contacter l'administrateur
        </span>
      </a>
    </div>
  );
}
