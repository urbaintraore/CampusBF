import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  Filter, 
  Search, 
  Award, 
  Play, 
  ShieldCheck, 
  Zap,
  ChevronRight,
  TrendingUp,
  History,
  Lock,
  Star,
  CheckCircle2,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { publicServiceExamService } from '@/services/publicServiceExamService';
import { PublicServiceContest, PublicServiceCategory, PublicServiceLevel } from '@/types';
import PublicServiceExamPlayer from '@/components/PublicServiceExamPlayer';
import { toast } from 'sonner';

import { useCachedQuery } from '@/hooks/useCachedQuery';
import { doc, getDoc, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const categoryColors: Record<string, string> = {
  culture_generale: 'from-blue-500 to-indigo-600',
  maths: 'from-emerald-500 to-teal-600',
  droit: 'from-rose-500 to-red-600',
  economie: 'from-amber-500 to-orange-600',
  svt: 'from-green-500 to-lime-600',
  physique: 'from-purple-500 to-violet-600',
  chimie: 'from-indigo-500 to-blue-600',
  dissertation_redaction: 'from-cyan-500 to-blue-600',
  tests_psychotechniques: 'from-fuchsia-500 to-pink-600',
  cas_pratique: 'from-stone-500 to-gray-700',
  actualite_retrospective: 'from-sky-500 to-cyan-600',
  societes_evenements: 'from-teal-500 to-emerald-600',
  institutions_nationales_internationales: 'from-amber-500 to-orange-600',
  culture_litterature_internationales: 'from-blue-500 to-indigo-600',
  culture_litteraire_artistique: 'from-violet-500 to-purple-600',
  histoire: 'from-orange-500 to-red-600',
  geographie: 'from-emerald-500 to-green-600',
  philosophie: 'from-lime-500 to-green-600',
  psychologie: 'from-rose-500 to-pink-600',
  sociologie: 'from-yellow-500 to-amber-600',
  francais: 'from-indigo-500 to-blue-600',
  sciences_technologie: 'from-cyan-500 to-blue-600',
  connaissances_burkina: 'from-red-500 to-yellow-600',
  test_niveau: 'from-emerald-500 to-teal-600',
};

const categoryLabels: Record<string, string> = {
  culture_generale: 'Culture Générale',
  maths: 'Mathématiques',
  droit: 'Droit & Administration',
  economie: 'Économie & Finances',
  svt: 'SVT / Santé',
  physique: 'Physique',
  chimie: 'Chimie',
  dissertation_redaction: 'Dissertation / Rédaction',
  tests_psychotechniques: 'Tests Psychotechniques',
  cas_pratique: 'Cas pratique',
  actualite_retrospective: 'Actualité et rétrospective',
  societes_evenements: 'Sociétés-Evènements',
  institutions_nationales_internationales: 'Institutions nationales et internationales',
  culture_litterature_internationales: 'Culture littérature et int.',
  culture_litteraire_artistique: 'Culture littéraire et artistique',
  histoire: 'Histoire',
  geographie: 'Géographie',
  philosophie: 'Philosophie',
  psychologie: 'Psychologie',
  sociologie: 'Sociologie',
  francais: 'Français',
  sciences_technologie: 'Sciences et technologie',
  connaissances_burkina: 'Connaissances sur le Burkina',
  test_niveau: 'Test de Niveau'
};

export default function PublicServiceContests() {
  const { user, addPublicServiceContest } = useAuth();
  
  // Use cached and paginated query instead of global state
  const { data: globalContests, loading: dataLoading, loadMore, hasMore, invalidateCache } = useCachedQuery(
    'public_service_contests',
    [], // You can add orderBy('createdAt', 'desc') if such a field exists
    'public_service_contests_cache',
    20
  );

  const [contests, setContests] = useState<PublicServiceContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeContest, setActiveContest] = useState<PublicServiceContest | null>(null);
  const [filter, setFilter] = useState<PublicServiceCategory | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<PublicServiceLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExamMode, setIsExamMode] = useState(false);
  const [ranking, setRanking] = useState<any[]>([]);
  const [showManualContestModal, setShowManualContestModal] = useState(false);
  const [manualContestData, setManualContestData] = useState({ category: 'culture_generale', level: 'BAC', title: '', questionsJSON: '' });

  const handleManualContestCreate = async () => {
    if (!manualContestData.title || !manualContestData.questionsJSON) {
      toast.error('Veuillez remplir le titre et les questions (JSON)');
      return;
    }
    
    let questionsParsed;
    try {
      questionsParsed = JSON.parse(manualContestData.questionsJSON);
      if (!Array.isArray(questionsParsed)) throw new Error('Les questions doivent être dans un tableau [ ]');
    } catch (e: any) {
      toast.error('Format JSON invalide: ' + e.message);
      return;
    }

    try {
      const newCtx = {
        titre: manualContestData.title,
        categorie: manualContestData.category,
        niveau: manualContestData.level,
        type: 'qcm',
        duree: questionsParsed.length * 2, // arbitrary duration
        difficulte: 'moyen',
        questions: questionsParsed
      };
      await addPublicServiceContest(newCtx);
      invalidateCache();
      setShowManualContestModal(false);
      setManualContestData({ category: 'culture_generale', level: 'BAC', title: '', questionsJSON: '' });
      toast.success('Concours ajouté avec succès');
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout manuel");
    }
  };

  useEffect(() => {
    if (!dataLoading && globalContests) {
      setContests(globalContests as PublicServiceContest[]);
      setLoading(false);
    }
  }, [globalContests, dataLoading]);

  useEffect(() => {
    const loadRanking = async () => {
      try {
        const data = await publicServiceExamService.getGlobalRanking(5);
        setRanking(data);
      } catch (error) {
        console.error("Error loading ranking:", error);
      }
    };
    loadRanking();
  }, []);

  const filteredContests = contests.filter(c => {
    if (c.status !== 'active') return false;
    const matchesCategory = filter === 'all' || c.categorie === filter;
    const matchesLevel = levelFilter === 'all' || c.niveau === levelFilter;
    const matchesSearch = c.titre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesLevel && matchesSearch;
  });

  const handleStartExam = async (contest: PublicServiceContest) => {
    // If questions are not in the document (new split architecture)
    if (!contest.questions || contest.questions.length === 0) {
      const toastId = toast.loading('Chargement des questions...');
      try {
        const detailsSnap = await getDoc(doc(db, 'public_service_contest_details', contest.id!));
        if (detailsSnap.exists()) {
          const detailsData = detailsSnap.data();
          contest.questions = detailsData.questions || [];
        } else {
          toast.error("Questions introuvables pour ce concours", { id: toastId });
          return;
        }
        toast.dismiss(toastId);
      } catch (err) {
        toast.error("Erreur de chargement", { id: toastId });
        return;
      }
    }
    setActiveContest(contest);
    setIsExamMode(true);
  };

  if (isExamMode && activeContest) {
    return (
      <PublicServiceExamPlayer 
        contest={activeContest} 
        onClose={() => {
          setIsExamMode(false);
          setActiveContest(null);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Section */}
      <div className="bg-emerald-600 pt-12 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-50" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-8"
          >
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/30 rounded-full w-fit mb-6">
                <ShieldCheck className="w-4 h-4 text-emerald-100" />
                <span className="text-xs font-medium text-emerald-50 text-emerald-100 tracking-wide uppercase">
                  Préparation Concours 🇧🇫
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
                Deviens le prochain fonctionnaire de <span className="text-emerald-300">l'État Burkinabè</span>
              </h1>
              <p className="text-lg text-emerald-50/80 mb-8 max-w-xl leading-relaxed">
                Prépare-toi efficacement avec nos anciens sujets, QCM interactifs et simulations d'examens chronométrées.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                  <span className="text-2xl font-bold text-white">500+</span>
                  <span className="text-sm text-emerald-100/70">QCM disponibles</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                  <TrendingUp className="w-5 h-5 text-emerald-300" />
                  <span className="text-sm text-emerald-100/70">Suivi de progression</span>
                </div>
              </div>
            </div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:block relative"
            >
              <div className="w-80 h-80 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 flex items-center justify-center p-8 rotate-3">
                <Trophy className="w-40 h-40 text-emerald-200 opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-16 bg-white rounded-2xl shadow-2xl flex items-center gap-3 px-4 -mt-10 -ml-10">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Star className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Nouveau Record !</div>
                      <div className="text-[10px] text-slate-500">Score: 98/100</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto -mt-12 px-4 sm:px-6 lg:px-8 relative z-20 pb-20">
        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-4 md:p-6 mb-8 border border-slate-100">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher un sujet, un concours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-600 placeholder:text-slate-400"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filtres:</span>
              </div>
              
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/10"
              >
                <option value="all">Toutes les matières</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <select 
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/10"
              >
                <option value="all">Tous les niveaux</option>
                <option value="BEPC">Niveau BEPC</option>
                <option value="BAC">Niveau BAC</option>
                <option value="Licence">Niveau Licence & +</option>
              </select>
            </div>
          </div>
          
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button 
                onClick={() => setShowManualContestModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Plus size={18} />
                Créer manuellement un concours
              </button>
            </div>
          )}
        </div>

        {/* Content Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main List */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-500" />
                Sujets recommandés pour toi
              </h2>
              <div className="text-sm text-slate-500 font-medium">
                {filteredContests.length} résultats trouvés
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 4, 5, 6].map(i => (
                  <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl" />
                ))}
              </div>
            ) : filteredContests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                  {filteredContests.map((contest, index) => (
                    <motion.div
                      key={contest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-2xl hover:shadow-slate-200/50 hover:border-emerald-100 transition-all cursor-pointer relative overflow-hidden"
                      onClick={() => handleStartExam(contest)}
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${categoryColors[contest.categorie] || 'from-slate-500 to-slate-600'} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity`} />
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${categoryColors[contest.categorie] || 'from-slate-500 to-slate-600'} text-white shadow-lg shadow-slate-200`}>
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {contest.type}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1">
                        {contest.titre}
                      </h3>
                      <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[2.5rem]">
                        {contest.description}
                      </p>

                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-50 rounded-xl p-2 text-center">
                          <div className="text-[10px] text-slate-400 font-medium uppercase mb-0.5">Niveau</div>
                          <div className="text-xs font-bold text-slate-700">{contest.niveau}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2 text-center">
                          <div className="text-[10px] text-slate-400 font-medium uppercase mb-0.5">Durée</div>
                          <div className="text-xs font-bold text-slate-700">{contest.duree} min</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2 text-center">
                          <div className="text-[10px] text-slate-400 font-medium uppercase mb-0.5">Difficulté</div>
                          <div className={`text-xs font-bold ${
                            contest.difficulte === 'facile' ? 'text-emerald-600' : 
                            contest.difficulte === 'moyen' ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {contest.difficulte}
                          </div>
                        </div>
                      </div>

                      <button className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200">
                        <Play className="w-4 h-4 fill-white" />
                        Lancer le test
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun sujet trouvé</h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                  Essaie de modifier tes filtres ou fais une recherche différente.
                </p>
                <button 
                  onClick={() => {setFilter('all'); setLevelFilter('all'); setSearchQuery('');}} 
                  className="mt-6 text-emerald-600 font-bold text-sm hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Stats / Progression */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Ma Progression
              </h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Expérience</span>
                    <span className="font-bold text-slate-900">840 XP</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[65%]" />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 text-right">Niveau 12 • Prochain à 1000 XP</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <Award className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <div className="text-xl font-bold text-slate-900">12</div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Tests finis</div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <Zap className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <div className="text-xl font-bold text-slate-900">85%</div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Taux de réussite</div>
                  </div>
                </div>
              </div>

              <button className="w-full mt-6 py-3 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <History className="w-4 h-4" />
                Voir mon historique
              </button>
            </div>

            {/* Badges / Gamification */}
            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-300">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-emerald-400" />
                Mes Badges
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="group relative">
                  <div className="aspect-square bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-emerald-500/20 transition-all">
                    <Trophy className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-white" />
                  </div>
                </div>
                <div className="aspect-square bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 grayscale">
                  <Award className="w-8 h-8 text-white/20" />
                  <Lock className="absolute w-4 h-4 text-white/30" />
                </div>
                <div className="aspect-square bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 grayscale">
                  <TrendingUp className="w-8 h-8 text-white/20" />
                  <Lock className="absolute w-4 h-4 text-white/30" />
                </div>
              </div>

              <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs transition-colors">
                Débloquer plus de badges
              </button>
            </div>

            {/* Ranking / Billboard */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-20 h-20 text-white" />
              </div>
              
              <h3 className="font-bold text-white mb-6 relative z-10">Classement National 🇧🇫</h3>
              
              <div className="space-y-4 relative z-10">
                {ranking.length > 0 ? (
                  ranking.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-300' : 'bg-orange-400'} text-slate-900 flex items-center justify-center text-[10px] font-black`}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{item.user_name || 'Utilisateur'}</div>
                          <div className="text-[10px] text-white/50">{item.university || 'Burkina Faso'}</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-emerald-400">{item.score}%</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/50 text-center py-4">Pas encore de classement disponible.</p>
                )}
              </div>

              <button className="w-full mt-6 py-3 bg-white text-slate-900 rounded-2xl font-bold text-xs hover:bg-emerald-50 transition-colors">
                Voir le top 100
              </button>
            </div>
          </div>
        </div>
      </div>

      {showManualContestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Plus size={24} className="text-emerald-600" />
                Créer un concours (Manuel)
              </h2>
              <button onClick={() => setShowManualContestModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titre du concours</label>
                <input 
                  type="text" 
                  value={manualContestData.title}
                  onChange={(e) => setManualContestData({ ...manualContestData, title: e.target.value })}
                  placeholder="Ex: Concours d'intégration 2024"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</label>
                  <select 
                    value={manualContestData.category}
                    onChange={(e) => setManualContestData({ ...manualContestData, category: e.target.value as PublicServiceCategory })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm text-slate-700"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Niveau</label>
                  <select 
                    value={manualContestData.level}
                    onChange={(e) => setManualContestData({ ...manualContestData, level: e.target.value as PublicServiceLevel })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm text-slate-700"
                  >
                    <option value="BEPC">BEPC</option>
                    <option value="BAC">BAC</option>
                    <option value="Licence">Licence</option>
                    <option value="Master">Master</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                  <span>Questions (Format JSON Array)</span>
                  <button onClick={() => {
                    const sample = `[\n  {\n    "question": "Votre question ici ?",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "bonne_reponse": 0,\n    "explication": "Explication courte"\n  }\n]`;
                    setManualContestData({...manualContestData, questionsJSON: sample});
                  }} className="text-emerald-600 hover:text-emerald-700 capitalize font-medium">Insérer modèle</button>
                </label>
                <textarea 
                  rows={10}
                  value={manualContestData.questionsJSON}
                  onChange={(e) => setManualContestData({ ...manualContestData, questionsJSON: e.target.value })}
                  placeholder="Collez ici le tableau JSON de vos questions..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-mono text-slate-700"
                />
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button 
                  onClick={handleManualContestCreate}
                  disabled={!manualContestData.title || !manualContestData.questionsJSON}
                  className="w-full py-4 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Plus size={20} />
                  Enregistrer ce concours
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
