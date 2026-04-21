import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Target, Award, Star, BookOpen, Download, Users, MessageSquare, ShoppingBag, Bike, ClipboardCheck, FileUser, Calendar, Info, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { User } from '@/types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Ranking() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const q = query(
          collection(db, 'profiles'),
          where('role', '==', 'student'),
          orderBy('rankingScore', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const studentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  if (!user) return null;

  const userRank = students.findIndex(s => s.id === user.id) + 1;
  const totalStudents = students.length;
  const percentile = totalStudents > 0 ? Math.round(((totalStudents - userRank + 1) / totalStudents) * 100) : 0;

  const score = user.rankingScore || 0;
  const stats = (user.activityStats || {}) as any;

  const recommendations = [
    {
      condition: (stats.docsViewed || 0) < 5,
      text: "Consultez plus de documents académiques pour enrichir vos connaissances et gagner des points.",
      icon: BookOpen,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      condition: (stats.docsDownloaded || 0) < 3,
      text: "Téléchargez des ressources utiles pour vos révisions hors-ligne.",
      icon: Download,
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      condition: (stats.eventParticipations || 0) < 2,
      text: "Participez aux événements du campus pour élargir votre réseau et votre score.",
      icon: Calendar,
      color: "text-purple-500",
      bg: "bg-purple-50"
    },
    {
      condition: (stats.quizzesCompleted || 0) < 5,
      text: "Entraînez-vous avec les quiz IA pour tester vos connaissances.",
      icon: Trophy,
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    {
      condition: (stats.marketplacePosts || 0) === 0,
      text: "Vous avez des articles à vendre ? Publiez sur la Marketplace !",
      icon: ShoppingBag,
      color: "text-pink-500",
      bg: "bg-pink-50"
    },
    {
      condition: (stats.groupMessages || 0) < 10,
      text: "Engagez-vous davantage dans les groupes communautaires.",
      icon: MessageSquare,
      color: "text-indigo-500",
      bg: "bg-indigo-50"
    },
    {
      condition: (stats.motoRideOffers || 0) === 0 && user.isDriverVerified,
      text: "Proposez des trajets sur MotoRide pour aider vos camarades.",
      icon: Bike,
      color: "text-orange-500",
      bg: "bg-orange-50"
    }
  ].filter(r => r.condition).slice(0, 3);

  const activityGrid = [
    { label: 'Connexions', value: stats.logins || 0, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Docs consultés', value: stats.docsViewed || 0, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Docs téléchargés', value: stats.docsDownloaded || 0, icon: Download, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Événements vus', value: stats.eventsViewed || 0, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Participations', value: stats.eventParticipations || 0, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Concours', value: stats.contestParticipations || 0, icon: Trophy, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Posts Marketplace', value: stats.marketplacePosts || 0, icon: ShoppingBag, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Contacts Vendeurs', value: stats.marketplaceContacts || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Quiz terminés', value: stats.quizzesCompleted || 0, icon: ClipboardCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'CV générés', value: stats.cvGenerated || 0, icon: FileUser, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Offres MotoRide', value: stats.motoRideOffers || 0, icon: Bike, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Contacts MotoRide', value: stats.motoRideContacts || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Messages Groupes', value: stats.groupMessages || 0, icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Mon classement dans CampusBF</h1>
          <p className="text-slate-500 mt-1">Suivez votre activité et comparez-vous à la communauté.</p>
        </div>
        <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-emerald-200 flex items-center gap-3">
          <Trophy size={24} />
          <div>
            <div className="text-[10px] uppercase font-bold opacity-80">Score Total</div>
            <div className="text-xl font-bold">{score} pts</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Rank Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group col-span-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award size={20} className="text-emerald-400" />
              Votre Position
            </h2>
            
            {loading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4">
                 <div className="text-6xl font-bold text-center mb-2">
                    #{userRank}
                 </div>
                 <p className="text-slate-400 font-medium">Sur {totalStudents} étudiants</p>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Niveau de participation</span>
                <span className="text-sm font-bold text-emerald-400">{percentile}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000"
                  style={{ width: `${percentile}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Vous êtes plus actif que {percentile}% des étudiants.
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target size={20} className="text-indigo-500" />
            Recommandations pour progresser
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
            {recommendations.length > 0 ? recommendations.map((rec, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", rec.bg, rec.color)}>
                  <rec.icon size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-slate-700 text-sm font-medium leading-relaxed">{rec.text}</p>
                </div>
                <ArrowUpRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            )) : (
              <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
                  <Award size={32} />
                </div>
                <h3 className="text-lg font-bold text-emerald-900 mb-2">Félicitations !</h3>
                <p className="text-emerald-700 text-sm">Vous êtes un étudiant modèle. Continuez ainsi pour maintenir votre classement.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Activity Stats */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            Détails de mon activité
          </h2>
          <div className="group relative">
            <Info size={18} className="text-slate-400 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[10px] p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Le score est calculé selon un barème précis (ex: Connexion = 1pt, Publication Marketplace = 20pts, Quiz réussi = 15pts).
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {activityGrid.map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", item.bg, item.color)}>
                <item.icon size={20} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{item.value}</div>
              <div className="text-xs text-slate-500 font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard Table Preview */}
      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden pt-6">
        <div className="px-8 mb-6">
          <h2 className="text-xl font-bold text-slate-900">Top Étudiants - Communauté</h2>
          <p className="text-sm text-slate-500">Inspiré par les étudiants les plus actifs.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-y border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rang</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Étudiant</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Université</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.slice(0, 10).map((s, idx) => (
                <tr key={s.id} className={cn(
                  "hover:bg-slate-50 transition-colors",
                  s.id === user.id ? "bg-emerald-50/50" : ""
                )}>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                      idx === 0 ? "bg-amber-100 text-amber-700 shadow-sm" :
                      idx === 1 ? "bg-slate-200 text-slate-700" :
                      idx === 2 ? "bg-orange-100 text-orange-700" : "text-slate-400"
                    )}>
                      #{idx + 1}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <img src={s.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.firstName}`} alt="" className="w-10 h-10 rounded-full bg-slate-100 object-cover" />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {s.firstName} {s.lastName}
                          {s.id === user.id && <span className="ml-2 text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">Vous</span>}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">{s.major}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-medium text-slate-600">{s.university}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-sm font-bold text-emerald-600">{s.rankingScore || 0} pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
