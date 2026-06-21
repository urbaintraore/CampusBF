import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Briefcase, MapPin, Clock, Building2, Plus, X, Send, CheckCircle2, AlertCircle, FileUp, Edit, Search, Filter, ArrowUpDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ManualPaymentModal } from '@/components/ManualPaymentModal';
import { cn } from '@/lib/utils';
import { serverTimestamp } from 'firebase/firestore';
import { uploadFile } from '@/services/storageService';
import { internshipService } from '@/services/internshipService';
import { Internship } from '@/types';

export default function Internships() {
  const { user, isAdmin, addInternship, updateInternship, deleteInternship, applyInternship } = useAuth();
  const [internshipsList, setInternshipsList] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [internshipsLimit, setInternshipsLimit] = useState(15);
  const [hasMoreInternships, setHasMoreInternships] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showApplySuccess, setShowApplySuccess] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applyFile, setApplyFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const applyFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchInternships = async () => {
      const cacheKey = `local_cache_internships_directory_${internshipsLimit}`;
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheKey + '_time');
      const now = Date.now();

      // Cache for 10 minutes when paginating (600000 ms)
      if (cached && cacheTime && now - parseInt(cacheTime) < 600000) {
        const parsed = JSON.parse(cached);
        setInternshipsList(parsed);
        setHasMoreInternships(parsed.length >= internshipsLimit);
        setLoading(false);
        return;
      }

      try {
        const data = await internshipService.getInternships(internshipsLimit);
        setInternshipsList(data);
        setHasMoreInternships(data.length >= internshipsLimit);
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheKey + '_time', now.toString());
      } catch (error) {
        console.error("Error fetching internships:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInternships();
  }, [internshipsLimit]);

  // Form state for new internship
  const [newInternship, setNewInternship] = useState({
    title: '',
    company: '',
    location: '',
    type: 'Stage' as 'Stage' | 'Bourse' | 'Emploi' | 'Job Etudiant',
    description: '',
    applicationMethod: 'email' as 'email' | 'url',
    applicationValue: '',
    deadline: ''
  });

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [showExpired, setShowExpired] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'relevance'

  // Filtered and sorted internships
  const filteredInternships = useMemo(() => {
    let result = [...internshipsList];

    // Search by company name or title
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(job => 
        job.company.toLowerCase().includes(query) || 
        job.title.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter(job => job.type === typeFilter);
    }

    // Filter by location
    if (locationFilter !== 'all') {
      result = result.filter(job => job.location.toLowerCase().includes(locationFilter.toLowerCase()));
    }

    // Filter by deadline (expired)
    if (!showExpired) {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(job => !job.deadline || job.deadline >= today);
    }

    // Sort
    if (sortBy === 'date') {
      result.sort((a, b) => {
        const dateA = a.postedAt?.toDate ? a.postedAt.toDate() : new Date(a.postedAt || 0);
        const dateB = b.postedAt?.toDate ? b.postedAt.toDate() : new Date(b.postedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
    } else if (sortBy === 'relevance') {
      // Simple relevance: title matches query better
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result.sort((a, b) => {
          const aTitleMatch = a.title.toLowerCase().includes(query) ? 1 : 0;
          const bTitleMatch = b.title.toLowerCase().includes(query) ? 1 : 0;
          return bTitleMatch - aTitleMatch;
        });
      }
    }

    return result;
  }, [internshipsList, searchQuery, typeFilter, locationFilter, sortBy]);

  // Get unique locations for filter
  const locations = useMemo(() => {
    const locs = new Set<string>();
    internshipsList.forEach(job => {
      if (job.location) locs.add(job.location);
    });
    return Array.from(locs).sort();
  }, [internshipsList]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  const isSubscriptionActive = user?.premiumSubscriptionStatus === 'active';
  const isSubscriptionPending = user?.premiumSubscriptionStatus === 'pending';

  const handlePostInternship = () => {
    if (!user) {
      alert('Veuillez vous connecter pour publier une offre (Stage, Emploi ou Bourse).');
      return;
    }
    setEditingId(null);
    setNewInternship({
      title: '',
      company: '',
      location: '',
      type: 'Stage',
      description: '',
      applicationMethod: 'email',
      applicationValue: '',
      deadline: ''
    });
    setShowPostModal(true);
  };

  const openApplyModal = (job: any) => {
    if (!user) {
      alert('Veuillez vous connecter pour postuler.');
      return;
    }
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const openDetailsModal = (job: any) => {
    setSelectedJob(job);
    setShowDetailsModal(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyFile) {
      alert('Veuillez charger votre dossier (CV/Lettre de motivation).');
      return;
    }
    
    if (!user || !selectedJob) return;

    setIsSubmitting(true);
    try {
      // Upload file to Supabase Storage
      const { url } = await uploadFile(applyFile, 'documents');

      const applicationData = {
        internshipId: selectedJob.id,
        internshipTitle: selectedJob.title,
        company: selectedJob.company,
        studentId: user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        studentEmail: user.email,
        status: 'pending',
        resumeUrl: url,
      };

      await applyInternship(applicationData);

      setShowApplyModal(false);
      setShowApplySuccess(true);
      setApplyFile(null);
      setTimeout(() => setShowApplySuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert('Une erreur est survenue lors de l\'envoi de votre candidature.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateInternship(editingId, newInternship as any);
        alert('Offre modifiée avec succès !');
      } else {
        await addInternship({
          ...newInternship,
          authorId: user.id,
          postedAt: serverTimestamp(),
        } as any);
        alert('Offre publiée avec succès !');
      }
      setShowPostModal(false);
    } catch (error) {
      alert('Une erreur est survenue lors de la publication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInternship = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) {
      try {
        await deleteInternship(id);
        alert('Offre supprimée avec succès !');
      } catch (error) {
        alert('Une erreur est survenue lors de la suppression.');
      }
    }
  };

  const handleEditInternship = (job: any) => {
    setEditingId(job.id);
    setNewInternship({
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      description: job.description,
      applicationMethod: job.applicationMethod || 'email',
      applicationValue: job.applicationValue || job.applicationEmail || '',
      deadline: job.deadline || ''
    });
    setShowPostModal(true);
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Stages & Emplois & Bourses</h1>
          <p className="text-slate-500 mt-1">Lancez votre carrière professionnelle dès maintenant.</p>
        </div>
        <button 
          onClick={handlePostInternship}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
        >
          <Plus size={18} />
          Publier une offre
        </button>
      </div>

      {/* Search and Filters */}
      <div className="glass p-6 rounded-3xl space-y-6">
        <div className="flex flex-col gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Rechercher par entreprise ou titre de poste..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-200 rounded-2xl text-base focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Tous' },
                { id: 'Stage', label: 'Stage' },
                { id: 'Bourse', label: 'Bourse' },
                { id: 'Emploi', label: 'Emploi' },
                { id: 'Job Etudiant', label: 'Job Etudiant' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setTypeFilter(type.id)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95",
                    typeFilter === type.id 
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                      : "bg-white/50 text-slate-600 border border-slate-200 hover:bg-white hover:border-emerald-200"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none min-w-[160px]"
                >
                  <option value="all">Toutes les villes</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1 md:flex-none">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none min-w-[160px]"
                >
                  <option value="date">Plus récent</option>
                  <option value="relevance">Pertinence</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <input 
                type="checkbox"
                id="showExpired"
                checked={showExpired}
                onChange={(e) => setShowExpired(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="showExpired" className="text-xs font-bold text-slate-600 cursor-pointer uppercase tracking-wider">
                Afficher les offres expirées
              </label>
            </div>
          </div>
        </div>
      </div>



      {/* Success Toast */}
      {showApplySuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="glass bg-emerald-600/90 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50">
            <CheckCircle2 size={20} className="text-emerald-200" />
            <span className="font-medium">Candidature envoyée avec succès pour : {selectedJob?.title}</span>
          </div>
        </div>
      )}

      {/* Internships List */}
      <div className="grid gap-6">
        {loading ? (
          <div className="glass p-20 rounded-3xl text-center flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Chargement des offres...</p>
          </div>
        ) : filteredInternships.length === 0 ? (
          <div className="glass p-12 rounded-3xl text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Briefcase className="text-slate-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune offre trouvée</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              {searchQuery || typeFilter !== 'all' || locationFilter !== 'all' 
                ? "Aucune offre ne correspond à vos critères de recherche. Essayez de modifier vos filtres."
                : "Il n'y a pas encore d'offres de stage, d'emploi ou de bourse publiées. Revenez plus tard ou soyez le premier à en publier une !"}
            </p>
          </div>
        ) : filteredInternships.map((job) => (
          <div key={job.id} className="glass p-6 md:p-8 rounded-3xl hover:shadow-xl transition-all duration-300 group relative border border-white/40">
            {(isAdmin || user?.id === job.authorId) && (
              <div className="absolute top-6 right-6 flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEditInternship(job)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors bg-white/50 backdrop-blur-sm shadow-sm"
                  title="Modifier"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteInternship(job.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors bg-white/50 backdrop-blur-sm shadow-sm"
                  title="Supprimer"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              {/* Company Logo/Initial */}
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg shadow-slate-900/10">
                {job.company.slice(0, 2).toUpperCase()}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
                        job.type === 'Stage' 
                          ? 'bg-blue-100/50 text-blue-700 border border-blue-200/50' 
                          : job.type === 'Bourse'
                            ? 'bg-purple-100/50 text-purple-700 border border-purple-200/50'
                            : job.type === 'Job Etudiant'
                              ? 'bg-orange-100/50 text-orange-700 border border-orange-200/50'
                              : 'bg-emerald-100/50 text-emerald-700 border border-emerald-200/50'
                      )}>
                        {job.type}
                      </span>
                      <span className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Clock size={14} />
                        {job.postedAt?.toDate ? job.postedAt.toDate().toLocaleDateString() : (job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'Date inconnue')}
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {job.title}
                    </h3>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm text-slate-600 mb-6 bg-white/40 p-4 rounded-2xl border border-white/50">
                  <span className="flex items-center gap-2 font-medium">
                    <Building2 size={18} className="text-slate-400" /> 
                    {job.company}
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    <MapPin size={18} className="text-slate-400" /> 
                    {job.location}
                  </span>
                  {job.applicationValue && (
                    <span className="flex items-center gap-2 font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                      {job.applicationMethod === 'url' ? 'Site web' : 'Email'}: {job.applicationValue}
                    </span>
                  )}
                  {job.deadline && (
                    <span className="flex items-center gap-2 font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-lg">
                      <Clock size={16} /> 
                      Limite: {job.deadline}
                    </span>
                  )}
                </div>

                <p className="text-slate-600 text-sm leading-relaxed mb-8 line-clamp-3">
                  {job.description}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  {job.applicationMethod === 'url' ? (
                    <a 
                      href={job.applicationValue}
                      target="_blank"
                      rel="noreferrer"
                      className="px-8 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 inline-block text-center"
                    >
                      Consulter l'annonce
                    </a>
                  ) : (
                    <button 
                      onClick={() => openApplyModal(job)}
                      className="px-8 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      Postuler maintenant
                    </button>
                  )}
                  <button 
                    onClick={() => openDetailsModal(job)}
                    className="px-8 py-3 bg-white/50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-white transition-all hover:shadow-md"
                  >
                    Voir les détails
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredInternships.length > 0 && hasMoreInternships && (
          <div className="flex justify-center pt-8 pb-4 w-full">
            <button
              onClick={() => setInternshipsLimit(prev => prev + 15)}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-2xl font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-2"
            >
              Afficher d'autres opportunités de stages et d'emplois 💼
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)} />
          <div className="glass relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-white/20 flex items-center justify-between bg-white/40 sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    selectedJob.type === 'Stage' ? 'bg-blue-100 text-blue-700' :
                    selectedJob.type === 'Bourse' ? 'bg-purple-100 text-purple-700' :
                    selectedJob.type === 'Job Etudiant' ? 'bg-orange-100 text-orange-700' :
                    'bg-emerald-100 text-emerald-700'
                  )}>
                    {selectedJob.type}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedJob.title}</h2>
                </div>
                <p className="text-slate-500 text-sm">{selectedJob.company} • {selectedJob.location}</p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)} 
                className="p-2 hover:bg-slate-100/50 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto bg-white/20 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/40 p-4 rounded-2xl border border-white/50 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entreprise</p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    {selectedJob.company}
                  </p>
                </div>
                <div className="bg-white/40 p-4 rounded-2xl border border-white/50 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localisation</p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    {selectedJob.location}
                  </p>
                </div>
                <div className="bg-white/40 p-4 rounded-2xl border border-white/50 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date de publication</p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    {selectedJob.postedAt?.toDate ? selectedJob.postedAt.toDate().toLocaleDateString() : (selectedJob.postedAt ? new Date(selectedJob.postedAt).toLocaleDateString() : 'Date inconnue')}
                  </p>
                </div>
                {selectedJob.deadline && (
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 space-y-1">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Date limite</p>
                    <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                      <Clock size={16} className="text-amber-400" />
                      {selectedJob.deadline}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase size={20} className="text-emerald-600" />
                  Description du poste
                </h3>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-white/40 p-6 rounded-2xl border border-white/50">
                  {selectedJob.description}
                </div>
              </div>

              {selectedJob.applicationValue && (
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 space-y-3">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <Send size={18} className="text-blue-500" />
                    Comment postuler
                  </h3>
                  <p className="text-sm text-blue-800">
                    {selectedJob.applicationMethod === 'url' 
                      ? "Cette offre nécessite de postuler via le site web de l'entreprise :" 
                      : "Vous pouvez postuler en envoyant votre dossier à l'adresse email suivante :"}
                  </p>
                  <div className="bg-white/60 p-3 rounded-xl border border-blue-200 text-blue-900 font-mono text-xs break-all">
                    {selectedJob.applicationValue}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 sm:p-8 bg-white/40 border-t border-white/20 flex gap-4">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 py-4 bg-white/50 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-white transition-all hover:shadow-md"
              >
                Fermer
              </button>
              {selectedJob.applicationMethod === 'url' ? (
                <a 
                  href={selectedJob.applicationValue}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 text-center flex items-center justify-center gap-2"
                >
                  Postuler sur le site
                  <Send size={18} />
                </a>
              ) : (
                <button 
                  onClick={() => {
                    setShowDetailsModal(false);
                    openApplyModal(selectedJob);
                  }}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  Postuler maintenant
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowApplyModal(false)} />
          <div className="glass relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-white/20">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Postuler</h2>
                  <p className="text-slate-500 text-sm mt-1">{selectedJob?.title} chez {selectedJob?.company}</p>
                </div>
                <button 
                  onClick={() => setShowApplyModal(false)} 
                  className="p-2 hover:bg-slate-100/50 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 bg-white/40">
              <form onSubmit={handleApplySubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-900">Votre dossier (CV + Lettre de motivation)</label>
                  <input 
                    type="file" 
                    ref={applyFileInputRef}
                    onChange={(e) => setApplyFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                  <div 
                    onClick={() => applyFileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer bg-white/50",
                      applyFile 
                        ? "border-emerald-500 bg-emerald-50/50 shadow-inner" 
                        : "border-slate-200 hover:border-emerald-400 hover:bg-white"
                    )}
                  >
                    <div className={cn(
                      "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors",
                      applyFile ? "bg-emerald-100" : "bg-slate-100"
                    )}>
                      <FileUp size={28} className={cn(applyFile ? "text-emerald-600" : "text-slate-400")} />
                    </div>
                    <p className="text-sm font-bold text-slate-700 mb-1">
                      {applyFile ? applyFile.name : "Cliquez pour charger votre dossier"}
                    </p>
                    <p className="text-xs text-slate-500">Format PDF ou Word uniquement (Max 5MB)</p>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex gap-3">
                  <AlertCircle className="text-blue-500 flex-shrink-0" size={20} />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    En postulant, votre profil académique et votre dossier seront transmis directement au recruteur. Assurez-vous que vos informations sont à jour.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || !applyFile}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Envoyer ma candidature
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Post Internship Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPostModal(false)} />
          <div className="glass relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-white/20 flex items-center justify-between bg-white/40 sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingId ? 'Modifier l\'offre' : 'Publier une offre'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">Remplissez les détails de l'offre ci-dessous.</p>
              </div>
              <button 
                onClick={() => setShowPostModal(false)} 
                className="p-2 hover:bg-slate-100/50 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto bg-white/20">
                <form className="space-y-6" onSubmit={handleSubmitInternship}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Titre du poste</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.title}
                        onChange={(e) => setNewInternship({ ...newInternship, title: e.target.value })}
                        placeholder="Ex: Développeur Web Junior" 
                        className="w-full p-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Entreprise</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.company}
                        onChange={(e) => setNewInternship({ ...newInternship, company: e.target.value })}
                        placeholder="Nom de votre entreprise" 
                        className="w-full p-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Lieu</label>
                      <input 
                        type="text" 
                        required 
                        value={newInternship.location}
                        onChange={(e) => setNewInternship({ ...newInternship, location: e.target.value })}
                        placeholder="Ex: Ouagadougou, Burkina Faso" 
                        className="w-full p-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Type de contrat</label>
                      <select 
                        value={newInternship.type}
                        onChange={(e) => setNewInternship({ ...newInternship, type: e.target.value as any })}
                        className="w-full p-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      >
                        <option value="Stage">Stage</option>
                        <option value="Bourse">Bourse</option>
                        <option value="Emploi">Emploi</option>
                        <option value="Job Etudiant">Job Etudiant</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Mode de réception</label>
                      <select 
                        value={newInternship.applicationMethod || 'email'}
                        onChange={(e) => setNewInternship({ ...newInternship, applicationMethod: e.target.value as 'email' | 'url', applicationValue: '' })}
                        className="w-full p-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      >
                        <option value="email">Email</option>
                        <option value="url">Lien web</option>
                      </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-semibold text-slate-900">
                        {newInternship.applicationMethod === 'url' ? 'Lien du site web' : 'Email de réception'}
                      </label>
                      <input 
                        type={newInternship.applicationMethod === 'url' ? 'url' : 'email'}
                        required 
                        value={newInternship.applicationValue || ''}
                        onChange={(e) => setNewInternship({ ...newInternship, applicationValue: e.target.value })}
                        placeholder={newInternship.applicationMethod === 'url' ? 'Ex: https://entreprise.com/jobs' : 'Ex: rh@entreprise.com'}
                        className="w-full p-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Date limite (Optionnel)</label>
                    <input 
                      type="date" 
                      value={newInternship.deadline}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewInternship({ ...newInternship, deadline: e.target.value })}
                      className="w-full p-3.5 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Description du poste</label>
                    <textarea 
                      required 
                      value={newInternship.description}
                      onChange={(e) => setNewInternship({ ...newInternship, description: e.target.value })}
                      placeholder="Décrivez les missions, les prérequis et les avantages..." 
                      className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all h-40 resize-none" 
                    />
                  </div>

                  <div className="pt-4 border-t border-white/20">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      {editingId ? 'Enregistrer les modifications' : 'Publier l\'offre'}
                    </button>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

