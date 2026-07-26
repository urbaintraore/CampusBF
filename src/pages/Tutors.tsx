import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Star, 
  MessageCircle, 
  Calendar, 
  CheckCircle, 
  X, 
  GraduationCap, 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Phone, 
  Mail, 
  Loader2, 
  Plus, 
  Search, 
  BookOpen, 
  User as UserIcon, 
  Send, 
  Briefcase, 
  Check, 
  ChevronRight, 
  Users 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Tutor, User, StudentTutorRequest, TutorResponse } from '@/types';
import { 
  doc, 
  setDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  limit, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  increment 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadFile } from '@/services/storageService';
import { toast } from 'sonner';

export default function Tutors() {
  const { user, isAdmin, submitTutorApplication } = useAuth();
  const navigate = useNavigate();

  // Navigation tabs for users with dual visibility (admin, parent, teachers, tutors)
  const [activeTab, setActiveTab] = useState<'tutors-list' | 'student-requests'>('tutors-list');

  // List of all approved tutors (for non-students)
  const [tutors, setTutors] = useState<User[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);

  // Student specific request states
  const [studentRequests, setStudentRequests] = useState<StudentTutorRequest[]>([]);
  const [studentProposals, setStudentProposals] = useState<TutorResponse[]>([]);
  const [studentRequestsLoading, setStudentRequestsLoading] = useState(true);

  // Tutor specific/all active requests states
  const [allActiveRequests, setAllActiveRequests] = useState<StudentTutorRequest[]>([]);
  const [tutorProposals, setTutorProposals] = useState<TutorResponse[]>([]);
  const [allRequestsLoading, setAllRequestsLoading] = useState(true);

  // Form states
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState<StudentTutorRequest | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Request Form fields
  const [requestSubject, setRequestSubject] = useState('');
  const [requestLevel, setRequestLevel] = useState('Lycée');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestBudget, setRequestBudget] = useState('2000');
  const [requestLocation, setRequestLocation] = useState('');
  const [requestPhone, setRequestPhone] = useState('');

  // Proposal Form fields
  const [proposalRate, setProposalRate] = useState('2500');
  const [proposalMessage, setProposalMessage] = useState('');

  // Tutors List states (search & filter)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');

  // Rating and Application modal states (original features kept)
  const [ratingModal, setRatingModal] = useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationDescription, setApplicationDescription] = useState('');
  const [selectedApplicationFile, setSelectedApplicationFile] = useState<File | null>(null);
  const [isUploadingApplication, setIsUploadingApplication] = useState(false);
  const [isApplicationSubmitted, setIsApplicationSubmitted] = useState(false);
  const [applicationError, setApplicationError] = useState('');
  const [applicationSubjects, setApplicationSubjects] = useState('');
  const [applicationHourlyRates, setApplicationHourlyRates] = useState({
    college: 0,
    lycee: 0,
    licence: 0,
    master: 0
  });

  const isStudent = user?.role === 'student';
  const isTutorOrTeacher = user?.tutorStatus === 'approved' || user?.role === 'teacher' || user?.role === 'alumni';

  // Force Tab selection based on role upon load
  useEffect(() => {
    if (isStudent) {
      setActiveTab('student-requests');
    } else if (isTutorOrTeacher) {
      setActiveTab('student-requests');
    } else {
      setActiveTab('tutors-list');
    }
  }, [user, isStudent, isTutorOrTeacher]);

  // 1. Fetch public approved tutors (for non-student viewing)
  useEffect(() => {
    if (isStudent) return; // Students cannot see the list of tutors!
    
    const fetchTutors = async () => {
      try {
        const q = query(collection(db, 'users'), where('tutorStatus', '==', 'approved'), limit(50));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
        setTutors(list);
      } catch (error) {
        console.error("Error fetching tutors:", error);
      } finally {
        setTutorsLoading(false);
      }
    };
    fetchTutors();
  }, [isStudent]);

  // 2. Fetch student's own requests & associated proposals
  useEffect(() => {
    if (!user || user.role !== 'student') {
      setStudentRequestsLoading(false);
      return;
    }

    const requestsQuery = query(collection(db, 'student_tutor_requests'), where('studentId', '==', user.id));
    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentTutorRequest));
      setStudentRequests(list);
      setStudentRequestsLoading(false);
    }, (error) => {
      console.error("Error loading student requests:", error);
      setStudentRequestsLoading(false);
    });

    const proposalsQuery = query(collection(db, 'tutor_responses'), where('studentId', '==', user.id));
    const unsubProposals = onSnapshot(proposalsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorResponse));
      setStudentProposals(list);
    }, (error) => {
      console.error("Error loading student proposals:", error);
    });

    return () => {
      unsubRequests();
      unsubProposals();
    };
  }, [user]);

  // 3. Fetch all active student requests & proposals sent by current tutor (for tutors)
  useEffect(() => {
    if (!user || (!isTutorOrTeacher && !isAdmin)) {
      setAllRequestsLoading(false);
      return;
    }

    const activeRequestsQuery = query(collection(db, 'student_tutor_requests'));
    const unsubActiveRequests = onSnapshot(activeRequestsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentTutorRequest));
      setAllActiveRequests(list);
      setAllRequestsLoading(false);
    }, (error) => {
      console.error("Error loading active requests:", error);
      setAllRequestsLoading(false);
    });

    const tutorProposalsQuery = query(collection(db, 'tutor_responses'), where('tutorId', '==', user.id));
    const unsubTutorProposals = onSnapshot(tutorProposalsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TutorResponse));
      setTutorProposals(list);
    }, (error) => {
      console.error("Error loading tutor proposals:", error);
    });

    return () => {
      unsubActiveRequests();
      unsubTutorProposals();
    };
  }, [user, isTutorOrTeacher, isAdmin]);

  // Handle Tutor Application Form (original feature kept)
  const handleTutorApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationDescription || !selectedApplicationFile || !applicationSubjects) {
      setApplicationError('Veuillez remplir tous les champs et sélectionner un fichier.');
      return;
    }

    setIsUploadingApplication(true);
    setApplicationError('');

    try {
      const { url } = await uploadFile(selectedApplicationFile);
      
      await submitTutorApplication(
        applicationDescription, 
        url,
        applicationSubjects.split(',').map(s => s.trim()).filter(Boolean),
        applicationHourlyRates
      );
      
      setShowApplicationForm(false);
      setIsApplicationSubmitted(true);
      setApplicationDescription('');
      toast.success("Votre candidature de répétiteur a été soumise avec succès !");
    } catch (err: any) {
      console.error('Error submitting tutor application:', err);
      setApplicationError(err.message || 'Une erreur est survenue lors de l\'envoi de votre demande.');
    } finally {
      setIsUploadingApplication(false);
    }
  };

  // Student: Create a new Tutor Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSubject || !requestDescription || !requestLocation || !requestPhone) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const requestPayload: Omit<StudentTutorRequest, 'id'> = {
        studentId: user?.id || 'unknown',
        studentName: `${user?.firstName || 'Étudiant'} ${user?.lastName || 'CampusBF'}`,
        studentAvatar: user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
        subject: requestSubject,
        level: requestLevel,
        description: requestDescription,
        budget: Number(requestBudget) || 2000,
        phone: requestPhone,
        location: requestLocation,
        createdAt: new Date().toISOString(),
        status: 'pending',
        proposalsCount: 0
      };

      await addDoc(collection(db, 'student_tutor_requests'), requestPayload);
      toast.success("Votre demande d'aide a été publiée ! Les répétiteurs vont pouvoir y postuler.");
      setShowRequestForm(false);
      
      // Reset fields
      setRequestSubject('');
      setRequestDescription('');
      setRequestLocation('');
      setRequestPhone('');
    } catch (error) {
      console.error("Error creating tutor request:", error);
      toast.error("Une erreur est survenue lors de la création de votre demande.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Tutor: Propose tutoring services to a request
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showProposalForm) return;
    if (!proposalMessage) {
      toast.error("Veuillez saisir un message de motivation.");
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const proposalPayload: Omit<TutorResponse, 'id'> = {
        requestId: showProposalForm.id,
        studentId: showProposalForm.studentId,
        tutorId: user?.id || '',
        tutorName: `${user?.firstName || 'Répétiteur'} ${user?.lastName || 'Qualifié'}`,
        tutorAvatar: user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
        tutorPhone: user?.phone || '',
        tutorHourlyRate: Number(proposalRate) || 2000,
        message: proposalMessage,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'tutor_responses'), proposalPayload);
      
      // Increment proposals count on request
      const requestRef = doc(db, 'student_tutor_requests', showProposalForm.id);
      await updateDoc(requestRef, {
        proposalsCount: increment(1)
      });

      // Send in-app notification to student
      await addDoc(collection(db, 'notifications'), {
        userId: showProposalForm.studentId,
        title: "Nouvelle proposition !",
        message: `${user?.firstName} ${user?.lastName} propose ses services pour votre demande d'aide en ${showProposalForm.subject}.`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      });

      toast.success("Votre proposition a été envoyée avec succès à l'étudiant !");
      setShowProposalForm(null);
      setProposalMessage('');
    } catch (error) {
      console.error("Error submitting tutor proposal:", error);
      toast.error("Impossible d'envoyer votre proposition.");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Student: Accept a tutor proposal
  const handleAcceptProposal = async (proposal: TutorResponse, request: StudentTutorRequest) => {
    try {
      // 1. Update proposal status
      await updateDoc(doc(db, 'tutor_responses', proposal.id), {
        status: 'accepted'
      });

      // 2. Update request status
      await updateDoc(doc(db, 'student_tutor_requests', request.id), {
        status: 'matched'
      });

      // 3. Create a notification for the tutor
      await addDoc(collection(db, 'notifications'), {
        userId: proposal.tutorId,
        title: "Proposition acceptée ! 🎉",
        message: `${request.studentName} a accepté votre proposition pour le cours de ${request.subject}. Vous pouvez dès à présent le contacter par chat ou téléphone.`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      });

      toast.success("Proposition acceptée ! Vous pouvez maintenant contacter votre répétiteur.");
      
      // Redirect directly to messaging with this tutor
      navigate(`/messages?chat=${proposal.tutorId}`);
    } catch (error) {
      console.error("Error accepting proposal:", error);
      toast.error("Une erreur s'est produite lors de l'acceptation.");
    }
  };

  // Student: Decline a tutor proposal
  const handleDeclineProposal = async (proposalId: string) => {
    try {
      await updateDoc(doc(db, 'tutor_responses', proposalId), {
        status: 'declined'
      });
      toast.success("Proposition déclinée.");
    } catch (error) {
      console.error("Error declining proposal:", error);
      toast.error("Erreur de traitement.");
    }
  };

  // Filter tutors list (for non-student users)
  const realTutors: Tutor[] = tutors
    .filter(u => {
      if (isAdmin) return u.tutorStatus && u.tutorStatus !== 'none';
      return u.tutorStatus === 'approved';
    })
    .map(u => ({
      id: u.id,
      userId: u.id,
      user: u,
      subjects: u.tutorSubjects || [],
      hourlyRate: u.tutorHourlyRates?.college || 2000,
      hourlyRates: u.tutorHourlyRates,
      description: u.tutorDescription || '',
      rating: 5.0,
      reviewsCount: 0,
      university: u.university
    }));

  const filteredTutors = realTutors.filter(t => {
    const matchesSearch = `${t.user.firstName} ${t.user.lastName} ${t.university} ${t.description}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    const matchesSubject = selectedSubjectFilter === 'All' || t.subjects.includes(selectedSubjectFilter);
    
    return matchesSearch && matchesSubject;
  });

  // Collect all unique subjects from tutors for the filter dropdown
  const allTutorSubjects = Array.from(
    new Set(realTutors.flatMap(t => t.subjects))
  );

  const renderTutorStatus = () => {
    if (!user) return null;
    if (user.role === 'admin' || user.role === 'parent') return null;

    if (!user.tutorStatus || user.tutorStatus === 'none') {
      const isTeacher = user.role === 'teacher';
      return (
        <div className="glass border-emerald-200/50 p-6 rounded-3xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 shadow-sm bg-gradient-to-r from-emerald-50/20 to-white">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner">
              <GraduationCap size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-900">
                {isTeacher ? 'Proposez vos services de Répétiteur' : 'Devenez Répétiteur sur CampusBF'}
              </h2>
              <p className="text-emerald-800/80 text-sm mt-1 leading-relaxed">
                {isTeacher 
                  ? 'Partagez votre expertise pédagogique officielle avec les étudiants burkinabè et arrondissez vos fins de mois.' 
                  : 'Aide tes camarades du secondaire ou du supérieur, partage tes connaissances et génère des revenus complémentaires stables !'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowApplicationForm(true)}
            className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 whitespace-nowrap active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} />
            Déposer mon dossier de répétiteur
          </button>
        </div>
      );
    }

    if (user.tutorStatus === 'pending' || isApplicationSubmitted) {
      return (
        <div className="glass border-amber-200/50 p-6 rounded-3xl mb-8 flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 bg-amber-50/10">
          <div className="w-14 h-14 bg-amber-100/50 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0 shadow-inner animate-pulse">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-900">Candidature Répétiteur en cours d'examen</h2>
            <p className="text-amber-800/80 text-sm mt-1 leading-relaxed">Ton dossier académique burkinabè est en cours d'audit et de vérification d'antécédents par notre comité pédagogique. Tu recevras une notification push/email sous 24-48h.</p>
          </div>
        </div>
      );
    }

    if (user.tutorStatus === 'rejected') {
      return (
        <div className="glass border-red-200/50 p-6 rounded-3xl mb-8 flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 bg-red-50/10">
          <div className="w-14 h-14 bg-red-100/50 rounded-2xl flex items-center justify-center text-red-600 flex-shrink-0 shadow-inner">
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-900">Candidature Répétiteur refusée</h2>
            <p className="text-red-800/80 text-sm mt-1 leading-relaxed">Malheureusement, tes pièces justificatives ou ton profil n'ont pas satisfait nos critères de qualité académique d'excellence. Tu peux contacter le support CampusBF pour en savoir plus.</p>
          </div>
        </div>
      );
    }

    if (user.tutorStatus === 'approved') {
      return (
        <div className="glass border-emerald-200/50 p-6 rounded-3xl mb-8 flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 bg-emerald-50/10">
          <div className="w-14 h-14 bg-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-emerald-900">Profil Répétiteur Agréé & Actif 👑</h2>
            <p className="text-emerald-800/80 text-sm mt-1 leading-relaxed">Félicitations ! Tu es officiellement validé comme Répétiteur Agréé CampusBF. Tu es visible par nos partenaires et tu peux postuler aux demandes de soutien des étudiants ci-dessous.</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const createMockTutor = async () => {
    try {
      const mockId = 'mock-tutor-' + Date.now();
      const mockUser = {
        id: mockId,
        firstName: 'Inoussa',
        lastName: 'Ouedraogo',
        email: `inoussa.tutor.${Date.now()}@example.com`,
        university: 'Université Joseph Ki-Zerbo',
        major: 'Physique-Chimie',
        level: 'Master 1',
        role: 'tutor',
        tutorStatus: 'approved',
        tutorSubjects: ['Physique', 'Mathématiques', 'Chimie'],
        tutorHourlyRates: {
          college: 2000,
          lycee: 2500,
          licence: 3500,
          master: 4500
        },
        tutorDescription: 'Étudiant rigoureux en Master de Physique-Chimie. J\'ai 3 ans d\'expérience dans le soutien scolaire pour lycéens préparant le BAC D/C à Ouagadougou.',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockId}`,
        phone: '+226 70 00 00 00',
        city: 'Ouagadougou',
        neighborhood: 'Zogona'
      };
      
      await setDoc(doc(db, 'users', mockId), mockUser);
      toast.success('Répétiteur de test créé avec succès !');
      // Refresh local tutors state
      setTutors(prev => [mockUser as User, ...prev]);
    } catch (error) {
      console.error('Error creating mock tutor:', error);
      toast.error('Erreur lors de la création du répétiteur de test.');
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-emerald-600" />
            Soutien Scolaire & Académique
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm leading-relaxed max-w-2xl">
            {isStudent 
              ? "Formulez vos besoins pédagogiques précis. Recevez des propositions d'étudiants de grandes écoles et d'enseignants burkinabè, puis discutez par chat."
              : "Consultez l'annuaire des répétiteurs officiels agréés et suivez les demandes d'aide active des étudiants du Burkina Faso."
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <button 
              onClick={createMockTutor}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 active:scale-95"
            >
              Créer un répétiteur de test (Admin)
            </button>
          )}

          {isStudent && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs tracking-wide shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Publier une demande d'aide
            </button>
          )}
        </div>
      </div>

      {renderTutorStatus()}

      {/* Tabs Switcher (Visible to Admins, Parents, Tutors, Teachers, Alumni but hidden for Students because students can only see their requests) */}
      {!isStudent && (
        <div className="flex border-b border-gray-200 gap-4 mb-6">
          <button
            onClick={() => setActiveTab('tutors-list')}
            className={cn(
              "pb-4 text-sm font-bold tracking-wide border-b-2 transition-all px-2",
              activeTab === 'tutors-list'
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            Annuaire des Répétiteurs
          </button>
          <button
            onClick={() => setActiveTab('student-requests')}
            className={cn(
              "pb-4 text-sm font-bold tracking-wide border-b-2 transition-all px-2 flex items-center gap-2",
              activeTab === 'student-requests'
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            )}
          >
            Demandes d'étudiants
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">
              {allActiveRequests.filter(r => r.status === 'pending').length} actives
            </span>
          </button>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB: TUTORS LIST (Hidden for students) */}
      {/* ========================================================== */}
      {activeTab === 'tutors-list' && !isStudent && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher par nom, matière, université..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            
            {allTutorSubjects.length > 0 && (
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-gray-700 min-w-[150px]"
              >
                <option value="All">Toutes les matières</option>
                {allTutorSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}
          </div>

          {/* Tutors Grid */}
          {tutorsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              <p className="mt-3 text-xs font-semibold">Chargement de l'annuaire des répétiteurs...</p>
            </div>
          ) : filteredTutors.length === 0 ? (
            <div className="text-center py-16 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">Aucun répétiteur trouvé</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Modifiez vos critères de recherche ou devenez le premier répétiteur de cette spécialité !
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTutors.map((tutor) => (
                <div key={tutor.id} className="glass p-6 rounded-3xl border border-white/40 shadow-sm hover:shadow-xl hover:border-emerald-200/50 transition-all duration-300 group flex flex-col h-full bg-white/70">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={tutor.user.avatarUrl} alt={tutor.user.firstName} className="w-16 h-16 rounded-2xl bg-slate-100 object-cover ring-4 ring-white shadow-sm group-hover:ring-emerald-50 transition-all" />
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
                          <CheckCircle size={12} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">{tutor.user.firstName} {tutor.user.lastName}</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{tutor.user.major}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <button 
                        onClick={() => setRatingModal(tutor.id)}
                        className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-200/30"
                      >
                        <Star size={12} fill="currentColor" />
                        {tutor.rating}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 mb-5 leading-relaxed flex-grow italic">
                    "{tutor.description}"
                  </p>

                  <div className="mb-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Matières enseignées</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {tutor.subjects.map((sub) => (
                        <span key={sub} className="px-2 py-1 bg-gray-50 border border-gray-150 text-slate-700 text-[10px] rounded-lg font-semibold group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-100 transition-colors shadow-sm">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="font-medium">{tutor.university}</span>
                    </div>
                    {(tutor.user.city || tutor.user.neighborhood) && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} className="text-slate-400 opacity-0" /> {/* Spacer */}
                        <span className="text-gray-500 font-semibold text-[11px]">
                          {[tutor.user.city, tutor.user.neighborhood].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                    {tutor.hourlyRates ? (() => {
                      const rates = Object.values(tutor.hourlyRates).filter(v => typeof v === 'number' && v > 0) as number[];
                      const minRate = rates?.length ? Math.min(...rates) : 0;
                      const maxRate = rates?.length ? Math.max(...rates) : 0;
                      return (
                        <div className="flex flex-col">
                          <span className="font-extrabold text-emerald-700 text-base tracking-tight">
                            {minRate} - {maxRate}
                            <span className="text-[10px] font-bold text-slate-500 ml-1">CFA/h</span>
                          </span>
                        </div>
                      );
                    })() : (
                      <span className="font-black text-emerald-700 text-base tracking-tight">{tutor.hourlyRate} <span className="text-xs font-semibold text-slate-500">CFA/h</span></span>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => navigate(`/messages?chat=${tutor.user.id}`)}
                        className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors bg-white shadow-xs"
                        title="Envoyer un message"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/messages?chat=${tutor.user.id}`)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                      >
                        Réserver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB / SECTION: PORTAIL DES DEMANDES DE SOUTIEN (STUDENT WORKSPACE) */}
      {/* ========================================================== */}
      {activeTab === 'student-requests' && (
        <div className="space-y-8">
          {/* ----------------- FOR STUDENTS ----------------- */}
          {isStudent && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <h2 className="text-xl sm:text-2xl font-black">Besoin d'aide pour tes cours au Burkina ? 🇧🇫</h2>
                  <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
                    Ne reste pas bloqué sur tes TD, devoirs ou révisions de BAC/Examens. Publie une demande détaillée de répétiteur et laisse les enseignants et répétiteurs agréés te proposer leurs services.
                  </p>
                </div>
                <button
                  onClick={() => setShowRequestForm(true)}
                  className="px-6 py-4 bg-white text-emerald-800 rounded-2xl font-extrabold text-xs tracking-wider uppercase hover:bg-emerald-50 transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 stroke-[3px]" />
                  Créer ma demande d'aide
                </button>
              </div>

              {/* List of Student's own requests */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  Mes Demandes Actives ({studentRequests.length})
                </h3>

                {studentRequestsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 animate-duration-1000" />
                    <p className="mt-3 text-xs">Chargement de tes demandes...</p>
                  </div>
                ) : studentRequests.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <h4 className="text-xs font-bold text-gray-700">Aucune demande publiée pour le moment</h4>
                    <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                      Tu n'as pas encore créé de demande de soutien. Clique sur le bouton ci-dessus pour exprimer tes besoins d'études.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {studentRequests.map((req) => {
                      const reqProposals = studentProposals.filter(p => p.requestId === req.id);
                      
                      return (
                        <div key={req.id} className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                          {/* Request Top Section */}
                          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                  {req.subject}
                                </span>
                                <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  Niveau : {req.level}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
                                  req.status === 'pending' ? "bg-amber-100 text-amber-800" :
                                  req.status === 'matched' ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"
                                )}>
                                  {req.status === 'pending' ? "En attente d'offres" :
                                   req.status === 'matched' ? "Répétiteur trouvé ! 🎉" : "Clôturé"}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-950 leading-relaxed pt-1">
                                {req.description}
                              </h4>
                              
                              {/* Meta Details */}
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-gray-500 pt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} className="text-gray-400" />
                                  {req.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone size={12} className="text-gray-400" />
                                  {req.phone}
                                </span>
                                <span className="flex items-center gap-1 font-bold text-emerald-700">
                                  Budget: {req.budget} CFA/h max
                                </span>
                                <span className="text-gray-400">
                                  Publié le {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Request Proposals List */}
                          <div className="bg-gray-50/50 p-5 sm:p-6 space-y-4">
                            <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                              <Users className="h-4 w-4 text-emerald-600" />
                              Propositions des Répétiteurs ({reqProposals.length})
                            </h5>

                            {reqProposals.length === 0 ? (
                              <p className="text-xs text-gray-500 italic py-2">
                                Aucune proposition reçue pour l'instant. Les répétiteurs qualifiés étudient votre demande.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {reqProposals.map((proposal) => (
                                  <div key={proposal.id} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row items-start justify-between gap-4 transition-all hover:border-emerald-200">
                                    <div className="flex items-start gap-3">
                                      <img 
                                        src={proposal.tutorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${proposal.tutorId}`} 
                                        alt={proposal.tutorName} 
                                        className="w-10 h-10 rounded-xl bg-gray-100 border object-cover shrink-0" 
                                      />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-xs text-gray-900">{proposal.tutorName}</span>
                                          {proposal.status === 'accepted' && (
                                            <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                              Acceptée !
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                          {proposal.message}
                                        </p>
                                        <div className="flex items-center gap-4 text-[10px] text-gray-500 mt-2">
                                          <span className="font-bold text-emerald-700">Tarif proposé : {proposal.tutorHourlyRate} CFA/h</span>
                                          {proposal.tutorPhone && <span>Tél : {proposal.tutorPhone}</span>}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action buttons on Proposal */}
                                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                      {proposal.status === 'pending' && req.status === 'pending' && (
                                        <>
                                          <button
                                            onClick={() => handleDeclineProposal(proposal.id)}
                                            className="px-3 py-1.5 border border-gray-200 hover:border-red-200 hover:text-red-700 text-gray-600 rounded-lg text-[10px] font-bold transition-all"
                                          >
                                            Décliner
                                          </button>
                                          <button
                                            onClick={() => handleAcceptProposal(proposal, req)}
                                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all"
                                          >
                                            Accepter
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => navigate(`/messages?chat=${proposal.tutorId}`)}
                                        className="p-2 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-500 rounded-lg border border-gray-150 transition-all"
                                        title="Lancer la discussion par chat"
                                      >
                                        <MessageCircle size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------- FOR TUTORS / TEACHERS (TO VIEW STUDENT REQUESTS) ----------------- */}
          {!isStudent && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  Demandes actives d'élèves & étudiants ({allActiveRequests.filter(r => r.status === 'pending').length})
                </h3>
              </div>

              {allRequestsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  <p className="mt-3 text-xs">Recherche de demandes d'élèves...</p>
                </div>
              ) : allActiveRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="text-center py-16 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-xs font-bold text-gray-700">Aucune demande active disponible</h4>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Il n'y a pas de demande active en attente de répétiteur pour le moment. Revenez bientôt pour trouver de nouveaux étudiants !
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {allActiveRequests
                    .filter(req => req.status === 'pending')
                    .map((req) => {
                      const hasApplied = tutorProposals.some(p => p.requestId === req.id);
                      const myAppliedProposal = tutorProposals.find(p => p.requestId === req.id);

                      return (
                        <div key={req.id} className="bg-white border border-gray-150 hover:border-emerald-200 rounded-2xl p-5 sm:p-6 transition-all shadow-xs flex flex-col md:flex-row items-start justify-between gap-6">
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                {req.subject}
                              </span>
                              <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                Niveau : {req.level}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                Publié par {req.studentName}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 leading-relaxed pt-1.5">
                              "{req.description}"
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-500 pt-1.5">
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-gray-400" />
                                {req.location}
                              </span>
                              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Budget max : {req.budget} CFA/heure
                              </span>
                              <span className="text-gray-400">
                                {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>

                          {/* Action for Tutor */}
                          <div className="shrink-0 w-full md:w-auto flex flex-col sm:flex-row md:flex-col items-stretch md:items-end gap-2.5">
                            {hasApplied ? (
                              <div className="text-right space-y-1.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider",
                                  myAppliedProposal?.status === 'accepted' ? "bg-emerald-100 text-emerald-800" :
                                  myAppliedProposal?.status === 'declined' ? "bg-red-100 text-red-800" :
                                  "bg-amber-100 text-amber-800"
                                )}>
                                  {myAppliedProposal?.status === 'accepted' ? "Proposition acceptée !" :
                                   myAppliedProposal?.status === 'declined' ? "Déclinée" : "Proposition envoyée"}
                                </span>
                                <p className="text-[10px] text-gray-500 font-bold">
                                  Votre tarif proposé : {myAppliedProposal?.tutorHourlyRate} CFA/h
                                </p>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowProposalForm(req)}
                                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all text-center"
                              >
                                Proposer mes services
                              </button>
                            )}
                            
                            <button
                              onClick={() => navigate(`/messages?chat=${req.studentId}`)}
                              className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                            >
                              <MessageCircle size={14} />
                              Contacter l'étudiant
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: CREATE TUTOR REQUEST FORM (STUDENTS) */}
      {/* ========================================================== */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowRequestForm(false)} />
          <div className="glass relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
            <div className="p-6 border-b border-gray-150 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Demande d'aide pédagogique</h3>
                <p className="text-xs text-slate-500 mt-1">Explique ton besoin pour que les répétiteurs t'envoient des propositions adaptées.</p>
              </div>
              <button onClick={() => setShowRequestForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Matière *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mathématiques, Physique..."
                    value={requestSubject}
                    onChange={(e) => setRequestSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Niveau d'études *</label>
                  <select
                    value={requestLevel}
                    onChange={(e) => setRequestLevel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-gray-700"
                  >
                    <option value="Primaire">Primaire</option>
                    <option value="Collège">Collège</option>
                    <option value="Lycée">Lycée (2nde, 1ère, Tle)</option>
                    <option value="Université (L1/L2)">Université (L1 / L2)</option>
                    <option value="Université (L3/M1)">Université (L3 / M1)</option>
                    <option value="Université (M2/Doctorat)">Université (M2 / Doctorat)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description détaillée du besoin *</label>
                <textarea
                  required
                  placeholder="Ex: J'ai des difficultés sur le chapitre des limites et intégrales en Terminale D. Je recherche un prof patient pour 2h de cours par semaine, de préférence les samedis soirs pour travailler les exercices officiels du BAC..."
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all h-28 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Budget max consenti (CFA/heure) *</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="500"
                    placeholder="Ex: 2500"
                    value={requestBudget}
                    onChange={(e) => setRequestBudget(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Zone géo / Ville / Quartier *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ouagadougou, Zogona"
                    value={requestLocation}
                    onChange={(e) => setRequestLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Téléphone de contact *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: +226 70 00 00 00"
                  value={requestPhone}
                  onChange={(e) => setRequestPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingRequest}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSubmittingRequest ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Publication en cours...
                  </>
                ) : (
                  'Publier ma demande de soutien'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: SUBMIT TUTOR PROPOSAL FORM (TUTORS) */}
      {/* ========================================================== */}
      {showProposalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowProposalForm(null)} />
          <div className="glass relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
            <div className="p-6 border-b border-gray-150 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Proposer mes services de répétiteur</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Postulez à la demande d'aide en <strong className="text-slate-800">{showProposalForm.subject}</strong> de {showProposalForm.studentName}.
                </p>
              </div>
              <button onClick={() => setShowProposalForm(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Votre tarif horaire proposé (CFA/heure) *</label>
                <input
                  type="number"
                  required
                  min="500"
                  step="250"
                  placeholder="Ex: 2000"
                  value={proposalRate}
                  onChange={(e) => setProposalRate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <p className="text-[10px] text-gray-500 font-semibold">Budget maximum indiqué par l'étudiant : {showProposalForm.budget} CFA/h</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Message de motivation & Présentation *</label>
                <textarea
                  required
                  placeholder="Ex: Bonjour ! Je suis étudiant en 3ème année de Mathématiques à Joseph Ki-Zerbo. J'ai vu vos difficultés sur les intégrales et j'ai une méthodologie simple pour vous aider à débloquer le cours rapidement. Je serai disponible aux heures indiquées pour vous accompagner..."
                  value={proposalMessage}
                  onChange={(e) => setProposalMessage(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all h-36 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingProposal}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSubmittingProposal ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer ma proposition de soutien'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: REGISTER TUTOR APPLICATION (ORIGINAL REGISTER FEATURES KEPT) */}
      {/* ========================================================== */}
      {showApplicationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowApplicationForm(false)} />
          <div className="glass relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-150 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Demande de statut Répétiteur Agréé</h2>
                <p className="text-slate-500 text-xs mt-1">Remplissez le formulaire de compétences pour être répertorié officiellement.</p>
              </div>
              <button onClick={() => setShowApplicationForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white">
              <form onSubmit={handleTutorApply} className="space-y-4">
                {applicationError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    {applicationError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Matières enseignées (séparées par des virgules) *</label>
                  <input 
                    type="text"
                    required
                    value={applicationSubjects}
                    onChange={(e) => setApplicationSubjects(e.target.value)}
                    placeholder="Ex: Mathématiques, Physique, Allemand, Informatique"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Taux horaires souhaités (CFA/heure)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block font-semibold">Collège</label>
                      <input 
                        type="number"
                        min="0"
                        value={applicationHourlyRates.college}
                        onChange={(e) => setApplicationHourlyRates({...applicationHourlyRates, college: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block font-semibold">Lycée</label>
                      <input 
                        type="number"
                        min="0"
                        value={applicationHourlyRates.lycee}
                        onChange={(e) => setApplicationHourlyRates({...applicationHourlyRates, lycee: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block font-semibold">Licence</label>
                      <input 
                        type="number"
                        min="0"
                        value={applicationHourlyRates.licence}
                        onChange={(e) => setApplicationHourlyRates({...applicationHourlyRates, licence: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 mb-1 block font-semibold">Master</label>
                      <input 
                        type="number"
                        min="0"
                        value={applicationHourlyRates.master}
                        onChange={(e) => setApplicationHourlyRates({...applicationHourlyRates, master: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Description de votre parcours et méthodologie *</label>
                  <textarea 
                    required
                    value={applicationDescription}
                    onChange={(e) => setApplicationDescription(e.target.value)}
                    placeholder="Détaillez vos diplômes burkinabè, vos expériences de cours de maison passées, vos méthodes de révision..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all h-28 resize-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Dossier académique (Diplômes, Relevés, CV regroupés en un PDF) *</label>
                  <div className={cn(
                    "border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-gray-50",
                    selectedApplicationFile ? "border-emerald-500 bg-emerald-50/20" : "border-gray-250 hover:border-emerald-400 hover:bg-white"
                  )}>
                    <input 
                      type="file" 
                      id="tutor-docs" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedApplicationFile(e.target.files[0]);
                        }
                      }}
                      accept=".pdf"
                    />
                    <label htmlFor="tutor-docs" className="cursor-pointer flex flex-col items-center gap-2">
                      <div className={cn(
                        "w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-colors",
                        selectedApplicationFile ? "bg-emerald-100" : "bg-slate-100"
                      )}>
                        <FileUp size={24} className={selectedApplicationFile ? "text-emerald-600" : "text-slate-400"} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {selectedApplicationFile ? selectedApplicationFile.name : "Cliquez pour déposer votre fichier justificatif (PDF)"}
                      </span>
                      <span className="text-[10px] text-slate-500">Un document unique PDF de max 5MB</span>
                    </label>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100/50 p-4 rounded-2xl text-xs text-emerald-800 flex gap-2.5">
                  <AlertCircle className="text-emerald-500 shrink-0" size={16} />
                  <div>
                    <p className="font-bold mb-0.5">Note importante de déontologie</p>
                    <p className="leading-relaxed">Afin de conserver un niveau académique irréprochable au Burkina, CampusBF validera de manière stricte chaque diplôme d'État.</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t">
                  <button 
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    className="flex-1 py-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploadingApplication}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploadingApplication ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      'Envoyer mon dossier de candidature'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: SUBMIT RATING (ORIGINAL RATING FEATURES KEPT) */}
      {/* ========================================================== */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setRatingModal(null)} />
          <div className="glass relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Noter ce répétiteur</h3>
              <button onClick={() => setRatingModal(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex justify-center gap-2.5 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => { toast.success(`Vous avez noté ${star} étoiles !`); setRatingModal(null); }} className="text-slate-300 hover:text-amber-400 transition-colors hover:scale-110 active:scale-95">
                  <Star size={32} fill="currentColor" />
                </button>
              ))}
            </div>
            
            <textarea 
              placeholder="Laissez un commentaire (optionnel)..." 
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none h-24 transition-all"
            />
            
            <button 
              onClick={() => { toast.success("Merci pour votre avis !"); setRatingModal(null); }}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-xs"
            >
              Envoyer la note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
