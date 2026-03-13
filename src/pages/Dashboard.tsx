import React, { useState, useEffect } from 'react';
import { Search, Bell, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import TeacherOnboarding from '@/components/TeacherOnboarding';

export default function Dashboard() {
  const { ads, user, notifications, documents, internships, groups, tutors } = useAuth();
  const navigate = useNavigate();
  const activeAds = ads.filter(ad => ad.active);
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bonjour, {user?.firstName} 👋</h1>
          <p className="text-gray-500 mt-1">Voici ce qui se passe sur ton campus aujourd'hui.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/notifications')}
            className="p-2.5 bg-white rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 relative"
          >
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            )}
          </button>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Advertisement Carousel */}
      {activeAds.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gray-100 h-48 md:h-64 group shadow-lg border border-gray-100">
          {activeAds.map((ad, idx) => (
            <div 
              key={ad.id}
              className={cn(
                "absolute inset-0 transition-all duration-1000 ease-in-out",
                idx === currentAd ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
              )}
            >
              <img 
                src={ad.imageUrl} 
                alt={ad.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative h-full flex flex-col justify-center px-6 md:px-16">
                <div className="bg-white/95 backdrop-blur-md p-5 md:p-8 rounded-2xl shadow-2xl border border-white/50 max-w-lg animate-in slide-in-from-left-8 duration-700">
                  <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
                    Annonce Partenaire
                  </span>
                  <h2 className="text-lg md:text-2xl font-bold leading-tight mb-4 text-gray-900">
                    {ad.title}
                  </h2>
                  <a 
                    href={ad.linkUrl}
                    className="inline-block px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold text-sm hover:bg-emerald-700 transition-all hover:shadow-lg active:scale-95"
                  >
                    En savoir plus
                  </a>
                </div>
              </div>
            </div>
          ))}
          
          {/* Carousel Controls */}
          <div className="absolute bottom-6 right-8 flex items-center gap-4">
            <div className="flex gap-2">
              {activeAds.map((_, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setCurrentAd(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentAd ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'}`}
                ></button>
              ))}
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentAd((prev) => (prev - 1 + activeAds.length) % activeAds.length)}
                className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentAd((prev) => (prev + 1) % activeAds.length)}
                className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats / Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Documents', count: documents.length.toString(), color: 'bg-blue-50 text-blue-700' },
          { label: 'Stages & Jobs', count: internships.length.toString(), color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Groupes', count: groups.length.toString(), color: 'bg-purple-50 text-purple-700' },
          { label: 'Tuteurs', count: tutors.length.toString(), color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Favoris', count: '0', color: 'bg-amber-50 text-amber-700' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-2xl ${stat.color} flex flex-col items-center justify-center text-center`}>
            <span className="text-2xl font-bold">{stat.count}</span>
            <span className="text-xs font-medium uppercase tracking-wide opacity-80">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Main Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Recent Docs & Internships */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Documents */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Documents Récents</h2>
              <Link to="/documents" className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-3">
              {documents.slice(0, 3).map((doc) => (
                <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <span className="font-bold text-xs uppercase">{doc.type.slice(0, 3)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                    <p className="text-sm text-gray-500">{doc.subject} • {doc.year}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{doc.university}</span>
                      <span>•</span>
                      <span>{doc.downloads} téléchargements</span>
                    </div>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Aucun document disponible pour le moment.
                </p>
              )}
            </div>
          </section>

          {/* Internships */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Stages & Jobs</h2>
              <Link to="/internships" className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {internships.slice(0, 2).map((job) => (
                <div key={job.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                      {job.type === 'internship' ? 'Stage' : 'Job'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{job.company} • {job.location}</p>
                  <button className="w-full py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                    Postuler
                  </button>
                </div>
              ))}
              {internships.length === 0 && (
                <div className="sm:col-span-2 text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Répétiteurs</h2>
              <Link to="/tutors" className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {tutors.slice(0, 3).map((tutor) => (
                <div key={tutor.id} className="p-4 flex items-center gap-3">
                  <img src={tutor.avatarUrl} alt={tutor.firstName} className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm">{tutor.firstName} {tutor.lastName}</h4>
                    <p className="text-xs text-gray-500 truncate">{tutor.tutorSubjects?.join(', ')}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-emerald-600">5.0 ★</span>
                    <span className="text-[10px] text-gray-400">À partir de {tutor.tutorHourlyRates?.college || 0} F/h</span>
                  </div>
                </div>
              ))}
              {tutors.length === 0 && (
                <p className="text-center py-8 text-gray-500 text-sm">
                  Aucun répétiteur disponible.
                </p>
              )}
            </div>
          </section>

          {/* Marketplace Preview */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Marketplace</h2>
              <Link to="/marketplace" className="text-sm text-emerald-600 font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-3">
              {ads.filter(ad => !ad.active).slice(0, 2).map((item) => (
                <div key={item.id} className="group flex gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">Annonce</p>
                    </div>
                  </div>
                </div>
              ))}
              {ads.length === 0 && (
                <p className="text-center py-8 text-gray-500 text-sm">
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
