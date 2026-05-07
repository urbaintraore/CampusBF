import React, { useState, useEffect } from 'react';
import { Search, Bell, Filter, ChevronLeft, ChevronRight, FileText, GraduationCap, Users, User, UserPlus, Calendar, MapPin, Sparkles, Brain, Lock, Trophy, School, Compass, Target, CheckCircle2, RotateCw, Briefcase } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import TeacherOnboarding from '@/components/TeacherOnboarding';
import { InviteFriendsModal } from '@/components/InviteFriendsModal';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { User as UserType } from '@/types';

export default function Dashboard() {
  const { 
    user, isAdmin, notifications, events: globalEvents, isDocumentLocked, incrementActivity, logAction 
  } = useAuth();

  const [ads, setAds] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
    const [marketplace, setMarketplace] = useState<any[]>([]);
    const [publicServiceContests, setPublicServiceContests] = useState<any[]>([]);
    const [groupsCount, setGroupsCount] = useState(0);
    const [totalDocumentsCount, setTotalDocumentsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
  
    const navigate = useNavigate();
  
    const loadDashboardData = async (force = false) => {
      const cacheKey = 'dashboard_cache';
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheKey + '_time');
      const now = Date.now();
  
      if (!force && cached && cacheTime && now - parseInt(cacheTime) < 1800000) { // 30 min cache instead of 1 hour
        const data = JSON.parse(cached);
        setAds(data.ads || []);
        setDocuments(data.documents || []);
        setInternships(data.internships || []);
        setTutors(data.tutors || []);
        setTeachers(data.teachers || []);
        setMarketplace(data.marketplace || []);
        setPublicServiceContests(data.publicServiceContests || []);
        setGroupsCount(data.groupsCount || 0);
        setTotalDocumentsCount(data.totalDocumentsCount || 0);
        setLoading(false);
        return;
      }
  
      if (force) setRefreshing(true);
      else setLoading(true);
  
      try {
        // Run fetches in parallel but limited
        const [adsSnap, docsSnap, internSnap, tutorSnap, teacherSnap, contestSnap, marketSnap] = await Promise.all([
          getDocs(query(collection(db, 'ads'), where('active', '==', true), limit(5))),
          getDocs(query(collection(db, 'documents'), orderBy('createdAt', 'desc'), limit(3))),
          getDocs(query(collection(db, 'internships'), limit(3))),
          getDocs(query(collection(db, 'users'), where('tutorStatus', '==', 'approved'), limit(3))),
          getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'), limit(3))),
          getDocs(query(collection(db, 'public_service_contests'), limit(5))),
          getDocs(query(collection(db, 'marketplace'), limit(2)))
        ]);

      const dashboardData = {
        ads: adsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        documents: docsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        internships: internSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        tutors: tutorSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        teachers: teacherSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        marketplace: marketSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        publicServiceContests: contestSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        groupsCount: 15, // Fixed estimation to save quota
        totalDocumentsCount: 480 // Fixed estimation to save quota
      };

      setAds(dashboardData.ads);
      setDocuments(dashboardData.documents);
      setInternships(dashboardData.internships);
      setTutors(dashboardData.tutors);
      setTeachers(dashboardData.teachers);
      setMarketplace(dashboardData.marketplace);
      setPublicServiceContests(dashboardData.publicServiceContests);
      setGroupsCount(dashboardData.groupsCount);
      setTotalDocumentsCount(dashboardData.totalDocumentsCount);

      sessionStorage.setItem(cacheKey, JSON.stringify(dashboardData));
      sessionStorage.setItem(cacheKey + '_time', now.toString());
    } catch (error: any) {
      console.error("Dashboard data load error:", error);
      // Fallback for missing Index
      if (error?.message?.includes('index')) {
        const docsSnap = await getDocs(query(collection(db, 'documents'), limit(3)));
        setDocuments(docsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const activeAds = ads.filter(ad => ad.active);
  const [currentAd, setCurrentAd] = useState(0);
  const [suggestedFriends, setSuggestedFriends] = useState<UserType[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDocForPayment, setSelectedDocForPayment] = useState<any>(null);
  const unreadNotifications = notifications.filter(n => (n.userId === user?.id || n.userId === 'all') && !n.read).length;
  const isPremium = user?.premiumSubscriptionStatus === 'active' || user?.examSubscriptionStatus === 'active' || isAdmin;

  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleDocClick = async (docData: any) => {
    if (!user) {
      setShowInviteModal(true);
      return;
    }

    if (isDownloading) return;

    if (!isAdmin) {
      const lockStatus: any = isDocumentLocked(docData, 'download');
      if (lockStatus && lockStatus.locked) {
        if (docData.isForSale && !isPremium) {
           setSelectedDocForPayment(docData);
           setShowPaymentModal(true);
        } else if (user?.role === 'student' && (user?.referralsCount || 0) < 5 && lockStatus.reason.includes('parrainage')) {
          // Legacy referrals check if we still want it, but the centralized one 
          // usually covers onboarding now.
          setShowInviteModal(true);
        } else {
          toast.error(lockStatus.reason);
        }
        return;
      }
    }

    if (!docData.downloadUrl) {
      toast.error("L'URL du document est introuvable.");
      return;
    }

    setIsDownloading(docData.id);
    try {
      // 1. Update stats in Firebase first
      const dRef = doc(db, 'documents', docData.id);
      const uRef = doc(db, 'users', user.id);

      await Promise.all([
        updateDoc(dRef, { downloads: increment(1) }),
        updateDoc(uRef, {
          lastDownloadAt: new Date().toISOString(),
          'activityStats.docsDownloaded': increment(1),
          lastActiveAt: serverTimestamp()
        })
      ]);

      if (logAction) {
        // @ts-ignore
        logAction('Téléchargement de document (Dashboard)', `Document: ${docData.title}`);
      }

      // 2. Trigger actual file download
      const link = document.createElement('a');
      link.href = docData.downloadUrl.includes('supabase.co') && !docData.downloadUrl.includes('?download=')
        ? docData.downloadUrl + '?download='
        : docData.downloadUrl;
      link.target = '_blank';
      link.download = docData.fileName || docData.title || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Téléchargement lancé");
    } catch (error: any) {
      console.error("[Dashboard] Download error:", error);
      toast.error("Erreur durant le téléchargement");
    } finally {
      setIsDownloading(null);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user || user.role !== 'student') return;
      
      const cacheKey = `suggestions_${user.id}_${user.university}_${user.major}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheKey + '_time');
      const now = Date.now();

      if (cached && cacheTime && now - parseInt(cacheTime) < 3600000) { // 1 hour cache
        setSuggestedFriends(JSON.parse(cached));
        return;
      }
      
      try {
        const profilesRef = collection(db, 'profiles');
        let q;
        
        if (user.university && user.major && user.promotion) {
          q = query(
            profilesRef,
            where('university', '==', user.university),
            where('major', '==', user.major),
            where('promotion', '==', user.promotion),
            limit(10)
          );
        } else if (user.university && user.major) {
          q = query(
            profilesRef,
            where('university', '==', user.university),
            where('major', '==', user.major),
            limit(10)
          );
        } else if (user.university) {
          q = query(
            profilesRef,
            where('university', '==', user.university),
            limit(10)
          );
        } else {
          return;
        }

        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...(doc.data() as any) } as UserType))
          .filter(u => u.id !== user.id)
          .slice(0, 3);
          
        setSuggestedFriends(results);
        sessionStorage.setItem(cacheKey, JSON.stringify(results));
        sessionStorage.setItem(cacheKey + '_time', now.toString());
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };

    fetchSuggestions();
  }, [user]);

  useEffect(() => {
    if (activeAds.length === 0) return;
    const timer = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % activeAds.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeAds.length]);

  const headerSection = (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-display font-bold text-slate-900 tracking-tight">Bonjour, {user?.firstName} 👋</h1>
          <p className="text-slate-500 mt-2 text-sm md:text-base font-medium">
            {user?.role === 'parent' 
              ? "Trouvez les meilleurs accompagnements pour la réussite de vos enfants."
              : "Voici ce qui se passe sur ton campus aujourd'hui."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="p-3 bg-white rounded-full border border-slate-200/60 text-slate-500 hover:bg-slate-50 hover:text-emerald-600 transition-all shadow-sm active:scale-95 text-sm font-medium flex items-center gap-2"
            title="Rafraîchir"
          >
            <RotateCw size={18} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Actualiser</span>
          </button>
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
      {activeAds.length > 0 && user?.role !== 'parent' && (
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-100 h-56 md:h-72 group shadow-lg border border-slate-200/50">
          {activeAds.map((ad, idx) => (
            <div 
              key={ad.id}
              className="absolute inset-0 transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(${(idx - currentAd) * 100}%)` }}
            >
              <img 
                src={ad.imageUrl} 
                alt={ad.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent"></div>
              <div className="relative h-full flex flex-col justify-center px-8 md:px-16">
                <div className="glass p-6 md:p-8 rounded-3xl max-w-lg">
                  <h2 className="text-xl md:text-3xl font-display font-bold leading-tight mb-5 text-white">
                    {ad.title}
                  </h2>
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
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentAd ? 'bg-white w-8' : 'bg-white/30 hover:bg-white/60'}`}
                ></button>
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentAd((prev) => (prev - 1 + activeAds.length) % activeAds.length)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all border border-white/10"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentAd((prev) => (prev + 1) % activeAds.length)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all border border-white/10"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parent Hero Section */}
      {user?.role === 'parent' && (
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl shadow-orange-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center flex-shrink-0 shadow-inner ring-1 ring-white/30">
              <User size={48} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
              <h2 className="text-3xl font-display font-bold">Portail Parents CampusBF</h2>
              <p className="text-orange-50 text-lg leading-relaxed max-w-2xl">
                Trouvez des répétiteurs qualifiés, connectez-vous avec des mentors pour orienter vos enfants et consultez l'annuaire des experts universitaires.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                <button 
                  onClick={() => navigate('/parent-portal')}
                  className="px-8 py-3.5 bg-white text-orange-600 rounded-2xl font-bold hover:bg-orange-50 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                  <Compass size={20} />
                  Accéder au Portail Parents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (user?.role === 'teacher') {
    if (user.teacherStatus === 'pending_dossier') {
      return (
        <div className="space-y-8">
          {headerSection}
          <TeacherOnboarding />
        </div>
      );
    }
    if (user.teacherStatus === 'pending_approval') {
      return (
        <div className="space-y-8">
          {headerSection}
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
        </div>
      );
    }
  }

  return (
    <div className="space-y-8">
      {headerSection}

      {/* Quick Stats / Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {user?.role === 'parent' ? (
          [
            { label: 'Concours FP', count: publicServiceContests?.length.toString() || '0', color: 'bg-amber-100 text-amber-700 ring-amber-200', link: '/public-service-contests' },
            { label: 'Répétiteurs & Prof de maison', count: tutors.length.toString(), color: 'bg-indigo-50/80 text-indigo-700 ring-indigo-100', link: '/tutors' },
            { label: 'Enseignants', count: teachers.length.toString(), color: 'bg-blue-50/80 text-blue-700 ring-blue-100', link: '/teachers' },
            { label: 'Événements', count: events?.length.toString() || '0', color: 'bg-purple-50/80 text-purple-700 ring-purple-100', link: '/events' },
          ].map((stat) => (
            <Link key={stat.label} to={stat.link} className={`p-5 rounded-3xl ${stat.color} flex flex-col items-center justify-center text-center ring-1 shadow-sm hover:shadow-md transition-shadow`}>
              <span className="text-3xl font-display font-bold mb-1">{stat.count}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{stat.label}</span>
            </Link>
          ))
        ) : (
          [
            { label: 'Documents', count: totalDocumentsCount.toString(), color: 'bg-blue-50/80 text-blue-700 ring-blue-100', link: '/documents' },
            { 
              label: 'Concours FP', 
              count: publicServiceContests?.length.toString() || '0', 
              color: 'bg-amber-100 text-amber-700 ring-amber-200', 
              link: '/public-service-contests' 
            },
            {
              label: 'Stages & Emplois', 
              count: internships.length.toString(), 
              color: 'bg-emerald-600 text-white ring-emerald-600', 
              link: '/internships' 
            },
            { 
              label: 'Groupes Communautaires', 
              count: groupsCount.toString(), 
              color: 'bg-purple-600 text-white ring-purple-600', 
              link: '/community' 
            },
            { label: 'Tuteurs', count: tutors.length.toString(), color: 'bg-indigo-50/80 text-indigo-700 ring-indigo-100', link: '/tutors' },
            { label: 'Formations', count: '12', color: 'bg-amber-50/80 text-amber-700 ring-amber-100', link: '/trainings' },
          ].map((stat) => (
            <Link key={stat.label} to={stat.link} className={`p-5 rounded-3xl ${stat.color} flex flex-col items-center justify-center text-center ring-1 shadow-sm hover:shadow-md transition-shadow`}>
              <span className="text-3xl font-display font-bold mb-1">{stat.count}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{stat.label}</span>
            </Link>
          ))
        )}
      </div>

      {/* Quêtes journalières */}
      {user?.dailyQuests?.quests && user.role !== 'parent' && (
        <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200/60 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                 <Target size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-lg md:text-xl text-slate-900">Quêtes Journalières</h3>
                  <p className="text-sm text-slate-500">Gagne des points et débloque des badges</p>
               </div>
             </div>
             <div className="flex items-center gap-2 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
               <Sparkles size={16} />
               <span>Score Global : {user.rankingScore || 0} pts</span>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {user.dailyQuests.quests.map(quest => (
                 <div key={quest.id} className="bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-5 border border-slate-200/60 relative overflow-hidden transition-colors">
                    {quest.completed && (
                       <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-100 p-1 rounded-full shadow-sm">
                          <CheckCircle2 size={16} />
                       </div>
                    )}
                    <h4 className="text-sm font-bold text-slate-800 pr-8">{quest.title}</h4>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 mt-1 mb-4">+{quest.reward} points</p>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Progression</span>
                        <span>{quest.progress} / {quest.target}</span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden shadow-inner">
                         <div 
                           className={`h-full ${quest.completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-amber-500'} transition-all duration-1000 ease-out`} 
                           style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                         />
                      </div>
                    </div>
                 </div>
             ))}
          </div>
          {user.streak && (
             <div className="mt-6 flex items-center justify-center text-sm font-medium text-slate-600 bg-slate-50 py-3 rounded-2xl border border-slate-100">
                Tu es sur une série de <strong className="mx-1 text-orange-600">{user.streak.current}</strong> jours ! 🔥 Record : <strong className="mx-1">{user.streak.longest}</strong> jours
             </div>
          )}
        </div>
      )}

      {/* Espace Enseignant */}
      {user?.role === 'teacher' && user.teacherStatus === 'approved' && (
        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
           <div className="relative z-10">
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
                <GraduationCap className="text-blue-600" size={28} />
                Espace Enseignant
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <Link to="/quizzes" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group/item">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                      <Brain size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">Gérer mes Quiz</h3>
                    <p className="text-[10px] text-slate-500">Créez et gérez vos quiz pour vos étudiants.</p>
                 </Link>
                 <Link to="/public-service-contests" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-amber-50 hover:border-amber-200 transition-all group/item">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                      <Trophy size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">Concours FP</h3>
                    <p className="text-[10px] text-slate-500">Ajouter des questions aux concours publics.</p>
                 </Link>
                 <Link to="/documents" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all group/item">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">Mes Documents</h3>
                    <p className="text-[10px] text-slate-500">Partagez vos supports de cours et TD.</p>
                 </Link>
                 <Link to="/portfolio" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-purple-50 hover:border-purple-200 transition-all group/item">
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform">
                      <User size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">Mon Portfolio</h3>
                    <p className="text-[10px] text-slate-500">Gérez votre profil professionnel.</p>
                 </Link>
              </div>
           </div>
        </section>
      )}

      {/* Find Classmates Call to Action */}
      {(user?.role === 'student' || user?.role === 'teacher') && (
        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Users size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Trouver mes camarades</h2>
                <p className="text-slate-500 mt-1 max-w-md">
                  Découvre les étudiants de ta promotion ({user.promotion || 'Non définie'}) à {user.university} déjà sur CampusBF.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/find-classmates')}
              className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap"
            >
              Voir ma promotion
            </button>
          </div>
        </section>
      )}

      {/* AI Magic Section */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl shadow-purple-200 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:animate-pulse transition-all"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
          <div className="lg:w-2/3 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-xs font-bold uppercase tracking-widest shadow-lg">
              <Sparkles size={14} />
              Nouveau : Magie de l'IA
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold leading-tight">Booste tes études avec l'Assistant Intelligent 🎓</h2>
            <p className="text-purple-50 text-lg leading-relaxed max-w-2xl opacity-90">
              Génère des quiz de révision sur mesure, obtiens des résumés de documents instantanés et pose toutes tes questions académiques à notre IA CampusBF.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => navigate('/quizzes')}
                className="px-8 py-3.5 bg-white text-purple-700 rounded-2xl font-bold hover:bg-purple-50 transition-all shadow-lg flex items-center gap-2 active:scale-95"
              >
                <Brain size={20} />
                Révisions & Quiz
              </button>
              <button 
                onClick={() => {
                  const chatbotTrigger = document.querySelector('.chatbot-trigger') as HTMLButtonElement;
                  if (chatbotTrigger) chatbotTrigger.click();
                }}
                className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95 flex items-center gap-2"
              >
                Parler à l'Assistant
              </button>
            </div>
          </div>
          <div className="lg:w-1/3 flex justify-center">
            <div className="relative">
              <div className="w-48 h-48 bg-white/10 backdrop-blur-2xl rounded-[3rem] border border-white/20 flex items-center justify-center rotate-6 group-hover:rotate-12 transition-transform duration-700 shadow-2xl">
                <Sparkles size={80} className="text-white drop-shadow-lg" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-400/30 backdrop-blur-xl rounded-2xl border border-white/20 -rotate-12 flex items-center justify-center shadow-xl">
                <Brain size={40} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Service Contests Promo */}
      <section className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl shadow-orange-200 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center flex-shrink-0 shadow-lg border border-white/20 group-hover:rotate-6 transition-transform">
              <Trophy size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">Concours de la Fonction Publique 🇧🇫</h2>
              <p className="text-orange-50 mt-2 max-w-md text-lg opacity-90 leading-relaxed">
                Prépare-toi aux concours de l'État avec nos QCM officiels et simulations d'examens.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/public-service-contests')}
            className="px-10 py-4 bg-white text-orange-600 rounded-2xl font-bold hover:bg-orange-50 transition-all shadow-xl shadow-orange-600/20 active:scale-95 whitespace-nowrap text-lg"
          >
            S'entraîner maintenant
          </button>
        </div>
      </section>

      {/* University Ranking Highlight */}
      <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm overflow-hidden relative group">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Trophy size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Classement des Universités</h2>
              <p className="text-slate-500 mt-1 max-w-md">
                Découvrez quelles institutions dominent le classement CampusBF ce mois-ci par leur activité.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/ranking?tab=universities')}
            className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <School size={20} className="text-emerald-400" />
            Voir le classement complet
          </button>
        </div>
      </section>

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
                <div 
                  key={doc.id} 
                  onClick={() => handleDocClick(doc)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex items-start gap-5 group cursor-pointer"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0 ring-1 ring-emerald-200/50 group-hover:scale-105 transition-transform relative">
                    <span className="font-bold text-sm uppercase tracking-wider">{doc.type.slice(0, 3)}</span>
                    {(() => {
                      const lock = isDocumentLocked(doc);
                      const isLocked = lock && (typeof lock === 'object' ? lock.locked : lock);
                      if (!isLocked || isAdmin) return null;
                      return (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                          <Lock size={10} />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <h3 className="font-semibold text-slate-900 truncate text-lg group-hover:text-emerald-700 transition-colors">{doc.title}</h3>
                       {doc.isForSale && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded uppercase">Payant</span>
                       )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1 font-medium">{doc.subject} • {doc.year}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-medium">
                      <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600">{doc.university}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FileText size={12} /> {doc.downloads} téléchargements
                      </span>
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

          {/* Challenges & Concours */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                <h2 className="text-xl font-display font-bold text-slate-900">Challenges & Concours</h2>
              </div>
              <Link to="/public-service-contests" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicServiceContests.slice(0, 4).map((contest) => (
                <div 
                  key={contest.id}
                  onClick={() => navigate('/public-service-contests')}
                  className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-amber-200 transition-all flex items-center gap-4 cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Target size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 text-sm truncate uppercase tracking-tight">{contest.title}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{contest.category} • {contest.questionsCount || 0} questions</p>
                  </div>
                </div>
              ))}
              {publicServiceContests.length === 0 && (
                <div className="md:col-span-2 text-center py-8 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                  <Trophy className="mx-auto text-slate-300 mb-2 opacity-50" size={24} />
                  <p className="text-sm">Bientôt de nouveaux challenges</p>
                </div>
              )}
            </div>
          </section>

          {/* Internships */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Briefcase size={20} className="text-emerald-600" />
                <h2 className="text-xl font-display font-bold text-slate-900">Offres de Stages & Emplois</h2>
              </div>
              <Link to="/internships" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {internships.slice(0, 3).map((job) => (
                <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] uppercase tracking-widest rounded-full font-bold ring-1 ring-slate-200/50">
                      {job.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm line-clamp-2">{job.title}</h3>
                  <p className="text-[12px] text-slate-500 mb-4 font-medium flex-1">{job.company} • {job.location}</p>
                  {job.applicationMethod === 'url' ? (
                    <a 
                      href={job.applicationValue}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-600 hover:text-white transition-all ring-1 ring-emerald-200/50 hover:ring-transparent inline-block text-center"
                    >
                      Consulter
                    </a>
                  ) : (
                    <Link 
                      to="/internships"
                      className="w-full py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-600 hover:text-white transition-all ring-1 ring-emerald-200/50 hover:ring-transparent inline-block text-center"
                    >
                      Postuler
                    </Link>
                  )}
                </div>
              ))}
              {internships.length === 0 && (
                <div className="sm:col-span-3 text-center py-10 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                  Aucune offre disponible.
                </div>
              )}
            </div>
          </section>

          {/* Events */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-purple-600" />
                <h2 className="text-xl font-display font-bold text-slate-900">Prochains Événements</h2>
              </div>
              <Link to="/events" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {globalEvents && globalEvents.length > 0 ? (
                globalEvents.slice(0, 4).map((event) => (
                  <div 
                    key={event.id} 
                    onClick={() => navigate('/events')}
                    className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer overflow-hidden group flex flex-col md:flex-row h-full"
                  >
                    {event.imageUrl && (
                      <div className="md:w-1/3 h-40 md:h-auto overflow-hidden">
                        <img 
                          src={event.imageUrl} 
                          alt={event.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                          event.type === 'conference' ? "bg-blue-50 text-blue-600" :
                          event.type === 'defense' ? "bg-purple-50 text-purple-600" :
                          event.type === 'competition' ? "bg-amber-50 text-amber-600" :
                          event.type === 'cultural' ? "bg-pink-50 text-pink-600" : "bg-slate-50 text-slate-600"
                        )}>
                          {event.type || 'Événement'}
                        </span>
                        {event.date && (
                          <span className="text-[10px] font-bold text-slate-400">
                            {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900 text-base group-hover:text-emerald-700 transition-colors line-clamp-2 flex-1">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-4 text-[11px] text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <MapPin size={12} className="text-slate-400" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                   <Calendar className="mx-auto text-slate-300 mb-2 opacity-50" size={24} />
                   <p className="text-sm text-slate-500">Aucun événement à venir</p>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Tutors & Marketplace */}
        <div className="space-y-8">
          
          {/* Friend Suggestions */}
          {(user?.role === 'student' || user?.role === 'teacher') && suggestedFriends.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-display font-bold text-slate-900">Suggestions d'amis</h2>
                <Link to="/find-classmates" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-100 overflow-hidden">
                {suggestedFriends.map((friend) => (
                  <div key={friend.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                    <img src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.firstName}`} alt={friend.firstName} className="w-12 h-12 rounded-full bg-slate-100 object-cover ring-2 ring-white shadow-sm group-hover:ring-emerald-100 transition-all" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 text-base group-hover:text-emerald-700 transition-colors truncate">{friend.firstName} {friend.lastName}</h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                        {friend.major} {friend.promotion ? `• Promo ${friend.promotion}` : ''}
                      </p>
                    </div>
                    <button 
                      onClick={() => navigate(`/messages?userId=${friend.id}`)}
                      className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-colors"
                      title="Envoyer un message"
                    >
                      <UserPlus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommended Tutors */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold text-slate-900">Répétiteurs & Prof de maison</h2>
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
          {user?.role !== 'parent' && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-display font-bold text-slate-900">Marketplace</h2>
                <Link to="/marketplace" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">Voir tout</Link>
              </div>
              <div className="space-y-4">
                {marketplace.slice(0, 2).map((item) => (
                  <div key={item.id} className="group flex gap-4 bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer">
                    <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                      <img src={item.imageUrls?.[0] || item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
          )}

        </div>
      </div>

      {showInviteModal && <InviteFriendsModal onClose={() => setShowInviteModal(false)} />}
      
      {showPaymentModal && selectedDocForPayment && (
        <ManualPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          type="exam"
          amount={selectedDocForPayment.price || 1000}
          title={selectedDocForPayment.title}
          description={`Accès complet au document : ${selectedDocForPayment.title}. Un abonnement "Examen" ou "Premium" active tous les documents.`}
        />
      )}
    </div>
  );
}
