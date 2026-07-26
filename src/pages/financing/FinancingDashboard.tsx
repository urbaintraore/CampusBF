import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  useFinancingProfile, financingService, AidApplication, InstitutionalScholarship 
} from '@/services/financingService';
import { 
  GraduationCap, Sparkles, FileText, CheckCircle2, AlertCircle, Clock, 
  UploadCloud, Plus, Trash2, Shield, Calendar, CreditCard, 
  UserCheck, RefreshCw, Eye, ArrowRight, ChevronRight, Check, X, FileUp, LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function FinancingDashboard() {
  const { user, isAdmin, logActivity } = useAuth();
  const navigate = useNavigate();
  // Safe hook execution. If authenticated, it returns profile; if not, it does not crash.
  const { profile, loading, error, uploadDocument, removeDocument, refresh } = useFinancingProfile(user);
  
  // Local states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scholarships' | 'applications' | 'admin' | 'donations'>('dashboard');
  const [applications, setApplications] = useState<AidApplication[]>([]);
  const [adminApplications, setAdminApplications] = useState<AidApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Donation Form States
  const [donationType, setDonationType] = useState<'espece' | 'nature'>('espece');
  const [donationAmount, setDonationAmount] = useState<string>('25000');
  const [donationCustomAmount, setDonationCustomAmount] = useState<string>('');
  const [donationDestination, setDonationDestination] = useState<string>('Fonds Général de Soutien');
  const [donationMaterialType, setDonationMaterialType] = useState<string>('Ordinateur / Matériel Informatique');
  const [donationMaterialState, setDonationMaterialState] = useState<string>('Excellent état');
  const [donationDescription, setDonationDescription] = useState<string>('');
  const [donationMessage, setDonationMessage] = useState<string>('');

  const handleDonationWhatsAppRedirect = () => {
    const adminPhone = "22670000000"; // Code pays 226 (Burkina Faso) + numéro
    let detailMsg = '';
    if (donationType === 'espece') {
      const amt = donationAmount === 'custom' ? donationCustomAmount : donationAmount;
      detailMsg = `*Type de don :* Don en Espèce\n*Montant :* ${amt ? formatFCFA(Number(amt)) : 'À définir'}\n*Destination des fonds :* ${donationDestination}`;
    } else {
      detailMsg = `*Type de don :* Don en Nature\n*Type de matériel :* ${donationMaterialType}\n*État :* ${donationMaterialState}\n*Description :* ${donationDescription}`;
    }

    const msg = `Bonjour l'administrateur de CampusBF 🇧🇫,\n\n` +
      `Je souhaite effectuer un don pour soutenir la vie étudiante et la réussite académique au Burkina Faso !\n\n` +
      `${detailMsg}\n\n` +
      (donationMessage ? `*Message de soutien :* "${donationMessage}"\n\n` : '') +
      `*Donateur :* ${user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Donateur Anonyme'} (${user?.role === 'teacher' ? 'Enseignant' : 'Partenaire'})\n` +
      `*Email :* ${user?.email || 'Non spécifié'}\n\n` +
      `Merci de m'indiquer la démarche pour concrétiser cette action !`;

    const encoded = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/${adminPhone}?text=${encoded}`;
    
    if (user && logActivity) {
      logActivity({
        action: `Initiation de don ${donationType}`,
        module: 'Financement',
        details: `Redirection WhatsApp pour don en ${donationType}`,
        severity: 'info'
      }).catch(err => console.error(err));
    }

    toast.success("Redirection vers le WhatsApp de l'administrateur...");
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 1000);
  };

  // Mentor / Admin Scholarships States
  const [localScholarships, setLocalScholarships] = useState<InstitutionalScholarship[]>([]);
  const [loadingScholarships, setLoadingScholarships] = useState(false);
  
  // Publish Scholarship Modal Form State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishingBourse, setIsPublishingBourse] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubDomain, setPubDomain] = useState('');
  const [pubLevel, setPubLevel] = useState('');
  const [pubAmount, setPubAmount] = useState('');
  const [pubDeadline, setPubDeadline] = useState('');
  const [pubDescription, setPubDescription] = useState('');
  const [pubCountry, setPubCountry] = useState('Burkina Faso');

  // Apply for Scholarship Modal State
  const [showApplyScholarshipModal, setShowApplyScholarshipModal] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<InstitutionalScholarship | null>(null);
  const [scholarshipMotivation, setScholarshipMotivation] = useState('');
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);

  // New Application Form State
  const [newAppType, setNewAppType] = useState<'bourse_nationale' | 'aide_logement' | 'aide_transport' | 'aide_scolarite' | 'aide_alimentaire' | 'aide_manuels'>('bourse_nationale');
  const [newAppAmount, setNewAppAmount] = useState<string>('');
  const [newAppDesc, setNewAppDesc] = useState<string>('');

  // Fetch local scholarships
  const fetchScholarships = async () => {
    setLoadingScholarships(true);
    try {
      const data = await financingService.getScholarships();
      // Only display scholarships published by real administrators or mentors (exclude AI-published/scanned bourses)
      const filtered = data.filter(s => {
        const createdByLower = (s.createdBy || '').toLowerCase();
        const docSourceLower = (s.source || '').toLowerCase();
        const isAI = 
          createdByLower === 'ai' || 
          createdByLower === 'ai-agent' || 
          createdByLower === 'system-ai' || 
          docSourceLower.includes('ia') || 
          docSourceLower.includes('ai') ||
          (s.description || '').toLowerCase().includes('scannée par l\'ia') ||
          (s.titre || '').toLowerCase().includes('bourse ia');
        return !isAI;
      });
      setLocalScholarships(filtered);
    } catch (e) {
      console.error("Error retrieving admin/mentor scholarships:", e);
    } finally {
      setLoadingScholarships(false);
    }
  };

  // Fetch student assistance applications
  const fetchApplications = async () => {
    if (!user) return;
    setLoadingApps(true);
    try {
      const userApps = await financingService.getUserApplications(user.id);
      setApplications(userApps);

      if (user.role === 'admin' || isAdmin) {
        const allApps = await financingService.getAllApplications();
        setAdminApplications(allApps);
      }
    } catch (e) {
      console.error("Error fetching financial applications:", e);
      toast.error("Erreur de récupération des demandes");
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchScholarships();
    fetchApplications();
  }, [user]);

  // Handle refresh action
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    await fetchApplications();
    await fetchScholarships();
    setIsRefreshing(false);
    toast.success("Données actualisées avec succès");
  };

  // Document upload simulation
  const handleDocUpload = async (type: string, name: string) => {
    if (!user) {
      toast.error("Veuillez vous connecter pour envoyer des documents");
      return;
    }
    try {
      toast.loading("Simulateur d'analyse et d'upload du document...", { id: 'upload_doc' });
      await uploadDocument(type, name);
      toast.success(`Document "${name}" enregistré sur CampusBF`, { id: 'upload_doc' });
      fetchApplications(); // Recalculate and update
    } catch (err) {
      toast.error("Erreur d'envoi du document", { id: 'upload_doc' });
    }
  };

  // Document deletion
  const handleDocRemove = async (docId: string, name: string) => {
    try {
      await removeDocument(docId);
      toast.success(`Document "${name}" supprimé`);
      fetchApplications();
    } catch (err) {
      toast.error("Erreur de suppression");
    }
  };

  // Submit aid application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amountNum = parseFloat(newAppAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Veuillez saisir un montant valide supérieur à 0");
      return;
    }

    setIsSubmittingApp(true);
    try {
      const payload = {
        userId: user.id,
        userEmail: user.email || '',
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Étudiant',
        type: newAppType,
        amount: amountNum,
        description: newAppDesc,
        status: 'pending' as const
      };

      await financingService.applyForAid(payload);
      toast.success("Votre demande d'aide financière a été soumise");
      setShowApplyModal(false);
      setNewAppAmount('');
      setNewAppDesc('');
      fetchApplications();
    } catch (err) {
      toast.error("Erreur lors de la soumission de la demande");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Publish a new local scholarship (Admin/Mentors)
  const handlePublishScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const isMentor = user.role === 'tutor' || user.role === 'alumni';
    if (user.role !== 'admin' && !isAdmin && !isMentor) {
      toast.error("Autorisation refusée");
      return;
    }

    setIsPublishingBourse(true);
    try {
      const payload: Omit<InstitutionalScholarship, 'id'> = {
        titre: pubTitle,
        domaine: pubDomain,
        niveau: pubLevel,
        montant: pubAmount,
        date_limite: pubDeadline,
        description: pubDescription,
        pays: pubCountry,
        source: user.role === 'admin' || isAdmin ? "Administration CampusBF" : `Mentor ${user.firstName || ''} ${user.lastName || ''}`.trim(),
        createdBy: user.id
      };

      await financingService.publishScholarship(payload);
      toast.success("Nouvelle offre de bourse publiée !");
      setShowPublishModal(false);
      
      // Clear forms
      setPubTitle('');
      setPubDomain('');
      setPubLevel('');
      setPubAmount('');
      setPubDeadline('');
      setPubDescription('');
      setPubCountry('Burkina Faso');
      
      fetchScholarships();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la publication");
    } finally {
      setIsPublishingBourse(false);
    }
  };

  // Delete a local scholarship
  const handleDeleteScholarship = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette offre de bourse ?")) return;
    try {
      await financingService.deleteScholarship(id);
      toast.success("Offre de bourse retirée");
      fetchScholarships();
    } catch (err) {
      toast.error("Erreur lors du retrait de l'offre");
    }
  };

  // Student applies to local scholarship
  const handleApplyScholarshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedScholarship) return;

    setIsSubmittingCampaign(true);
    try {
      // Numerical approximation of amount for Firebase verification rules
      const numericAmountStr = String(selectedScholarship.montant).replace(/[^0-9]/g, '');
      const amountValue = numericAmountStr ? parseFloat(numericAmountStr) : 120000;

      await financingService.applyForAid({
        userId: user.id,
        userEmail: user.email || '',
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Étudiant',
        type: 'bourse_nationale', // fully authorized collection type
        amount: amountValue > 0 ? amountValue : 120000,
        description: `[Candidature Bourse : ${selectedScholarship.titre}] - ${scholarshipMotivation}`,
        status: 'pending',
        scholarshipId: selectedScholarship.id,
        scholarshipTitle: selectedScholarship.titre
      });

      toast.success("Votre dossier de candidature a été déposé.");
      setShowApplyScholarshipModal(false);
      setScholarshipMotivation('');
      setSelectedScholarship(null);
      fetchApplications();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de la candidature");
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  // Delete application
  const handleDeleteApp = async (appId: string) => {
    try {
      await financingService.deleteApplication(appId);
      toast.success("Demande annulée");
      fetchApplications();
    } catch (err) {
      toast.error("Erreur d'annulation");
    }
  };

  // Admin action: update status
  const handleAdminStatusUpdate = async (appId: string, status: 'approved' | 'rejected') => {
    try {
      await financingService.updateApplicationStatus(appId, status);
      toast.success(status === 'approved' ? "Demande approuvée" : "Demande rejetée");
      fetchApplications();
    } catch (err) {
      toast.error("Erreur de mise à jour");
    }
  };

  // Get French label for Application Type
  const getAppTypeLabel = (type: string) => {
    switch (type) {
      case 'bourse_nationale': return 'Bourse Nationale (Locale)';
      case 'aide_logement': return 'Aide au Logement';
      case 'aide_transport': return 'Soutien Transport (Carburant)';
      case 'aide_scolarite': return 'Frais de Scolarité';
      case 'aide_alimentaire': return 'Bourse Alimentaire FONER';
      case 'aide_manuels': return 'Aide aux Fournitures & Manuels';
      default: return type;
    }
  };

  // Formatting currency
  const formatFCFA = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount).replace('XOF', 'FCFA');
  };

  // Determine if current user can publish scholarships
  const canPublish = user && (
    user.role === 'admin' || 
    isAdmin || 
    user.role === 'tutor' || 
    user.role === 'alumni'
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium font-sans">Chargement de votre espace de financement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8" id="financing-root-container">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-500/20" id="financing-header-banner">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 font-medium px-3 py-1 rounded-full text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Éligibilité & Opportunités v1</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-sans">Financement d'Étude et Opportunité</h1>
          <p className="text-slate-300 max-w-2xl text-sm md:text-base leading-relaxed">
            Évaluez votre admissibilité financière de façon transparente, gérez vos documents justificatifs et postulez aux bourses exclusives publiées par l'administration et nos mentors diplômés.
          </p>
        </div>
        
        <div className="mt-6 md:mt-0 z-10 flex space-x-3 self-start md:self-center">
          <button 
            id="refresh-data-btn"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white px-4 py-2 rounded-xl text-sm border border-slate-700 font-medium transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          
          {user && user.role !== 'teacher' && user.role !== 'parent' && user.role !== 'company' && user.role !== 'institution' && (
            <button 
              id="request-aid-header-btn"
              onClick={() => setShowApplyModal(true)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition border border-indigo-400/20 cursor-pointer animate-fade-in"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Demande d'aide</span>
            </button>
          )}

          {user && (user.role === 'teacher' || user.role === 'parent' || user.role === 'company' || user.role === 'institution') && (
            <button 
              id="make-donation-header-btn"
              onClick={() => setActiveTab('donations')}
              className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/30 transition border border-rose-400/20 cursor-pointer animate-fade-in"
            >
              <Sparkles className="w-4.5 h-4.5" />
              <span>Faire un Don</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200" id="financing-navigation-tabs">
        <div className="flex space-x-8">
          <button
            id="tab-dashboard-trigger"
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 text-sm font-semibold relative transition cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4" />
              <span>Tableau de Bord</span>
            </div>
          </button>

          <button
            id="tab-donations-trigger"
            onClick={() => setActiveTab('donations')}
            className={`pb-4 text-sm font-semibold relative transition cursor-pointer ${
              activeTab === 'donations' 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Faire un Don 💝</span>
            </div>
          </button>

          {user && user.role !== 'teacher' && user.role !== 'parent' && user.role !== 'company' && user.role !== 'institution' && (
            <button
              id="tab-applications-trigger"
              onClick={() => {
                if (!user) {
                  toast.error("Veuillez vous connecter pour voir vos demandes d'aides.");
                  navigate('/login');
                } else {
                  setActiveTab('applications');
                }
              }}
              className={`pb-4 text-sm font-semibold relative transition cursor-pointer ${
                activeTab === 'applications' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Mes Demandes d'Aide</span>
                {user && applications.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold ml-1.5">
                    {applications.length}
                  </span>
                )}
              </div>
            </button>
          )}

          {user && (user.role === 'admin' || isAdmin) && (
            <button
              id="tab-admin-trigger"
              onClick={() => setActiveTab('admin')}
              className={`pb-4 text-sm font-semibold relative transition cursor-pointer ${
                activeTab === 'admin' 
                  ? 'text-indigo-700 border-b-2 border-indigo-700' 
                  : 'text-rose-500 hover:text-rose-700'
              }`}
            >
              <div className="flex items-center space-x-2 bg-rose-50 px-2.5 py-1 rounded-full text-xs">
                <Shield className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-rose-700">Gestion Administrateur</span>
                {adminApplications.filter(a => a.status === 'pending').length > 0 && (
                  <span className="bg-rose-100 text-rose-700 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                    {adminApplications.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            id="dashboard-grid-view"
          >
            {/* If anonymous visitor/guest display beautiful lock/sign up invitation screen */}
            {!user ? (
              <div className="lg:col-span-3 bg-white border border-slate-100 p-8 md:p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-6 shadow-sm" id="anonymous-finances-lock">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-fit">
                  <Shield className="w-10 h-10 animate-bounce" />
                </div>
                <div className="space-y-2 max-w-xl">
                  <h3 className="text-lg md:text-xl font-bold text-slate-800">Évaluez votre score d'éligibilité aux financements</h3>
                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                    Créez un compte gratuit pour évaluer votre admissibilité financière, téléverser vos relevés de notes et attestations justificatives de scolarité, et bénéficier d'une assistance prioritaire à l'aide en ligne.
                  </p>
                </div>
                <div className="flex space-x-4">
                  <button 
                    onClick={() => navigate('/login')}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md transition cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Se connecter</span>
                  </button>
                  <button 
                    onClick={() => navigate('/signup')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-xl text-sm transition cursor-pointer border border-slate-200"
                  >
                    Créer un compte
                  </button>
                </div>
              </div>
            ) : (user.role === 'teacher' || user.role === 'parent' || user.role === 'company' || user.role === 'institution') ? (
              // Teacher, Parent, Company & Institution Dashboard View (Donors)
              <div className="lg:col-span-3 space-y-8" id="teacher-dashboard-view">
                {/* Stats cards for teacher/parent/donor */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-start space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Étudiants Burkinabè</h4>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">1 500+</p>
                      <p className="text-xs text-slate-500 mt-0.5">Accompagnés cette année</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-start space-x-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Dons en Nature</h4>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">124</p>
                      <p className="text-xs text-slate-500 mt-0.5">Ordinateurs, livres & vélos</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-start space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Bourses d'Excellence</h4>
                      <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">45 000 000 FCFA</p>
                      <p className="text-xs text-slate-500 mt-0.5">Financés par nos partenaires</p>
                    </div>
                  </div>
                </div>

                {/* Main Call to Action for donation */}
                <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6">
                  <div className="max-w-3xl">
                    <h3 className="text-xl font-extrabold text-slate-800">💝 Devenez un acteur majeur du changement universitaire</h3>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed font-sans">
                      En tant qu'enseignant, parent ou donateur sur CampusBF, vous pouvez transformer la vie académique des étudiants burkinabè. Faites un don en espèce pour parrainer une scolarité, ou offrez du matériel (livres, ordinateurs, vélos) pour aider concrètement les étudiants en situation de besoin.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl w-fit mb-3">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-slate-800">Dons en Espèce</h4>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-sans">
                          Soutenez l'achat de kits alimentaires, le financement des abonnements de transport (motos/bus) ou le règlement des frais de scolarité des étudiants nécessiteux.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('donations')}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-indigo-600/10 cursor-pointer text-center"
                      >
                        Faire un don en Espèce
                      </button>
                    </div>

                    <div className="border border-slate-100 bg-slate-50/30 rounded-xl p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl w-fit mb-3">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-slate-800">Dons en Nature</h4>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-sans">
                          Offrez des manuels scolaires officiels, du matériel informatique d'occasion ou neuf (PC portables), des vélos ou motos, ou proposez des solutions de logement étudiant.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('donations')}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-rose-600/10 cursor-pointer text-center"
                      >
                        Faire un don en Nature
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Eligibility Ring Gauge and Badge Card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-between text-center shadow-sm relative overflow-hidden lg:col-span-1" id="eligibility-gauge-component">
                  <div className="w-full text-left mb-4">
                    <h3 className="text-base font-bold text-slate-800">Votre score global</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Calculé en temps réel</p>
                  </div>

                  {profile && (
                    <>
                      {/* Progress Ring */}
                      <div className="relative flex items-center justify-center my-6">
                        <svg className="w-40 h-40 transform -rotate-90">
                          <circle
                            cx="80"
                            cy="80"
                            r="68"
                            className="stroke-slate-100"
                            strokeWidth="10"
                            fill="transparent"
                          />
                          <circle
                            cx="80"
                            cy="80"
                            r="68"
                            stroke={
                              profile.totalEligibilityScore >= 80 ? '#10b981' : // emerald
                              profile.totalEligibilityScore >= 60 ? '#14b8a6' : // teal
                              profile.totalEligibilityScore >= 40 ? '#f59e0b' : // amber
                              '#ef4444' // rose/red
                            }
                            strokeWidth="12"
                            strokeDasharray={2 * Math.PI * 68}
                            strokeDashoffset={2 * Math.PI * 68 * (1 - profile.totalEligibilityScore / 100)}
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-4xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {profile.totalEligibilityScore}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-1">sur 100 pts</span>
                        </div>
                      </div>

                      {/* Badge designation matching */}
                      <div className="w-full space-y-4">
                        <div className="p-4 rounded-xl border flex flex-col items-center space-y-2 bg-slate-50/50 border-slate-100">
                          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Statut d'éligibilité</span>
                          <div className={`px-4 py-1.5 rounded-full text-sm font-extrabold flex items-center space-x-2 shadow-sm ${
                            profile.eligibilityBadge === 'Excellent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            profile.eligibilityBadge === 'Très Éligible' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            profile.eligibilityBadge === 'Moyennement Éligible' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            <span>{profile.eligibilityBadge}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                          {profile.totalEligibilityScore >= 60 
                            ? "Félicitations ! Votre profil présente d'excellents critères pour l'attribution de bourses et d'aides locales." 
                            : "Complétez votre profil, déposez vos documents et participez aux activités CampusBF pour accroître votre score globale."
                          }
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Score Stats Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm lg:col-span-2 space-y-6" id="score-parameters-breakdown">
                  {profile && (
                    <>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Détail des notes accumulées</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Le score d'éligibilité se base sur 4 piliers d'évaluation CampusBF</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Academic level */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/10 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Niveaux d'étude priorisés</span>
                            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {profile.academicLevelScore} / 30 pts
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(profile.academicLevelScore / 30) * 100}%` }}></div>
                          </div>
                          <p className="text-xs text-slate-500">
                            Les cycles de Licence (L1, L2, L3) obtiennent 30 pts, les Masters 20 pts, et les Doctorants 15 pts.
                          </p>
                        </div>

                        {/* Profile Completion */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/10 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Informations & Profil</span>
                            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {profile.profileCompletionScore} / 30 pts
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(profile.profileCompletionScore / 30) * 100}%` }}></div>
                          </div>
                          <p className="text-xs text-slate-500">
                            Calculé en fonction des données saisies (INE, Téléphone, Photo, Ville, Filière, Université).
                          </p>
                        </div>

                        {/* Campus Activities stats */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/10 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Activités CampusBF</span>
                            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {profile.activityScore} / 20 pts
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(profile.activityScore / 20) * 100}%` }}></div>
                          </div>
                          <p className="text-xs text-slate-500">
                            Récompensant le partage de documents (+10), la participation aux quiz (+5), et le parrainage (+5).
                          </p>
                        </div>

                        {/* Documents uploaded status */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/10 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Dossier Justificatif</span>
                            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {profile.documentsScore} / 20 pts
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(profile.documentsScore / 20) * 100}%` }}></div>
                          </div>
                          <p className="text-xs text-slate-500">
                            5 points par document envoyé, doublé d'un bonus (+5 pts) dès la validation formelle du fichier.
                          </p>
                        </div>
                      </div>

                      {/* Tips for increasing eligibility */}
                      <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-800">Conseil d'attribution</p>
                          <p className="text-xs text-amber-900 leading-normal font-sans">
                            Assurez-vous de charger une <strong>Attestation d'inscription</strong> valide pour l'année en cours ainsi que votre <strong>relevé de notes</strong>. Les dossiers incomplets de niveau orange/rouge réduisent grandement l'acceptation par les comités de financement.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Documents Upload Section */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm lg:col-span-3 space-y-6" id="documents-manager-card">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Gestion de vos pièces justificatives</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Fournissez vos attestations pour finaliser votre dossier d'admissibilité financière</p>
                  </div>

                  {profile && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Inscription Doc */}
                      <div className="border border-slate-100 bg-slate-50/20 p-4 rounded-xl space-y-4 flex flex-col justify-between" id="doc-type-inscription">
                        <div className="space-y-2">
                          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl w-fit">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 leading-snug font-sans">Attestation d'inscription</h4>
                          <p className="text-[10px] text-slate-400">Certificat de scolarité valide (format PDF ou image)</p>
                        </div>

                        {profile.documents.some(d => d.type === 'inscription') ? (
                          <div className="space-y-3 mt-2">
                            {profile.documents.filter(d => d.type === 'inscription').map(docItem => (
                              <div key={docItem.id} className="p-2 rounded-lg bg-white border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 truncate">
                                  <FileText className={`w-3.5 h-3.5 ${docItem.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                  <span className="text-[10px] text-slate-600 truncate font-mono max-w-[100px]">{docItem.name}</span>
                                </div>
                                <button 
                                  onClick={() => handleDocRemove(docItem.id, docItem.name)}
                                  className="p-1 hover:text-rose-600 text-slate-400 rounded-md transition cursor-pointer"
                                  title="Retirer ce document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDocUpload('inscription', "Attestation_Inscription_CampusBF.pdf")}
                            className="w-full flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-lg text-xs transition cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Ajouter</span>
                          </button>
                        )}
                      </div>

                      {/* Notes Doc */}
                      <div className="border border-slate-100 bg-slate-50/20 p-4 rounded-xl space-y-4 flex flex-col justify-between" id="doc-type-notes">
                        <div className="space-y-2">
                          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl w-fit">
                            <FileText className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 leading-snug font-sans">Relevé de notes</h4>
                          <p className="text-[10px] text-slate-400">Relevé de notes officiel ou bulletin semestriel</p>
                        </div>

                        {profile.documents.some(d => d.type === 'notes') ? (
                          <div className="space-y-3 mt-2">
                            {profile.documents.filter(d => d.type === 'notes').map(docItem => (
                              <div key={docItem.id} className="p-2 rounded-lg bg-white border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 truncate">
                                  <FileText className={`w-3.5 h-3.5 ${docItem.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                  <span className="text-[10px] text-slate-600 truncate font-mono max-w-[100px]">{docItem.name}</span>
                                </div>
                                <button 
                                  onClick={() => handleDocRemove(docItem.id, docItem.name)}
                                  className="p-1 hover:text-rose-600 text-slate-400 rounded-md transition cursor-pointer"
                                  title="Retirer ce document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDocUpload('notes', "Relevé_Notes_Officiel.pdf")}
                            className="w-full flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-lg text-xs transition cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Ajouter</span>
                          </button>
                        )}
                      </div>

                      {/* Identity Doc */}
                      <div className="border border-slate-100 bg-slate-50/20 p-4 rounded-xl space-y-4 flex flex-col justify-between" id="doc-type-identity">
                        <div className="space-y-2">
                          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl w-fit">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 leading-snug font-sans">Identité (CNIB/Passeport)</h4>
                          <p className="text-[10px] text-slate-400">Carte d'identité CNIB, passeport ou carte d'étudiant</p>
                        </div>

                        {profile.documents.some(d => d.type === 'identity') ? (
                          <div className="space-y-3 mt-2">
                            {profile.documents.filter(d => d.type === 'identity').map(docItem => (
                              <div key={docItem.id} className="p-2 rounded-lg bg-white border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 truncate">
                                  <FileText className={`w-3.5 h-3.5 ${docItem.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                  <span className="text-[10px] text-slate-600 truncate font-mono max-w-[100px]">{docItem.name}</span>
                                </div>
                                <button 
                                  onClick={() => handleDocRemove(docItem.id, docItem.name)}
                                  className="p-1 hover:text-rose-600 text-slate-400 rounded-md transition cursor-pointer"
                                  title="Retirer ce document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDocUpload('identity', "Carte_Identité_CNIB.pdf")}
                            className="w-full flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-lg text-xs transition cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Ajouter</span>
                          </button>
                        )}
                      </div>

                      {/* CV Doc */}
                      <div className="border border-slate-100 bg-slate-50/20 p-4 rounded-xl space-y-4 flex flex-col justify-between" id="doc-type-cv">
                        <div className="space-y-2">
                          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl w-fit">
                            <FileUp className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 leading-snug font-sans">Curriculum Vitae (CV)</h4>
                          <p className="text-[10px] text-slate-400">Votre CV à jour contenant vos compétences</p>
                        </div>

                        {profile.documents.some(d => d.type === 'cv') ? (
                          <div className="space-y-3 mt-2">
                            {profile.documents.filter(d => d.type === 'cv').map(docItem => (
                              <div key={docItem.id} className="p-2 rounded-lg bg-white border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 truncate">
                                  <FileText className={`w-3.5 h-3.5 ${docItem.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                  <span className="text-[10px] text-slate-600 truncate font-mono max-w-[100px]">{docItem.name}</span>
                                </div>
                                <button 
                                  onClick={() => handleDocRemove(docItem.id, docItem.name)}
                                  className="p-1 hover:text-rose-600 text-slate-400 rounded-md transition cursor-pointer"
                                  title="Retirer ce document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDocUpload('cv', "Mon_CV_Academique.pdf")}
                            className="w-full flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-lg text-xs transition cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Ajouter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* DONATIONS TAB */}
        {activeTab === 'donations' && (
          <motion.div
            key="donations-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
            id="donations-tab-view"
          >
            <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-8">
              <div className="border-b border-slate-100 pb-5">
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-rose-500 animate-pulse" />
                  <span>Soutenir l'Excellence & la Solidarité Étudiante</span>
                </h3>
                <p className="text-xs md:text-sm text-slate-500 mt-1 leading-relaxed">
                  Remplissez ce court formulaire pour déclarer votre don. Vous serez redirigé vers le WhatsApp de l'administrateur de CampusBF pour finaliser la transaction ou la remise du matériel.
                </p>
              </div>

              {/* Toggle Donation Type */}
              <div className="grid grid-cols-2 gap-4 max-w-md bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setDonationType('espece')}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    donationType === 'espece'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Don en Espèce 💰
                </button>
                <button
                  type="button"
                  onClick={() => setDonationType('nature')}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    donationType === 'nature'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Don en Nature 📦
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                {/* Donation Form inputs */}
                <div className="space-y-6">
                  {donationType === 'espece' ? (
                    <>
                      {/* Espèce inputs */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">Montant du Don (FCFA)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {['10000', '25000', '50000', '100000'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setDonationAmount(val);
                                setDonationCustomAmount('');
                              }}
                              className={`py-3 text-xs font-bold rounded-xl border font-mono transition cursor-pointer ${
                                donationAmount === val
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                  : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-700'
                              }`}
                            >
                              {formatFCFA(Number(val))}
                            </button>
                          ))}
                        </div>
                        
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setDonationAmount('custom')}
                            className={`w-full py-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                              donationAmount === 'custom'
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            Autre montant personnalisé
                          </button>
                        </div>

                        {donationAmount === 'custom' && (
                          <div className="relative pt-2 animate-fade-in">
                            <input
                              type="number"
                              required
                              placeholder="Ex: 150000"
                              value={donationCustomAmount}
                              onChange={(e) => setDonationCustomAmount(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-16 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                            />
                            <span className="absolute right-3 top-5 text-[10px] font-bold text-slate-500">FCFA</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">Fonds ou Attribution Ciblé</label>
                        <select
                          value={donationDestination}
                          onChange={(e) => setDonationDestination(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                        >
                          <option value="Fonds Général de Soutien">Fonds Général de Soutien (Urgence & Social)</option>
                          <option value="Bourses d'Excellence STIM">Bourses d'Excellence STIM (Sciences & Technologies)</option>
                          <option value="Aide Alimentaire & Logement">Aide Alimentaire & Logement étudiant (Foyer)</option>
                          <option value="Transports & Mobilité (MotoRide)">Transports & Mobilité (Aide carburant / MotoRide)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Nature inputs */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">Type de Matériel ou Service proposé</label>
                        <select
                          value={donationMaterialType}
                          onChange={(e) => setDonationMaterialType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                        >
                          <option value="Ordinateur / Matériel Informatique">Ordinateur / Matériel Informatique (PC, Tablette...)</option>
                          <option value="Livres / Manuels de cours">Livres / Manuels d'études & Syllabus officiels</option>
                          <option value="Moyen de transport (Vélo/Moto)">Moyen de transport (Vélo, Moto, Casque...)</option>
                          <option value="Vêtements / Effets personnels">Vêtements, sacs à dos ou fournitures académiques</option>
                          <option value="Logement / Chambre d'étudiant">Proposition de Colocation / Chambre à loyer modéré</option>
                          <option value="Autre">Autre don matériel ou service de soutien</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">État du Matériel</label>
                        <select
                          value={donationMaterialState}
                          onChange={(e) => setDonationMaterialState(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                        >
                          <option value="Neuf">Neuf (sous emballage original)</option>
                          <option value="Excellent état">Excellent état (très peu utilisé)</option>
                          <option value="Bon état (fonctionnel)">Bon état (parfaitement propre et fonctionnel)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">Description détaillée du don</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Ex: PC portable HP Elitebook, 8 Go RAM, disque dur 256 Go SSD avec chargeur, parfaitement fonctionnel pour un étudiant en informatique..."
                          value={donationDescription}
                          onChange={(e) => setDonationDescription(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition leading-normal font-sans"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Message de soutien à l'étudiant (Optionnel)</label>
                    <textarea
                      rows={2}
                      placeholder="Un mot d'encouragement ou une consigne particulière de parrainage..."
                      value={donationMessage}
                      onChange={(e) => setDonationMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition leading-normal font-sans"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleDonationWhatsAppRedirect}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-3"
                    >
                      <span>Confirmer et Contacter l'administrateur via WhatsApp 💬</span>
                    </button>
                    <p className="text-[10px] text-slate-400 mt-2 text-center font-sans">
                      En cliquant sur ce bouton, votre proposition sera mise en forme et vous serez redirigé vers le compte officiel WhatsApp de l'administration de CampusBF.
                    </p>
                  </div>
                </div>

                {/* Right side banner panel describing why to donate */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden border border-slate-800">
                  <div className="absolute right-0 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="space-y-6">
                    <div className="bg-emerald-500/20 text-emerald-300 font-bold text-xs px-3 py-1 rounded-full w-fit">
                      Impact de vos dons au Burkina Faso 🇧🇫
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-white/10 p-1.5 rounded-lg text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          <strong>Accès équitable :</strong> 100% de vos dons matériels sont attribués directement aux étudiants burkinabè en situation de précarité vérifiée par notre commission administrative.
                        </p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-white/10 p-1.5 rounded-lg text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          <strong>Transparence totale :</strong> L'administration de CampusBF vous transmettra un reçu formel et vous mettra en relation (si désiré) avec l'étudiant bénéficiaire de votre parrainage académique.
                        </p>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-white/10 p-1.5 rounded-lg text-emerald-400 flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          <strong>Mobilité accrue :</strong> Les dons de vélos et de motos permettent aux étudiants habitant en dehors des cités universitaires d'accéder quotidiennement aux amphithéâtres.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-800 mt-6 text-center lg:text-left">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Besoin d'assistance par appel ?</p>
                    <p className="text-sm font-extrabold text-white mt-1 font-mono">+226 70 00 00 00</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}


        {/* DEMANDS LIST TAB */}
        {activeTab === 'applications' && (
          <motion.div
            key="applications-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
            id="applications-list-tab"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Historique des demandes d'aides</h3>
                <p className="text-xs text-slate-500 mt-0.5">Suivez vos demandes d'accompagnement universitaires financières</p>
              </div>
              <button
                id="request-aid-tab-btn"
                onClick={() => setShowApplyModal(true)}
                className="flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border border-indigo-200/30"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle demande d'aide</span>
              </button>
            </div>

            {loadingApps ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-12 text-center flex flex-col items-center max-w-lg mx-auto" id="applications-empty-placeholder">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full w-fit mb-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Aucune demande déposée</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
                  Vous n'avez pas encore soumis de demande d'aide (Bourses, transports, repas ou scolarité) sur la plateforme.
                </p>
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-semibold shadow-md transition cursor-pointer"
                >
                  Faire une demande
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm" id="applications-table-card">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type d'aide / Candidature</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date de dépôt</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Valeur ou Montant</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {applications.map((app) => (
                        <tr key={app.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              {app.scholarshipTitle ? (
                                <>
                                  <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg w-fit">
                                    Candidature Bourse
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 mt-2 font-mono">{app.scholarshipTitle}</span>
                                </>
                              ) : (
                                <span className="text-sm font-bold text-slate-800">{getAppTypeLabel(app.type)}</span>
                              )}
                              <span className="text-xs text-slate-400 font-mono mt-1.5 truncate max-w-[280px]" title={app.description}>{app.description || 'Sans motivation spécifique'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {app.createdAt ? (
                              new Date(app.createdAt.seconds ? app.createdAt.seconds * 1000 : app.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'long', year: 'numeric'
                              })
                            ) : 'Aujourd\'hui'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-slate-800">
                            {app.amount > 1000 ? formatFCFA(app.amount) : "Dossier validé"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                              app.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                              app.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {app.status === 'approved' ? 'Acceptée' :
                               app.status === 'rejected' ? 'Rejetée' :
                               'En attente...'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {app.status === 'pending' ? (
                              <button
                                onClick={() => handleDeleteApp(app.id!)}
                                className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                              >
                                Annuler
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Traitée</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && user && (user.role === 'admin' || isAdmin) && (
          <motion.div
            key="admin-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
            id="admin-demands-management"
          >
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-700" />
                <span>Panneau de Contrôle Administrateur</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Décidez d'accorder ou de rejeter les demandes d'aides et bourses soumises par les étudiants de CampusBF</p>
            </div>

            {loadingApps ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : adminApplications.length === 0 ? (
              <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-12 text-center flex flex-col items-center">
                <p className="text-slate-500 font-semibold text-sm">Aucune demande soumise au niveau national.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm" id="admin-demands-table">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/75">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Demandeur</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type d'aide / Candidature</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Montant requis</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {adminApplications.map((app) => (
                        <tr key={app.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{app.userName}</span>
                              <span className="text-xs text-slate-400 font-mono mt-0.5">{app.userEmail}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              {app.scholarshipTitle ? (
                                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg w-fit">
                                  Bourse : {app.scholarshipTitle}
                                </span>
                              ) : (
                                <span className="text-xs font-extrabold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg w-fit font-sans">
                                  {getAppTypeLabel(app.type)}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 font-mono mt-1.5 max-w-[240px] truncate leading-normal italic">
                                "{app.description}"
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-slate-800">
                            {formatFCFA(app.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                              app.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                              app.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {app.status === 'approved' ? 'Approuvée' :
                               app.status === 'rejected' ? 'Rejetée' :
                               'En attente...'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs space-x-2">
                            {app.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleAdminStatusUpdate(app.id!, 'approved')}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                                >
                                  Approuver
                                </button>
                                <button
                                  onClick={() => handleAdminStatusUpdate(app.id!, 'rejected')}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                                >
                                  Rejeter
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-400 font-semibold italic text-xs">Traitée</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW AID APPLICATION MODAL */}
      {showApplyModal && user && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="aid-apply-modal">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-slate-100 shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Déposer une demande d'aide</h4>
                  <p className="text-[10px] text-slate-400">Ration, logement ou transport</p>
                </div>
              </div>
              <button 
                onClick={() => setShowApplyModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              {/* Type Category selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Type de besoin d'assistance</label>
                <select
                  value={newAppType}
                  onChange={(e) => setNewAppType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="bourse_nationale">Bourse Nationale annuelle</option>
                  <option value="aide_logement">Aide au Logement (Chambre Campus)</option>
                  <option value="aide_transport">Soutien Transports & Carburant</option>
                  <option value="aide_scolarite">Financement / Frais d'Inscription</option>
                  <option value="aide_alimentaire">Bourse Alimentaire Mensuelle</option>
                  <option value="aide_manuels">Aide aux Fournitures & Syllabi</option>
                </select>
              </div>

              {/* Amount form field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Montant requis estimé (FCFA)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    placeholder="Ex: 50000"
                    value={newAppAmount}
                    onChange={(e) => setNewAppAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-16 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-500">FCFA</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  Saisissez un chiffre entier. Les demandes avec des montants d'aide exagérés sont refusées de facto.
                </p>
              </div>

              {/* Cover letter / Motivation field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Motivation & Lettre d'explication</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Justifiez votre situation financière précaire pour ce besoin particulier à l'administration..."
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition leading-normal font-sans"
                />
              </div>

              {/* Form buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="w-1/2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold px-4 py-2 text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-bold px-4 py-2 text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center space-x-2"
                >
                  {isSubmittingApp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <span>Soumettre</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* NEW BOURSE PUBLISH MODAL (Admin & Mentors) */}
      {showPublishModal && user && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="publish-bourse-modal">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-100 shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Publier une offre de Bourse d'Étude</h4>
                  <p className="text-[10px] text-slate-400">Diffusion ciblée et candidatures directes</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPublishModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePublishScholarship} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Titre de la bourse</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bourse d'Élite Master d'Intelligence Artificielle"
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Domaine principal de scolarité</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: STIM / Informatique"
                    value={pubDomain}
                    onChange={(e) => setPubDomain(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 font-sans">Niveau d'études exigé</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Licence L3 ou Master"
                    value={pubLevel}
                    onChange={(e) => setPubLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Montant ou dotation estimée</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 800 000 CFA / An"
                    value={pubAmount}
                    onChange={(e) => setPubAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Date limite de candidature</label>
                  <input
                    type="date"
                    required
                    value={pubDeadline}
                    onChange={(e) => setPubDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Pays d'accueil</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Burkina Faso, France, Maroc, etc"
                  value={pubCountry}
                  onChange={(e) => setPubCountry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description & Conditions d'attribution</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Détaillez les avantages inclus (frais, logement, tutorat), les critères d'excellence locale et comment soumettre..."
                  value={pubDescription}
                  onChange={(e) => setPubDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 transition leading-normal font-sans"
                />
              </div>

              {/* Form buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="w-1/2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold px-4 py-2 text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPublishingBourse}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white font-bold px-4 py-2 text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center space-x-2"
                >
                  {isPublishingBourse ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Publication...</span>
                    </>
                  ) : (
                    <span>Publier l'offre</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* STUDENT APPLY TO SCHOLARSHIP MODAL */}
      {showApplyScholarshipModal && selectedScholarship && user && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="apply-scholarship-modal">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-slate-100 shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Postuler à la bourse</h4>
                  <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{selectedScholarship.titre}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowApplyScholarshipModal(false);
                  setSelectedScholarship(null);
                }}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleApplyScholarshipSubmit} className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-normal font-sans">
                <p>Vous êtes sur le point de postuler à la bourse d'études :</p>
                <p className="font-bold text-slate-800 mt-1">{selectedScholarship.titre}</p>
                <p className="mt-1.5 flex items-center space-x-1.5 font-bold text-indigo-700">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Dotation : {selectedScholarship.montant}</span>
                </p>
              </div>

              {/* Motivation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Lettre de motivation de candidature (Obligatoire)</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Expliquez brièvement pourquoi vous devriez être sélectionné pour cette offre par rapport à votre niveau et situation..."
                  value={scholarshipMotivation}
                  onChange={(e) => setScholarshipMotivation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition leading-normal font-sans"
                />
              </div>

              {/* Form buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyScholarshipModal(false);
                    setSelectedScholarship(null);
                  }}
                  className="w-1/2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold px-4 py-2 text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCampaign}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-bold px-4 py-2 text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center space-x-2"
                >
                  {isSubmittingCampaign ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <span>Déposer mon dossier</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
