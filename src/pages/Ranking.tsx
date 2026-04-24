import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Target, Award, Star, BookOpen, Download, Users, MessageSquare, ShoppingBag, Bike, ClipboardCheck, FileUser, Calendar, Info, ArrowUpRight, School, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { User } from '@/types';
import { rankingService, UniversityStat } from '@/services/rankingService';

export default function Ranking() {
  const { user, users } = useAuth();
  const [activeTab, setActiveTab] = useState<'individual' | 'universities'>('individual');
  const [uniRankings, setUniRankings] = useState<UniversityStat[]>([]);
  const [loadingUnis, setLoadingUnis] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'universities' && users.length > 0) {
      const fetchUniRankings = async () => {
        setLoadingUnis(true);
        try {
          const rankings = await rankingService.getUniversityRankings(users);
          setUniRankings(rankings);
        } catch (error) {
          console.error("Error loading uni rankings:", error);
        } finally {
          setLoadingUnis(false);
        }
      };
      fetchUniRankings();
    }
  }, [activeTab, users]);

  // Filter and sort students from the users list in memory
  const students = users
    .filter(u => u.role === 'student')
    .sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));

  if (!user) return null;

  const userRank = students.findIndex(s => s.id === user.id) + 1;
  const totalStudents = students.length;
  const percentile = totalStudents > 0 && userRank > 0 ? Math.round(((totalStudents - userRank + 1) / totalStudents) * 100) : 0;

  const score = user.rankingScore || 0;
  const stats = (user.activityStats || {}) as any;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Classements CampusBF</h1>
          <p className="text-slate-500 mt-1">Découvrez les leaders de la communauté et les universités les plus actives.</p>
        </div>
        <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-emerald-200 flex items-center gap-3">
          <Trophy size={24} />
          <div>
            <div className="text-[10px] uppercase font-bold opacity-80">Votre Score</div>
            <div className="text-xl font-bold">{score} pts</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 w-fit">
        <button
          onClick={() => setActiveTab('individual')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'individual' ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Users size={18} />
          Mon Classement
        </button>
        <button
          onClick={() => setActiveTab('universities')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === 'universities' ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <School size={18} />
          Classement des Universités
        </button>
      </div>

      {activeTab === 'individual' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User Rank Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group col-span-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Award size={20} className="text-emerald-400" />
                  Votre Position
                </h2>
                
                <div className="flex flex-col items-center py-4">
                   <div className="text-6xl font-bold text-center mb-2">
                      #{userRank || '?'}
                   </div>
                   <p className="text-slate-400 font-medium">Sur {totalStudents} étudiants</p>
                </div>

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

            {/* Stats Summary */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Docs vus', value: stats.docsViewed || 0, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Quiz finis', value: stats.quizzesCompleted || 0, icon: ClipboardCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Invites', value: stats.invitations || 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Score Document', value: (user.contributionCount || 0) * 50, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Concours', value: stats.contestParticipations || 0, icon: Trophy, color: 'text-rose-600', bg: 'bg-rose-50' },
                { label: 'Messages', value: stats.groupMessages || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", item.bg, item.color)}>
                    <item.icon size={20} />
                  </div>
                  <div className="text-xl font-bold text-slate-900">{item.value}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider transition-colors">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Leaderboard Table */}
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Top 10 Étudiants</h2>
                <p className="text-sm text-slate-500">Les contributeurs les plus dynamiques du mois.</p>
              </div>
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
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
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm",
                          idx === 0 ? "bg-amber-100 text-amber-700" :
                          idx === 1 ? "bg-slate-200 text-slate-700" :
                          idx === 2 ? "bg-orange-100 text-orange-700" : "bg-white border border-slate-100 text-slate-400"
                        )}>
                          #{idx + 1}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <img src={s.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.firstName}`} alt="" className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200" />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {s.firstName} {s.lastName}
                              {s.id === user.id && <span className="ml-2 text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">Vous</span>}
                            </div>
                            <div className="text-xs text-slate-500">{s.major}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-slate-600">{s.university}</td>
                      <td className="px-8 py-5 text-right font-bold text-emerald-600 text-sm">{s.rankingScore || 0} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        /* University Rankings Tab */
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Target size={24} className="text-indigo-300" />
                Défiez les autres campus
              </h2>
              <p className="text-indigo-100 text-sm max-w-lg leading-relaxed">
                Le score de votre université est calculé basé sur le nombre d'étudiants inscrits, les documents partagés et l'activité globale de votre communauté.
              </p>
            </div>
            <div className="relative z-10 shrink-0">
               <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center">
                  <div className="text-4xl font-bold mb-1">{uniRankings.length}</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">Universités en lice</div>
               </div>
            </div>
          </div>

          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            {loadingUnis ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                 <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                 <p className="text-slate-500 font-medium">Calcul du classement des campus...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rang</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Université</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Étudiants</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ressources</th>
                      <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Score Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {uniRankings.map((uni, idx) => (
                      <tr key={uni.university} className={cn(
                        "hover:bg-indigo-50/30 transition-colors",
                        uni.university === user.university ? "bg-indigo-50/50" : ""
                      )}>
                        <td className="px-8 py-6">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm",
                             idx === 0 ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200" :
                             idx === 1 ? "bg-slate-200 text-slate-700" :
                             idx === 2 ? "bg-orange-100 text-orange-700" : "bg-white border border-slate-100 text-slate-400"
                           )}>
                             {idx === 0 && <Star size={14} className="mr-1 fill-amber-700" />}
                             #{idx + 1}
                           </div>
                        </td>
                        <td className="px-8 py-6 font-display font-bold text-slate-900 group">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                <School size={20} />
                             </div>
                             <div>
                                <span>{uni.university}</span>
                                {uni.university === user.university && (
                                  <span className="block text-[9px] text-emerald-600 mt-0.5 uppercase tracking-wider font-bold">Votre Campus</span>
                                )}
                             </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-slate-700">{uni.studentCount}</span>
                            <span className="text-[10px] text-slate-400">Inscrits</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-blue-600">{uni.documentCount}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">Docs</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className="text-lg font-bold text-indigo-600">{uni.totalScore.toLocaleString()} <span className="text-xs opacity-60">pts</span></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Info Card */}
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex items-start gap-4">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                <Info size={20} />
             </div>
             <div>
                <h4 className="font-bold text-slate-900 mb-1">Comment mon université peut-elle monter ?</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                   Le classement dépend de la participation collective. Invitez vos camarades (+10 pts par inscription), partagez des documents académiques (+50 pts par document) et participez aux activités de la plateforme. Chaque action compte pour le prestige de votre institution !
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
