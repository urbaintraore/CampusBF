import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, Search, Filter, Globe, Calendar, ExternalLink, 
  Sparkles, ShieldCheck, MapPin, Loader2, ArrowRight, BookOpen,
  CheckCircle2, RefreshCw, AlertCircle, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { scholarshipService } from '@/services/scholarshipService';
import { Scholarship } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Scholarships() {
  const { user, isAdmin } = useAuth();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');

  const fetchScholarships = async () => {
    setLoading(true);
    try {
      const data = await scholarshipService.getScholarships();
      setScholarships(data);
    } catch (error) {
      console.error("Error fetching scholarships:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholarships();
  }, []);

  const handleSync = async () => {
    if (!isAdmin) return;
    setSyncing(true);
    try {
      const newCount = await scholarshipService.syncNewScholarships();
      if (newCount > 0) {
        alert(`${newCount} nouvelles bourses ajoutées avec succès !`);
        fetchScholarships();
      } else {
        alert("Aucune nouvelle bourse trouvée pour le moment. Réessayez plus tard.");
      }
    } catch (error) {
      alert("Erreur lors de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  };

  const handleAIAnalysis = async (id: string) => {
    if (!user) {
      alert("Veuillez vous connecter pour utiliser l'IA.");
      return;
    }
    
    setAnalyzingId(id);
    const scholarship = scholarships.find(s => s.id === id);
    if (!scholarship) return;

    try {
      const analysis = await scholarshipService.analyzeScholarship(scholarship, user);
      setScholarships(prev => prev.map(s => s.id === id ? { ...s, ...analysis } : s));
    } catch (error) {
      console.error("AI analysis error:", error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleOpenAssistant = () => {
    const event = new CustomEvent('open-campus-chat', { 
      detail: { 
        message: "Bonjour ! Je souhaite avoir des conseils pour postuler aux bourses internationales. Peux-tu m'aider à optimiser mon dossier ?",
        open: true 
      } 
    });
    window.dispatchEvent(event);
  };

  const filteredScholarships = useMemo(() => {
    return scholarships.filter(s => {
      const matchesSearch = searchQuery === '' || 
        s.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.domaine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.pays.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLevel = levelFilter === 'all' || s.niveau.toLowerCase().includes(levelFilter.toLowerCase());
      const matchesDomain = domainFilter === 'all' || s.domaine.toLowerCase().includes(domainFilter.toLowerCase());
      const matchesCountry = countryFilter === 'all' || s.pays.toLowerCase().includes(countryFilter.toLowerCase());

      return matchesSearch && matchesLevel && matchesDomain && matchesCountry;
    });
  }, [scholarships, searchQuery, levelFilter, domainFilter, countryFilter]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set(scholarships.map(s => s.pays).filter(Boolean));
    return Array.from(countries).sort();
  }, [scholarships]);

  const uniqueDomains = useMemo(() => {
    const domains = new Set(scholarships.map(s => s.domaine).filter(Boolean));
    return Array.from(domains).sort();
  }, [scholarships]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-emerald-500/30">
            <Sparkles size={14} />
            Bourses & Opportunités IA
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight tracking-tight">
            Propulsez vos études à <span className="text-emerald-400">l'International</span>
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            Accédez aux meilleures bourses mondiales sélectionnées et analysées par notre IA pour les étudiants africains.
          </p>
          
          <div className="flex flex-wrap gap-4">
            {isAdmin && (
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {syncing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Synchroniser les opportunités
              </button>
            )}
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
              <ShieldCheck size={18} className="text-emerald-500" />
              Sources 100% vérifiées
            </div>
          </div>
        </div>
        
        {/* Decor */}
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none overflow-hidden">
          <GraduationCap size={400} className="absolute -top-20 -right-20 rotate-12" />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass p-6 rounded-3xl sticky top-4 z-30 shadow-xl border border-white/20 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher une bourse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-2xl appearance-none outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Tous les niveaux</option>
              <option value="Licence">Licence</option>
              <option value="Master">Master</option>
              <option value="PhD">Doctorat (PhD)</option>
            </select>
          </div>

          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-2xl appearance-none outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Tous les pays</option>
              {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="relative">
            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-2xl appearance-none outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Tous les domaines</option>
              {uniqueDomains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
          <Loader2 size={48} className="text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Recherche des meilleures opportunités mondiales...</p>
        </div>
      ) : filteredScholarships.length === 0 ? (
        <div className="glass p-20 rounded-3xl text-center bg-white/50 border-2 border-dashed border-slate-200">
          <BookOpen size={64} className="mx-auto text-slate-200 mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Aucune opportunité disponible</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Nous n'avons pas encore trouvé d'offres correspondant à vos critères.
            {isAdmin && " En tant qu'administrateur, vous pouvez lancer une synchronisation IA."}
          </p>
          {isAdmin && (
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 mx-auto"
            >
              {syncing ? <RefreshCw className="animate-spin" size={24} /> : <Sparkles size={24} />}
              Lancer la recherche IA
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredScholarships.map((s, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={s.id} 
              className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:border-emerald-200/50 flex flex-col"
            >
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-tighter rounded-lg">
                      {s.niveau}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-tighter rounded-lg border border-emerald-100">
                      {s.domaine}
                    </span>
                    {s.match_score && (
                      <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-lg flex items-center gap-1">
                        <TrendingUp size={10} />
                        Match: {s.match_score}%
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 font-mono text-[10px] uppercase">
                    Ref: {s.id.slice(0, 8)}
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-4 leading-tight group-hover:text-emerald-700 transition-colors">
                  {s.titre}
                </h3>

                <div className="flex flex-wrap gap-6 mb-8 text-sm text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <MapPin size={14} className="text-slate-900" />
                    </div>
                    <span>{s.pays}</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-600">
                    <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                      <Calendar size={14} className="text-rose-600" />
                    </div>
                    <span>Limite: {s.date_limite || 'ASAP'}</span>
                  </div>
                </div>

                {/* AI Insight Section */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6 relative group/ia">
                  {!s.resume_ia ? (
                    <button 
                      onClick={() => handleAIAnalysis(s.id)}
                      disabled={analyzingId === s.id}
                      className="w-full py-4 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-3"
                    >
                      {analyzingId === s.id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Sparkles className="text-emerald-500" size={18} />
                      )}
                      Obtenir l'analyse IA
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">
                        <Sparkles size={14} />
                        Analyse CampusBF-IA
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed italic">
                        "{s.resume_ia}"
                      </p>
                      {s.conseils_ia && (
                        <div className="pt-4 border-t border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Conseils d'experts</p>
                          <div className="flex flex-col gap-2">
                            {s.conseils_ia.split('|').map((c, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{c.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                    <Globe size={14} className="text-slate-400" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.source}</span>
                </div>
                
                <div className="flex gap-3">
                  <a 
                    href={s.lien_officiel} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all hover:translate-x-1"
                  >
                    Postuler
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 flex flex-col md:flex-row items-center gap-8 shadow-inner">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-600/10">
          <GraduationCap size={32} className="text-emerald-600" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-emerald-900 mb-2">Comment optimiser vos chances ?</h3>
          <p className="text-emerald-800/70 text-sm leading-relaxed">
            Utilisez notre assistant personnel pour corriger votre CV et votre lettre de motivation. Une candidature soignée est la clé de la réussite internationale.
          </p>
        </div>
        <button 
          onClick={handleOpenAssistant}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md active:scale-95"
        >
          Parler à l'Assistant IA
        </button>
      </div>
    </div>
  );
}
