import React, { useState } from 'react';
import { Trophy, Calendar, Users, Award, ChevronRight, Info, CheckCircle2, AlertCircle, Search, Filter, Star, Timer, Target, Gift, Medal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Contest, ContestParticipant } from '@/types';

export default function Contests() {
  const { contests, contestParticipants, user, registerForContest } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'finished'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredContests = contests.filter(c => {
    const isUserAdmin = user?.role === 'admin';
    
    // Admin sees everything except finished/published in 'active' tab, and vice versa
    // Students only see 'active'
    const matchesTab = activeTab === 'active' 
      ? (c.status === 'active' || c.status === 'draft')
      : (c.status === 'finished' || c.status === 'results_published');
    
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return dateB - dateA;
  });

  const getParticipantCount = (contestId: string) => {
    return contestParticipants.filter(p => p.contestId === contestId).length;
  };

  const isUserRegistered = (contestId: string) => {
    return contestParticipants.some(p => p.contestId === contestId && p.userId === user?.id);
  };

  const handleRegister = async (contestId: string) => {
    if (!user) {
      setError('Veuillez vous connecter pour participer au concours.');
      return;
    }
    
    setIsRegistering(true);
    setError(null);
    setSuccess(null);
    try {
      await registerForContest(contestId);
      setSuccess('Inscription réussie ! Bonne chance pour le concours.');
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsRegistering(false);
    }
  };

  const getLeaderboard = (contestId: string) => {
    return contestParticipants
      .filter(p => p.contestId === contestId && p.status === 'validated')
      .sort((a, b) => b.totalScore - a.totalScore);
  };

  const activeCount = contests.filter(c => c.status === 'active' || (user?.role === 'admin' && c.status === 'draft')).length;
  const finishedCount = contests.filter(c => c.status === 'finished' || c.status === 'results_published').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-emerald-200/50">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold mb-6 border border-white/20">
            <Trophy size={18} className="text-emerald-300" />
            <span>Concours CampusBF</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 leading-tight">
            Dépassez vos limites et gagnez des récompenses !
          </h1>
          <p className="text-emerald-50/80 text-lg font-medium leading-relaxed">
            Participez à nos concours thématiques, montrez votre talent et remportez des prix exceptionnels tout en contribuant à la communauté.
          </p>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full translate-y-1/2 translate-x-1/4 blur-3xl"></div>
        <Trophy className="absolute right-12 bottom-12 text-white/10 w-64 h-64 -rotate-12" />
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'active' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Concours Actifs
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px]",
              activeTab === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
            )}>
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'finished' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Concours Passés
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px]",
              activeTab === 'finished' ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
            )}>
              {finishedCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un concours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Contests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContests.length > 0 ? (
          filteredContests.map((contest) => (
            <div
              key={contest.id}
              className="group bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 hover:border-emerald-200 transition-all duration-300 flex flex-col"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={contest.imageUrl || `https://picsum.photos/seed/${contest.id}/800/600`}
                  alt={contest.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute top-4 left-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20",
                    contest.type === 'academic' ? "bg-blue-500/50" :
                    contest.type === 'documents' ? "bg-purple-500/50" :
                    contest.type === 'events' ? "bg-amber-500/50" :
                    contest.type === 'motoride' ? "bg-pink-500/50" :
                    contest.type === 'marketplace' ? "bg-emerald-500/50" : "bg-slate-500/50"
                  )}>
                    {contest.type === 'academic' ? 'Académique' :
                     contest.type === 'documents' ? 'Documents' :
                     contest.type === 'events' ? 'Événements' :
                     contest.type === 'motoride' ? 'MotoRide' :
                     contest.type === 'marketplace' ? 'Marketplace' : 'Ambassadeur'}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-lg line-clamp-1">{contest.title}</h3>
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <p className="text-slate-500 text-sm line-clamp-2 font-medium leading-relaxed">
                  {contest.description}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar size={16} className="text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fin</span>
                      <span className="text-xs font-bold">{new Date(contest.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users size={16} className="text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Participants</span>
                      <span className="text-xs font-bold">{getParticipantCount(contest.id)} / {contest.maxParticipants}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-auto">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                      <Gift size={18} />
                      <span className="text-sm">{contest.reward}</span>
                    </div>
                    {isUserRegistered(contest.id) && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} />
                        Inscrit
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedContest(contest)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                  >
                    Détails & Classement
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <Trophy className="mx-auto text-slate-200 mb-4" size={64} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun concours trouvé</h3>
            <p className="text-slate-500">Revenez plus tard pour découvrir de nouveaux défis !</p>
          </div>
        )}
      </div>

      {/* Contest Details Modal */}
      {selectedContest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="relative h-48 md:h-64 flex-shrink-0">
              <img
                src={selectedContest.imageUrl || `https://picsum.photos/seed/${selectedContest.id}/1200/400`}
                alt={selectedContest.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <button
                onClick={() => {
                  setSelectedContest(null);
                  setError(null);
                  setSuccess(null);
                }}
                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all"
              >
                <ChevronRight className="rotate-90" size={24} />
              </button>
              <div className="absolute bottom-6 left-8 right-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {selectedContest.type}
                  </span>
                  <span className="text-white/80 text-xs font-medium">
                    Du {new Date(selectedContest.startDate).toLocaleDateString()} au {new Date(selectedContest.endDate).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white">{selectedContest.title}</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Info & Conditions */}
                <div className="lg:col-span-2 space-y-8">
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Info size={20} className="text-emerald-500" />
                      À propos du concours
                    </h3>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      {selectedContest.description}
                    </p>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Target size={18} className="text-emerald-500" />
                        Conditions
                      </h3>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          Être inscrit sur CampusBF
                        </li>
                        {selectedContest.conditions.minInvites > 0 && (
                          <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            Inviter au moins {selectedContest.conditions.minInvites} étudiants
                          </li>
                        )}
                        {selectedContest.conditions.requireVerifiedProfile && (
                          <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            Profil vérifié requis
                          </li>
                        )}
                      </ul>
                    </section>

                    <section className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                      <h3 className="text-sm font-bold text-emerald-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Medal size={18} className="text-emerald-600" />
                        Récompense
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm ring-1 ring-emerald-200">
                          <Gift size={24} />
                        </div>
                        <p className="text-lg font-bold text-emerald-700">{selectedContest.reward}</p>
                      </div>
                    </section>
                  </div>

                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Star size={20} className="text-emerald-500" />
                      Critères d'évaluation
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedContest.criteria.map((criterion) => (
                        <div key={criterion.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
                          <span className="text-sm font-bold text-slate-700">{criterion.label}</span>
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg">{criterion.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right Column: Registration & Leaderboard */}
                <div className="space-y-8">
                  {/* Registration Action */}
                  {selectedContest.status === 'active' && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                      {isUserRegistered(selectedContest.id) ? (
                        <div className="text-center space-y-3">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={24} />
                          </div>
                          <p className="text-sm font-bold text-emerald-700">Vous participez à ce concours !</p>
                          <p className="text-xs text-slate-500">Continuez à utiliser la plateforme pour améliorer votre score.</p>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-center">Prêt à relever le défi ?</h3>
                          {selectedContest.conditions.minInvites > 0 && (
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3">
                              <p className="text-xs text-emerald-800 font-medium">
                                Pour participer à ce concours, vous devez inviter au moins {selectedContest.conditions.minInvites} étudiants sur CampusBF.
                              </p>
                              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                                <span>Invitations :</span>
                                <span>{user?.inviteCount || 0} / {selectedContest.conditions.minInvites}</span>
                              </div>
                              <button
                                onClick={() => {
                                  const inviteUrl = `${window.location.origin}/signup?ref=${user?.id}`;
                                  navigator.clipboard.writeText(inviteUrl);
                                  alert('Lien d\'invitation copié !');
                                }}
                                className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                              >
                                Copier mon lien d'invitation
                              </button>
                            </div>
                          )}
                          {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-start gap-2">
                              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          )}
                          {success && (
                            <div className="p-3 bg-emerald-50 text-emerald-600 text-xs rounded-xl flex items-start gap-2">
                              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                              <span>{success}</span>
                            </div>
                          )}
                          <button
                            onClick={() => handleRegister(selectedContest.id)}
                            disabled={isRegistering}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isRegistering ? (
                              <Timer className="animate-spin" size={20} />
                            ) : (
                              <Trophy size={20} />
                            )}
                            Participer au concours
                          </button>
                          <p className="text-[10px] text-slate-400 text-center">
                            En cliquant sur participer, vous acceptez les conditions du concours.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mini Leaderboard */}
                  <section>
                    <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Trophy size={18} className="text-emerald-500" />
                      Classement Actuel
                    </h3>
                    <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 space-y-3">
                      {getLeaderboard(selectedContest.id).length > 0 ? (
                        getLeaderboard(selectedContest.id).slice(0, 5).map((participant, index) => (
                          <div key={participant.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                              index === 0 ? "bg-amber-100 text-amber-700" :
                              index === 1 ? "bg-slate-100 text-slate-700" :
                              index === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"
                            )}>
                              {index + 1}
                            </div>
                            <img src={participant.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{participant.userName}</p>
                            </div>
                            <div className="text-xs font-bold text-emerald-600">{participant.totalScore} pts</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-4">Aucun participant validé pour le moment.</p>
                      )}
                      {getLeaderboard(selectedContest.id).length > 5 && (
                        <button className="w-full py-2 text-[10px] font-bold text-emerald-600 hover:underline">
                          Voir le classement complet
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
