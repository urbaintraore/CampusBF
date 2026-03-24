import React, { useState, useEffect } from 'react';
import { Search, Bell, Filter, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import TeacherOnboarding from '@/components/TeacherOnboarding';

export default function Dashboard() {
  const auth = useAuth();
  console.log("Dashboard useAuth:", auth);
  const { ads, user, notifications, documents, internships, groups, users, marketplace } = auth;
  const tutors = users.filter(u => u.role === 'tutor');
  const navigate = useNavigate();
  const activeAds = ads.filter(ad => ad.active);
  console.log("Dashboard activeAds length:", activeAds.length);
  const [currentAd, setCurrentAd] = useState(0);

  const unreadNotifications = notifications.filter(n => (n.userId === user?.id || n.userId === 'all') && !n.read).length;

  useEffect(() => {
    if (activeAds.length === 0) return;
    const timer = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % activeAds.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeAds.length]);

  if (user?.role === 'teacher') {
    if (user.teacherStatus === 'pending_dossier') {
      return <TeacherOnboarding />;
    }
    if (user.teacherStatus === 'pending_approval') {
      return (
        <div className="max-w-2xl mx-auto py-20 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Dossier en cours d'examen</h2>
          <p className="text-gray-500 text-lg">
            Votre dossier académique a été soumis avec succès et est actuellement en cours de validation par l'administration. 
            Vous recevrez une réponse dans un délai maximum de 72h. Dès que votre profil sera approuvé, il sera publié dans l'Annuaire des Enseignants.
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-slate-900 tracking-tight">Bonjour, {user?.firstName} 👋</h1>
          <p className="text-slate-500 mt-2 text-sm md:text-base font-medium">Voici ce qui se passe sur ton campus aujourd'hui.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/notifications')}
            className="p-3 bg-white rounded-full border border-slate-200/60 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition-all shadow-sm active:scale-95 md:hidden"
          >
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
            )}
          </button>
          <div className="relative hidden md:block group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher sur le campus..." 
              className="pl-11 pr-4 py-3 bg-white border border-slate-200/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-72 shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Advertisement Carousel */}
      {activeAds.length > 0 && (
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-100 h-56 md:h-72 shadow-lg border border-slate-200/50">
          <div className="absolute inset-0">
            <img 
              src={activeAds[0].imageUrl} 
              alt={activeAds[0].title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent"></div>
            <div className="relative h-full flex flex-col justify-center px-8 md:px-16">
              <div className="glass p-6 md:p-8 rounded-3xl max-w-lg">
                <h2 className="text-xl md:text-3xl font-display font-bold leading-tight mb-5 text-white">
                  {activeAds[0].title}
                </h2>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats / Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Documents', count: documents.length.toString(), color: 'bg-blue-50/80 text-blue-700 ring-blue-100' },
          { label: 'Stages & Jobs', count: internships.length.toString(), color: 'bg-emerald-50/80 text-emerald-700 ring-emerald-100' },
          { label: 'Groupes', count: groups.length.toString(), color: 'bg-purple-50/80 text-purple-700 ring-purple-100' },
          { label: 'Tuteurs', count: tutors.length.toString(), color: 'bg-indigo-50/80 text-indigo-700 ring-indigo-100' },
          { label: 'Favoris', count: '0', color: 'bg-amber-50/80 text-amber-700 ring-amber-100' },
        ].map((stat) => (
          <div key={stat.label} className={`p-5 rounded-3xl ${stat.color} flex flex-col items-center justify-center text-center ring-1 shadow-sm hover:shadow-md transition-shadow`}>
            <span className="text-3xl font-display font-bold mb-1">{stat.count}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Main Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Recent Docs & Internships */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Documents */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold text-slate-900">Documents Récents</h2>
              <Link to="/documents" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
            </div>
            <div className="space-y-4">
              {documents.slice(0, 3).map((doc) => (
                <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex items-start gap-5 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0 ring-1 ring-emerald-200/50 group-hover:scale-105 transition-transform">
                    <span className="font-bold text-sm uppercase tracking-wider">{doc.type.slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate text-lg group-hover:text-emerald-700 transition-colors">{doc.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 font-medium">{doc.subject} • {doc.year}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-medium">
                      <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600">{doc.university}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><FileText size={12} /> {doc.downloads} téléchargements</span>
                    </div>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-center py-10 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                  Aucun document disponible pour le moment.
                </p>
              )}
            </div>
          </section>

          {/* Internships */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold text-slate-900">Stages & Jobs</h2>
              <Link to="/internships" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {internships.slice(0, 2).map((job) => (
                <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] uppercase tracking-widest rounded-full font-bold ring-1 ring-slate-200/50">
                      {job.type === 'internship' ? 'Stage' : 'Job'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 text-lg line-clamp-2">{job.title}</h3>
                  <p className="text-sm text-slate-500 mb-6 font-medium flex-1">{job.company} • {job.location}</p>
                  <button className="w-full py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-600 hover:text-white transition-all ring-1 ring-emerald-200/50 hover:ring-transparent">
                    Postuler
                  </button>
                </div>
              ))}
              {internships.length === 0 && (
                <div className="sm:col-span-2 text-center py-10 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                  Aucune offre de stage disponible.
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Tutors & Marketplace */}
        <div className="space-y-8">
          
          {/* Recommended Tutors */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold text-slate-900">Répétiteurs</h2>
              <Link to="/tutors" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {tutors.slice(0, 3).map((tutor) => (
                <div key={tutor.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <img src={tutor.avatarUrl} alt={tutor.firstName} className="w-12 h-12 rounded-full bg-slate-100 object-cover ring-2 ring-white shadow-sm group-hover:ring-emerald-100 transition-all" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">{tutor.firstName} {tutor.lastName}</h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">{tutor.tutorSubjects?.join(', ')}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-amber-500">5.0 ★</span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Dès {tutor.tutorHourlyRates?.college || 0}F</span>
                  </div>
                </div>
              ))}
              {tutors.length === 0 && (
                <p className="text-center py-10 text-slate-500 text-sm">
                  Aucun répétiteur disponible.
                </p>
              )}
            </div>
          </section>

          {/* Marketplace Preview */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold text-slate-900">Marketplace</h2>
              <Link to="/marketplace" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
            </div>
            <div className="space-y-4">
              {marketplace.slice(0, 2).map((item) => (
                <div key={item.id} className="group flex gap-4 bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer">
                  <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-2 pr-2">
                    <h4 className="font-semibold text-slate-900 text-base line-clamp-2 group-hover:text-emerald-700 transition-colors">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-2 font-medium uppercase tracking-wider">{item.category}</p>
                  </div>
                </div>
              ))}
              {marketplace.length === 0 && (
                <p className="text-center py-10 text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-slate-300">
                  Aucun article en vente.
                </p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
