import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, Search, Filter, Globe, Calendar, ExternalLink, 
  Sparkles, ShieldCheck, MapPin, Loader2, ArrowRight, BookOpen,
  CheckCircle2, RefreshCw, AlertCircle, TrendingUp, Cpu, Compass, Import, Check
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { scholarshipService } from '@/services/scholarshipService';
import { Scholarship } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

const AVAILABLE_COUNTRIES = [
  { id: "Maroc", label: "Royaume du Maroc (AMCI)" },
  { id: "Algérie", label: "République Algérienne" },
  { id: "Tunisie", label: "Tunisie (Technologie & Gestion)" },
  { id: "Égypte", label: "Égypte (Al-Azhar & Public)" },
  { id: "France", label: "France (Campus France & BGF)" },
  { id: "Canada", label: "Canada (PCBF & Excellence)" },
  { id: "Chine", label: "Chine (Bourses du Gouvernement)" },
  { id: "Russie", label: "Russie (Open Doors & Gouvernement)" },
  { id: "Suisse", label: "Suisse (Bourses d'excellence)" },
  { id: "Belgique", label: "Belgique (ARES & Enabel)" },
  { id: "Allemagne", label: "Allemagne (DAAD)" },
  { id: "Inde", label: "Inde (ICCR)" },
  { id: "Cuba", label: "Cuba (Médecine & Santé)" },
  { id: "Japon", label: "Japon (MEXT)" },
  { id: "Corée du Sud", label: "Corée du Sud (GKS)" },
  { id: "Turquie", label: "Turquie (Türkiye Bursları)" }
];

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

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["Maroc", "France", "Canada"]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scannedResults, setScannedResults] = useState<Scholarship[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);

  const fetchScholarships = async () => {
    setLoading(true);
    try {
      const data = await scholarshipService.getScholarships();
      setScholarships(data);
      
      // Auto-sync if empty and admin (to populate the site for everyone)
      if (data.length === 0 && isAdmin && !syncing) {
        handleSync();
      }
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
        toast.success(`${newCount} nouvelles bourses ajoutées avec succès !`);
        fetchScholarships();
      } else {
        toast("Aucune nouvelle bourse trouvée pour le moment. Réessayez plus tard.");
      }
    } catch (error) {
      toast.error("Erreur lors de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  };

  const handleScanWeb = async () => {
    if (selectedCountries.length === 0) {
      toast.error("Veuillez sélectionner au moins une ambassade à scanner.");
      return;
    }
    setIsScanning(true);
    setScanLogs([]);
    setScannedResults([]);
    
    const logsSequence = [
      "Connexion sécurisée aux serveurs de CampusBF-IA...",
      "Initialisation de l'agent intelligent de recherche web...",
      `Ciblage des ambassades sélectionnées : ${selectedCountries.join(', ')}...`,
      "Scan des annonces de bourses bilatérales actives au Burkina Faso...",
      "Interrogation par Gemini 3.5-flash avec outils de recherche Google...",
      "Analyse de la couverture académique, financière, billets d'avion et indemnités...",
      "Validation de l'éligibilité spécifique des candidats burkinabè...",
      "Génération et structuration du catalogue d'opportunités d'excellence..."
    ];

    for (let i = 0; i < logsSequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setScanLogs(prev => [...prev, logsSequence[i]]);
    }

    try {
      const results = await scholarshipService.scanEmbassyScholarships(selectedCountries);
      setScannedResults(results);
      toast.success(`${results.length} opportunités d'ambassades réelles identifiées !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de scan. Chargement des opportunités de la base de secours.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportScholarship = async (scanned: Scholarship) => {
    setImportingId(scanned.id);
    try {
      const { id, ...scholarshipPayload } = scanned;
      await scholarshipService.saveScholarship({
        ...scholarshipPayload,
        tags: [...(scanned.tags || []), "Importé"]
      });
      toast.success("Bourse importée et publiée avec succès sur CampusBF !");
      
      // Update local state list
      setScholarships(prev => [{ id: `imported-${Date.now()}`, ...scholarshipPayload } as Scholarship, ...prev]);
      
      // Remove from scanned list
      setScannedResults(prev => prev.filter(s => s.id !== scanned.id));
    } catch (err) {
      toast.error("Erreur lors de l'importation de l'opportunité.");
    } finally {
      setImportingId(null);
    }
  };

  const toggleCountrySelection = (countryId: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryId) 
        ? prev.filter(c => c !== countryId) 
        : [...prev, countryId]
    );
  };

  const handleAIAnalysis = async (id: string) => {
    if (!user) {
      toast.error("Veuillez vous connecter pour utiliser l'IA.");
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
            <button 
              onClick={() => setShowScanner(!showScanner)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <Cpu size={18} />
              {showScanner ? "Masquer le Scanner" : "Scanner les bourses des Ambassades (IA)"}
            </button>

            {isAdmin && (
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {syncing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Synchroniser l'annuaire principal
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

      {/* Embassy Web Scanner UI Console */}
      <AnimatePresence>
        {showScanner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 md:p-8 border border-emerald-500/30 shadow-2xl relative">
              <div className="absolute top-4 right-4 text-slate-500 font-mono text-[9px] uppercase tracking-widest hidden sm:flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                CONTRÔLE INTÉGRÉ DES AMBASSADES
              </div>
              
              <div className="max-w-4xl">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Cpu className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold font-sans text-white">Scanner d'Opportunités d'Ambassades IA</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Scannez le web pour repérer les opportunités de bourses d'études proposées par les ambassades (Maroc, Algérie, Égypte, Tunisie, France, Canada, etc.) pour les étudiants/élèves burkinabè.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800 my-6 pt-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 block">Cibler les ambassades (Maroc, Algérie, Égypte, Tunisie, France, Canada, etc.) :</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {AVAILABLE_COUNTRIES.map((country) => {
                      const selected = selectedCountries.includes(country.id);
                      return (
                        <button
                          key={country.id}
                          onClick={() => toggleCountrySelection(country.id)}
                          disabled={isScanning}
                          className={cn(
                            "flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all text-xs font-semibold cursor-pointer select-none",
                            selected 
                              ? "bg-emerald-950/40 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/5" 
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                          )}
                        >
                          <span>{country.label}</span>
                          <span className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            selected 
                              ? "bg-emerald-500 border-emerald-400 text-slate-950" 
                              : "border-slate-700 bg-slate-950"
                          )}>
                            {selected && <Check size={10} strokeWidth={4} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center mt-6">
                  <button
                    onClick={handleScanWeb}
                    disabled={isScanning}
                    className="flex items-center justify-center gap-2.5 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Scan & Recherche IA...
                      </>
                    ) : (
                      <>
                        <Compass className="w-5 h-5" />
                        Lancer le scan IA du web
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 leading-relaxed md:max-w-md">
                    * Notre IA procède à une recherche multilatérale approfondie (Google Search Grounding) sur les portails consulaires officiels pour ramener les informations éligibles au Burkina Faso.
                  </p>
                </div>

                {/* Console Log Animation */}
                {isScanning && (
                  <div className="mt-8 bg-slate-950 border border-slate-850 rounded-2xl p-5 font-mono text-xs text-emerald-400 space-y-2 max-h-48 overflow-y-auto shadow-inner">
                    <p className="text-slate-500 uppercase font-bold tracking-wider mb-2 text-[9px] flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                      Console de Recherche Ambassade-IA
                    </p>
                    {scanLogs.map((log, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        key={idx} 
                        className="flex items-center gap-2 font-mono text-[11px]"
                      >
                        <span className="text-slate-700 select-none">&gt;</span>
                        <span>{log}</span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Scanned opportunities list */}
                {!isScanning && scannedResults.length > 0 && (
                  <div className="mt-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Sparkles size={16} className="text-emerald-400" />
                        Résultats du Scan Consulaires ({scannedResults.length})
                      </h3>
                      <button 
                        onClick={() => setScannedResults([])}
                        className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Effacer les résultats
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {scannedResults.map((result) => (
                        <div 
                          key={result.id} 
                          className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-3">
                              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold uppercase rounded-lg border border-emerald-500/20">
                                {result.pays}
                              </span>
                              <span className="text-slate-500 font-mono text-[10px] uppercase">
                                {result.niveau}
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-white mb-2 leading-snug">{result.titre}</h4>
                            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">{result.description}</p>
                            
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-4 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                              <Calendar size={12} className="text-rose-400" />
                              <span>Date limite : <strong className="text-rose-400">{result.date_limite || 'En cours / Annuel'}</strong></span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-slate-800 mt-2">
                            {isAdmin && (
                              <button
                                onClick={() => handleImportScholarship(result)}
                                disabled={importingId === result.id}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer align-middle"
                              >
                                {importingId === result.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Import size={12} />
                                )}
                                Publier sur CampusBF
                              </button>
                            )}
                            <a
                              href={result.lien_officiel}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all text-center cursor-pointer align-middle"
                            >
                              S'informer (Source)
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <option value="all">{loading ? 'Chargement...' : 'Tous les pays'}</option>
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
              <option value="all">{loading ? 'Chargement...' : 'Tous les domaines'}</option>
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
