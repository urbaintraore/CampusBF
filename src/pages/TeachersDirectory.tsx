import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Filter, MapPin, GraduationCap, BookOpen, Clock, Star, Mail, 
  CheckCircle2, Briefcase, Phone, X, MessageSquare, Send, Sparkles, 
  UserCheck, Shield, ExternalLink, Calendar, DollarSign, MessageCircle, 
  AlertCircle, Plus, Eye, Award, Check, ChevronRight, User as UserIcon,
  Building2, Users, FileText
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { User, TalentProfile, TalentCategory, TalentConsultationRequest } from '@/types';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  doc, setDoc, increment, where, limit, getDocs, updateDoc 
} from 'firebase/firestore';

// Default mock profiles for rich initial display if Firestore has few profiles
const SAMPLE_TALENTS: Partial<User>[] = [
  {
    id: 'talent-prof-1',
    firstName: 'Dr. Idrissa',
    lastName: 'OUÉDRAOGO',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    university: 'Université Joseph Ki-Zerbo (UJKZ)',
    role: 'teacher',
    city: 'Ouagadougou',
    phone: '+226 70 12 34 56',
    teacherProfile: {
      academicRank: 'Maître de Conférences',
      biography: 'Enseignant-chercheur en Informatique et Intelligence Artificielle à l’UFR-SEA. Plus de 12 ans d’expérience en enseignement universitaire et consulting en transformation digitale.',
      yearsOfExperience: 14,
      languages: ['Français', 'Anglais', 'Mooré'],
      specialties: ['Intelligence Artificielle', 'Data Science', 'Génie Logiciel', 'Systèmes Distribués'],
      domains: ['Informatique & Numérique', 'Sciences & Technologies'],
      courses: ['Algorithmique avancée', 'Bases de Données', 'Apprentissage Automatique'],
      publications: [
        { title: 'IA et optimisation des réseaux de télécommunication au Sahel', journal: 'Revue Africaine d’Informatique', year: '2023' },
        { title: 'Systèmes décisionnels pour l’agriculture burkinabè', journal: 'CAMES Sciences Appliquées', year: '2021' }
      ],
      availability: {
        isAvailable: true,
        preferredContract: 'Vacation',
        willingToTravel: true
      }
    },
    talentProfile: {
      category: 'teacher',
      headline: 'Enseignant-Chercheur en IA & Consultant Transformation Digitale',
      bio: 'Enseignant-chercheur à l’Université Joseph Ki-Zerbo. Disponible pour des vacations en Master/Doctorat, conférences académiques et missions d’expertise technique pour entreprises.',
      domains: ['Informatique & Numérique', 'Sciences & Technologies'],
      skills: ['Python', 'Machine Learning', 'Big Data', 'Génie Logiciel', 'Architecture Cloud'],
      servicesOffered: ['Vacation universitaire', 'Consultation Entreprise', 'Conférence / Panel', 'Encadrement de mémoires'],
      hourlyRate: 25000,
      consultationRateText: '25 000 FCFA / heure (ou forfait mission)',
      courses: ['Intelligence Artificielle', 'Systèmes Distribués', 'Gestion de Projets IT'],
      academicRank: 'Maître de Conférences',
      yearsOfExperience: 14,
      city: 'Ouagadougou',
      universityOrOrg: 'Université Joseph Ki-Zerbo (UFR-SEA)',
      phone: '+226 70 12 34 56',
      whatsapp: '+226 70 12 34 56',
      availability: {
        isAvailable: true,
        preferredContract: 'Vacation & Mission',
        willingToTravel: true,
        remoteAvailable: true
      },
      rating: 4.9,
      reviewsCount: 18,
      isVerified: true
    }
  },
  {
    id: 'talent-alumni-1',
    firstName: 'Aminata',
    lastName: 'KABORE',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    university: 'Alumni 2iE / Lead Data Engineer chez Telco',
    role: 'alumni',
    city: 'Ouagadougou',
    phone: '+226 76 99 88 77',
    talentProfile: {
      category: 'alumni',
      headline: 'Lead Data Engineer & Mentor Carrière Tech',
      bio: 'Diplômée de 2iE, aujourd’hui Lead Data Engineer avec 8 ans d’expérience en télécoms et fintechs. J’accompagne les entreprises sur leurs architectures data et mentore les jeunes talents burkinabè.',
      domains: ['Informatique & Numérique', 'Télécoms & Réseaux'],
      skills: ['Data Engineering', 'SQL & Spark', 'Cloud AWS/GCP', 'Mentorat CV & Carrière', 'Python'],
      servicesOffered: ['Consultation Entreprise', 'Mentorat carrière', 'Audit & Étude', 'Formation en entreprise'],
      hourlyRate: 20000,
      consultationRateText: '20 000 FCFA / séance d’1h30',
      yearsOfExperience: 8,
      city: 'Ouagadougou (Zone 1)',
      universityOrOrg: 'Alumni 2iE / Senior Data Lead',
      phone: '+226 76 99 88 77',
      whatsapp: '+226 76 99 88 77',
      availability: {
        isAvailable: true,
        preferredContract: 'Mission & Coaching',
        willingToTravel: false,
        remoteAvailable: true
      },
      rating: 5.0,
      reviewsCount: 12,
      isVerified: true
    }
  },
  {
    id: 'talent-student-1',
    firstName: 'Moussa',
    lastName: 'SANOU',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    university: 'Université Nazi Boni (UNB)',
    role: 'student',
    city: 'Bobo-Dioulasso',
    phone: '+226 65 44 33 22',
    talentProfile: {
      category: 'student',
      headline: 'Étudiant Master 1 Mathématiques - Tuteur d’Excellence & Prépa BAC/Concours',
      bio: 'Major de promotion en Licence de Mathématiques à l’Université Nazi Boni. Passionné par la pédagogie, je donne des cours de soutien à domicile et en ligne pour lycéens (Seconde à Terminale C/D) et prépa concours.',
      domains: ['Mathématiques', 'Sciences & Technologies'],
      skills: ['Algèbre', 'Analyse & Calcul Différentiel', 'Physique-Chimie BAC', 'Méthodologie d’examen'],
      servicesOffered: ['Cours de soutien / Maison', 'Préparation Concours Directs', 'Aide aux devoirs'],
      hourlyRate: 5000,
      consultationRateText: '5 000 FCFA / heure (Forfait mensuel possible)',
      yearsOfExperience: 3,
      city: 'Bobo-Dioulasso (Accart-Ville)',
      universityOrOrg: 'Université Nazi Boni',
      phone: '+226 65 44 33 22',
      whatsapp: '+226 65 44 33 22',
      availability: {
        isAvailable: true,
        preferredContract: 'Cours particuliers',
        willingToTravel: true,
        remoteAvailable: true
      },
      rating: 4.8,
      reviewsCount: 24,
      isVerified: true
    }
  },
  {
    id: 'talent-prof-2',
    firstName: 'Pr. Salif',
    lastName: 'TRAORÉ',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    university: 'Université Thomas Sankara (UTS)',
    role: 'teacher',
    city: 'Ouagadougou',
    phone: '+226 78 55 44 33',
    teacherProfile: {
      academicRank: 'Professeur Titulaire',
      biography: 'Professeur Titulaire d’Économie du Développement et Politiques Publiques à l’UTS. Consultant international auprès des institutions financières et ministères.',
      yearsOfExperience: 22,
      languages: ['Français', 'Anglais'],
      specialties: ['Macroéconomie', 'Économétrie', 'Finances Publiques', 'Politiques Agricoles'],
      domains: ['Économie & Gestion', 'Droit & Sciences Politiques'],
      courses: ['Économétrie appliquée', 'Économie monétaire', 'Méthodologie de la recherche'],
      publications: [
        { title: 'Résilience économique et inclusion financière au Burkina Faso', journal: 'Cahiers Économiques de l’UEMOA', year: '2024' }
      ],
      availability: {
        isAvailable: true,
        preferredContract: 'CDD',
        willingToTravel: true
      }
    },
    talentProfile: {
      category: 'teacher',
      headline: 'Professeur Titulaire en Économie & Consultant Politiques Publiques',
      bio: 'Enseignant de rang magistral à l’Université Thomas Sankara. Disponible pour des missions d’audit, études d’impact économique, jurys de thèse et conférences ministérielles / universitaires.',
      domains: ['Économie & Gestion', 'Droit & Sciences Politiques'],
      skills: ['Économétrie', 'Analyse Financière', 'Politiques Publiques', 'Audit & Évaluation', 'Études d’impact'],
      servicesOffered: ['Consultation Entreprise', 'Vacation universitaire', 'Conférence / Panel', 'Audit & Étude'],
      hourlyRate: 35000,
      consultationRateText: 'Sur devis / 35 000 FCFA heure',
      courses: ['Économétrie', 'Économie du développement', 'Finances Publiques'],
      academicRank: 'Professeur Titulaire',
      yearsOfExperience: 22,
      city: 'Ouagadougou (Ouaga 2000)',
      universityOrOrg: 'Université Thomas Sankara',
      phone: '+226 78 55 44 33',
      whatsapp: '+226 78 55 44 33',
      availability: {
        isAvailable: true,
        preferredContract: 'Expertise & Mission',
        willingToTravel: true,
        remoteAvailable: true
      },
      rating: 5.0,
      reviewsCount: 31,
      isVerified: true
    }
  },
  {
    id: 'talent-parent-1',
    firstName: 'Fatoumata',
    lastName: 'COMPAORÉ',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    university: 'Directrice RH & Coach Parental d’Orientation',
    role: 'parent',
    city: 'Ouagadougou',
    phone: '+226 71 22 33 44',
    talentProfile: {
      category: 'parent',
      headline: 'DRH, Mère d’étudiants & Coach en Orientation Scolaire & Carrière',
      bio: 'Plus de 15 ans d’expérience en gestion des ressources humaines et recrutement au Burkina Faso. J’accompagne les parents et les élèves post-BAC pour choisir la bonne filière et réussir leurs entretiens de stage.',
      domains: ['Ressources Humaines & Coaching', 'Orientation & Conseil'],
      skills: ['Orientation Post-BAC', 'Préparation Entretien', 'Relecture CV & LM', 'Coaching Parental'],
      servicesOffered: ['Orientation & Choix de filière', 'Mentorat carrière', 'Conférence / Panel', 'Atelier RH'],
      hourlyRate: 15000,
      consultationRateText: '15 000 FCFA / séance d’orientation',
      yearsOfExperience: 16,
      city: 'Ouagadougou (Kalgondin)',
      universityOrOrg: 'Cabinet d’Orientation & RH Burkinabè',
      phone: '+226 71 22 33 44',
      whatsapp: '+226 71 22 33 44',
      availability: {
        isAvailable: true,
        preferredContract: 'Séance individuelle & Atelier',
        willingToTravel: true,
        remoteAvailable: true
      },
      rating: 4.9,
      reviewsCount: 15,
      isVerified: true
    }
  }
];

export default function TeachersDirectory() {
  const { user, isAdmin, updateUser } = useAuth();
  
  // State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('Tous');
  const [serviceFilter, setServiceFilter] = useState('Tous');
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [cityFilter, setCityFilter] = useState('Tous');

  // Modals
  const [selectedTalent, setSelectedTalent] = useState<User | null>(null);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [talentForConsultation, setTalentForConsultation] = useState<User | null>(null);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showMyConsultationsModal, setShowMyConsultationsModal] = useState(false);

  // Reviews for selected talent
  const [talentReviews, setTalentReviews] = useState<any[]>([]);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Consultation request form state
  const [consultationForm, setConsultationForm] = useState({
    requesterName: user ? `${user.firstName} ${user.lastName}` : '',
    requesterEmail: user?.email || '',
    requesterPhone: user?.phone || '',
    requesterRole: (user?.role || 'parent') as any,
    requesterOrg: user?.companyName || user?.university || '',
    consultationType: 'tutoring' as any,
    subject: '',
    message: '',
    preferredDate: '',
    proposedBudget: ''
  });
  const [submittingConsultation, setSubmittingConsultation] = useState(false);

  // My received & sent consultations
  const [myConsultations, setMyConsultations] = useState<TalentConsultationRequest[]>([]);

  // Profile Edit Form State
  const [profileForm, setProfileForm] = useState<Partial<TalentProfile>>({
    category: (user?.role === 'teacher' ? 'teacher' : user?.role === 'alumni' ? 'alumni' : user?.role === 'parent' ? 'parent' : 'student') as TalentCategory,
    headline: user?.talentProfile?.headline || (user?.teacherProfile ? `${user.teacherProfile.academicRank} en ${user.teacherProfile.domains?.[0] || 'Enseignement'}` : ''),
    bio: user?.talentProfile?.bio || user?.teacherProfile?.biography || user?.bio || '',
    domains: user?.talentProfile?.domains || user?.teacherProfile?.domains || (user?.major ? [user.major] : ['Informatique & Numérique']),
    skills: user?.talentProfile?.skills || user?.skills || (user?.teacherProfile?.specialties || []),
    servicesOffered: user?.talentProfile?.servicesOffered || ['Vacation universitaire', 'Cours de soutien / Maison', 'Consultation Entreprise'],
    hourlyRate: user?.talentProfile?.hourlyRate || (user?.teacherProfile ? 20000 : 5000),
    consultationRateText: user?.talentProfile?.consultationRateText || '',
    academicRank: user?.talentProfile?.academicRank || user?.teacherProfile?.academicRank || '',
    yearsOfExperience: user?.talentProfile?.yearsOfExperience || user?.teacherProfile?.yearsOfExperience || 1,
    city: user?.talentProfile?.city || user?.city || 'Ouagadougou',
    universityOrOrg: user?.talentProfile?.universityOrOrg || user?.university || '',
    phone: user?.talentProfile?.phone || user?.phone || '',
    whatsapp: user?.talentProfile?.whatsapp || user?.phone || '',
    availability: {
      isAvailable: user?.talentProfile?.availability?.isAvailable ?? true,
      preferredContract: 'Vacation / Mission',
      willingToTravel: true,
      remoteAvailable: true
    }
  });
  const [newSkillInput, setNewSkillInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Load Talents from Firestore + fallback sample
  useEffect(() => {
    const fetchTalents = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(query(usersRef, limit(100)));
        const list: User[] = [];
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as User;
          const u = { id: docSnap.id, ...data };
          // If the user has talentProfile OR teacherProfile OR tutorSubjects, consider them a talent
          if (u.talentProfile || u.teacherProfile || u.role === 'teacher' || (u.skills && u.skills.length > 0)) {
            list.push(u);
          }
        });

        // Merge with sample talents for high visual completeness if needed
        const existingIds = new Set(list.map(u => u.id));
        const combined = [...list];
        SAMPLE_TALENTS.forEach(sample => {
          if (!existingIds.has(sample.id!)) {
            combined.push(sample as User);
          }
        });

        setUsersList(combined);
      } catch (error) {
        console.error("Error fetching talents:", error);
        setUsersList(SAMPLE_TALENTS as User[]);
      } finally {
        setLoading(false);
      }
    };

    fetchTalents();
  }, []);

  // Fetch reviews for selected talent
  useEffect(() => {
    if (selectedTalent) {
      const q = query(collection(db, 'users', selectedTalent.id, 'reviews'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        setTalentReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        console.warn("Reviews load warning:", err);
      });
      return () => unsub();
    } else {
      setTalentReviews([]);
    }
  }, [selectedTalent]);

  // Fetch consultations for current user (sent or received)
  useEffect(() => {
    if (!user) return;
    const fetchConsultations = async () => {
      try {
        const q1 = query(collection(db, 'talent_consultations'), where('talentId', '==', user.id));
        const q2 = query(collection(db, 'talent_consultations'), where('requesterId', '==', user.id));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const map = new Map<string, TalentConsultationRequest>();
        
        snap1.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as TalentConsultationRequest));
        snap2.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as TalentConsultationRequest));
        
        setMyConsultations(Array.from(map.values()));
      } catch (error) {
        console.warn("Error fetching consultations:", error);
      }
    };
    fetchConsultations();
  }, [user]);

  // Normalize talent profile helper
  const getNormalizedTalent = (u: User): {
    headline: string;
    category: TalentCategory;
    categoryLabel: string;
    categoryBadgeColor: string;
    bio: string;
    domains: string[];
    skills: string[];
    services: string[];
    hourlyRate: number | string;
    rateText: string;
    experience: number;
    city: string;
    organization: string;
    isAvailable: boolean;
    rating: number;
    reviewsCount: number;
    phone: string;
    whatsapp: string;
    publicationsCount: number;
  } => {
    const tp = u.talentProfile;
    const teacherP = u.teacherProfile;

    let category: TalentCategory = tp?.category || (u.role === 'teacher' ? 'teacher' : u.role === 'alumni' ? 'alumni' : u.role === 'parent' ? 'parent' : 'student');
    
    let categoryLabel = 'Talent';
    let categoryBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (category === 'teacher' || u.role === 'teacher') {
      categoryLabel = '👨‍🏫 Enseignant / Prof';
      categoryBadgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (category === 'alumni' || u.role === 'alumni') {
      categoryLabel = '🎓 Alumni / Mentor';
      categoryBadgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
    } else if (category === 'student' || u.role === 'student') {
      categoryLabel = '💡 Étudiant Tuteur';
      categoryBadgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (category === 'parent' || u.role === 'parent') {
      categoryLabel = '👨‍👩‍👧 Parent / Coach';
      categoryBadgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
    }

    const headline = tp?.headline || (teacherP ? `${teacherP.academicRank} en ${teacherP.domains?.[0] || 'Enseignement'}` : `${u.major || 'Expert'} - CampusBF`);
    const bio = tp?.bio || teacherP?.biography || u.bio || 'Compétences et expertise au service de la communauté universitaire et professionnelle.';
    const domains = tp?.domains?.length ? tp.domains : (teacherP?.domains?.length ? teacherP.domains : (u.major ? [u.major] : ['Général']));
    const skills = tp?.skills?.length ? tp.skills : (teacherP?.specialties?.length ? teacherP.specialties : (u.skills || []));
    const services = tp?.servicesOffered?.length ? tp.servicesOffered : (teacherP?.courses?.length ? ['Vacation universitaire', 'Cours de soutien', 'Encadrement'] : ['Cours de soutien', 'Conseil']);
    const hourlyRate = tp?.hourlyRate || (teacherP ? 20000 : 5000);
    const rateText = tp?.consultationRateText || `${hourlyRate.toLocaleString('fr-FR')} FCFA / h`;
    const experience = tp?.yearsOfExperience || teacherP?.yearsOfExperience || 1;
    const city = tp?.city || u.city || 'Ouagadougou';
    const organization = tp?.universityOrOrg || teacherP?.academicRank ? `${u.university || 'Université'}` : (u.university || 'Burkina Faso');
    const isAvailable = tp?.availability?.isAvailable ?? teacherP?.availability?.isAvailable ?? true;
    const rating = tp?.rating || 4.9;
    const reviewsCount = tp?.reviewsCount || (teacherP?.reviews?.length || 0) + talentReviews.length;
    const phone = tp?.phone || u.phone || '+226 70 00 00 00';
    const whatsapp = tp?.whatsapp || tp?.phone || u.phone || '+226 70 00 00 00';
    const publicationsCount = tp?.publications?.length || teacherP?.publications?.length || 0;

    return {
      headline,
      category,
      categoryLabel,
      categoryBadgeColor,
      bio,
      domains,
      skills,
      services,
      hourlyRate,
      rateText,
      experience,
      city,
      organization,
      isAvailable,
      rating,
      reviewsCount,
      phone,
      whatsapp,
      publicationsCount
    };
  };

  // Filtered talents
  const filteredTalents = useMemo(() => {
    return usersList.filter(talent => {
      const data = getNormalizedTalent(talent);
      const fullName = `${talent.firstName || ''} ${talent.lastName || ''}`.toLowerCase();
      const q = searchTerm.toLowerCase();

      // Category tab
      if (activeCategoryTab !== 'all' && data.category !== activeCategoryTab) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const matchesName = fullName.includes(q);
        const matchesHeadline = data.headline.toLowerCase().includes(q);
        const matchesSkills = data.skills.some(s => s.toLowerCase().includes(q));
        const matchesDomains = data.domains.some(d => d.toLowerCase().includes(q));
        const matchesOrg = data.organization.toLowerCase().includes(q);
        const matchesCity = data.city.toLowerCase().includes(q);
        if (!matchesName && !matchesHeadline && !matchesSkills && !matchesDomains && !matchesOrg && !matchesCity) {
          return false;
        }
      }

      // Domain filter
      if (domainFilter !== 'Tous' && !data.domains.includes(domainFilter)) {
        return false;
      }

      // Service filter
      if (serviceFilter !== 'Tous' && !data.services.some(s => s.toLowerCase().includes(serviceFilter.toLowerCase()))) {
        return false;
      }

      // City filter
      if (cityFilter !== 'Tous' && !data.city.toLowerCase().includes(cityFilter.toLowerCase())) {
        return false;
      }

      // Availability
      if (availabilityOnly && !data.isAvailable) {
        return false;
      }

      return true;
    });
  }, [usersList, activeCategoryTab, searchTerm, domainFilter, serviceFilter, cityFilter, availabilityOnly]);

  // Domains & Services & Cities for dropdowns
  const allDomains = useMemo(() => {
    const set = new Set<string>();
    usersList.forEach(u => {
      const data = getNormalizedTalent(u);
      data.domains.forEach(d => set.add(d));
    });
    return ['Tous', ...Array.from(set)];
  }, [usersList]);

  const allServices = ['Tous', 'Vacation universitaire', 'Cours de soutien / Maison', 'Consultation Entreprise', 'Conférence / Panel', 'Mentorat carrière', 'Audit & Étude', 'Orientation & Choix de filière'];
  const allCities = ['Tous', 'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Fada N’Gourma', 'Ouahigouya'];

  // Handle consultation modal opening
  const handleOpenConsultationModal = (talent: User) => {
    setTalentForConsultation(talent);
    setConsultationForm(prev => ({
      ...prev,
      requesterName: user ? `${user.firstName} ${user.lastName}` : prev.requesterName,
      requesterEmail: user?.email || prev.requesterEmail,
      requesterPhone: user?.phone || prev.requesterPhone,
      requesterRole: (user?.role || 'parent') as any,
      requesterOrg: user?.companyName || user?.university || prev.requesterOrg,
      subject: `Demande de consultation avec ${talent.firstName} ${talent.lastName}`,
    }));
    setShowConsultationModal(true);
  };

  // Submit consultation request
  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!talentForConsultation) return;

    setSubmittingConsultation(true);
    try {
      const talentData = getNormalizedTalent(talentForConsultation);
      const newConsultation: Partial<TalentConsultationRequest> = {
        talentId: talentForConsultation.id,
        talentName: `${talentForConsultation.firstName} ${talentForConsultation.lastName}`,
        talentCategory: talentData.category,
        talentHeadline: talentData.headline,
        requesterId: user?.id || 'guest-' + Date.now(),
        requesterName: consultationForm.requesterName,
        requesterEmail: consultationForm.requesterEmail,
        requesterPhone: consultationForm.requesterPhone,
        requesterRole: consultationForm.requesterRole,
        requesterOrg: consultationForm.requesterOrg,
        consultationType: consultationForm.consultationType,
        subject: consultationForm.subject,
        message: consultationForm.message,
        preferredDate: consultationForm.preferredDate,
        proposedBudget: consultationForm.proposedBudget,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'talent_consultations'), newConsultation);
      
      // Also send a direct conversation message if user is signed in
      if (user && talentForConsultation.id !== user.id) {
        try {
          const convId = [user.id, talentForConsultation.id].sort().join('_');
          const msgRef = collection(db, `conversations/${convId}/messages`);
          const msgContent = `📌 NOUVELLE DEMANDE DE CONSULTATION CAMPUSBF TALENTS :\n\nType: ${consultationForm.consultationType}\nSujet: ${consultationForm.subject}\nBudget proposé: ${consultationForm.proposedBudget || 'À discuter'}\nDate souhaitée: ${consultationForm.preferredDate || 'Flexible'}\n\nMessage: ${consultationForm.message}\n\nContact: ${consultationForm.requesterPhone} (${consultationForm.requesterName})`;
          
          await addDoc(msgRef, {
            senderId: user.id,
            receiverId: talentForConsultation.id,
            content: msgContent,
            timestamp: serverTimestamp(),
            read: false
          });

          await setDoc(doc(db, 'conversations', convId), {
            participants: [user.id, talentForConsultation.id],
            lastMessage: {
              content: msgContent,
              senderId: user.id,
              timestamp: new Date().toISOString()
            },
            updatedAt: serverTimestamp(),
            [`unreadCount.${talentForConsultation.id}`]: increment(1),
            [`unreadCount.${user.id}`]: 0
          }, { merge: true });
        } catch (convErr) {
          console.warn("Could not post conversation message:", convErr);
        }
      }

      alert('Votre demande de consultation a été transmise avec succès ! Le talent a été notifié et vous répondra très rapidement.');
      setShowConsultationModal(false);
      setConsultationForm(prev => ({ ...prev, subject: '', message: '', proposedBudget: '', preferredDate: '' }));
    } catch (error) {
      console.error("Error submitting consultation:", error);
      alert("Erreur lors de l'envoi de la demande. Veuillez réessayer.");
    } finally {
      setSubmittingConsultation(false);
    }
  };

  // Submit review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTalent || !newReviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const reviewDoc = {
        authorId: user?.id || 'guest',
        authorName: user ? `${user.firstName} ${user.lastName}` : 'Utilisateur CampusBF',
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'users', selectedTalent.id, 'reviews'), reviewDoc);
      setNewReviewComment('');
      setNewReviewRating(5);
      alert('Merci ! Votre avis a été publié avec succès.');
    } catch (error) {
      console.error("Error adding review:", error);
      alert("Erreur lors de la publication de l'avis.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Save own talent profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Veuillez vous connecter pour créer ou modifier votre fiche talent.');
      return;
    }

    setSavingProfile(true);
    try {
      const updatedTalentProfile: TalentProfile = {
        category: profileForm.category || (user.role as any) || 'student',
        headline: profileForm.headline || 'Talent CampusBF',
        bio: profileForm.bio || '',
        domains: profileForm.domains || ['Général'],
        skills: profileForm.skills || [],
        servicesOffered: profileForm.servicesOffered || ['Cours de soutien', 'Consultation'],
        hourlyRate: Number(profileForm.hourlyRate) || 10000,
        consultationRateText: profileForm.consultationRateText || `${profileForm.hourlyRate} FCFA / séance`,
        academicRank: profileForm.academicRank || '',
        yearsOfExperience: Number(profileForm.yearsOfExperience) || 1,
        city: profileForm.city || 'Ouagadougou',
        universityOrOrg: profileForm.universityOrOrg || user.university || '',
        phone: profileForm.phone || user.phone || '',
        whatsapp: profileForm.whatsapp || profileForm.phone || user.phone || '',
        availability: {
          isAvailable: profileForm.availability?.isAvailable ?? true,
          preferredContract: profileForm.availability?.preferredContract || 'Mission / Vacation',
          willingToTravel: profileForm.availability?.willingToTravel ?? true,
          remoteAvailable: profileForm.availability?.remoteAvailable ?? true
        },
        rating: user.talentProfile?.rating || 5.0,
        reviewsCount: user.talentProfile?.reviewsCount || 0,
        isVerified: user.talentProfile?.isVerified ?? (user.isVerified || false),
        updatedAt: new Date().toISOString()
      };

      await updateUser({
        talentProfile: updatedTalentProfile,
        skills: profileForm.skills || []
      });

      // Update local list
      setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, talentProfile: updatedTalentProfile } : u));
      alert('Votre fiche CampusBF Talents a été mise à jour avec succès !');
      setShowProfileEditModal(false);
    } catch (error) {
      console.error("Error saving talent profile:", error);
      alert("Erreur lors de l'enregistrement de votre fiche talent.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Quick WhatsApp link generator
  const getWhatsAppLink = (phone: string, talentName: string, serviceTitle: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Bonjour ${talentName}, je vous contacte via CampusBF Talents au sujet d'une consultation (${serviceTitle}). Êtes-vous disponible pour échanger ?`);
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 font-sans">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-emerald-700/40">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="animate-spin" />
              Place de marché des compétences du Burkina Faso
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              CampusBF Talents
            </h1>
            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
              Le répertoire officiel des enseignants, alumni, étudiants tuteurs et parents experts. 
              Recruteurs, entreprises, établissements et familles : trouvez et sollicitez directement les meilleurs profils pour des vacations, formations, cours ou consultations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => {
                if (!user) {
                  alert('Veuillez vous connecter pour créer ou modifier votre fiche talent.');
                  return;
                }
                setShowProfileEditModal(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/25 transition-all text-sm active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus size={18} />
              Présenter mes compétences
            </button>

            {user && (
              <button
                onClick={() => setShowMyConsultationsModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl border border-white/20 transition-all text-sm active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Calendar size={18} className="text-emerald-300" />
                Mes Consultations {myConsultations.length > 0 && `(${myConsultations.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'all', label: 'Tous les Talents', icon: Sparkles, count: usersList.length },
            { id: 'teacher', label: 'Enseignants & Profs', icon: GraduationCap, count: usersList.filter(u => getNormalizedTalent(u).category === 'teacher').length },
            { id: 'alumni', label: 'Alumni & Mentors', icon: Users, count: usersList.filter(u => getNormalizedTalent(u).category === 'alumni').length },
            { id: 'student', label: 'Étudiants Tuteurs', icon: Award, count: usersList.filter(u => getNormalizedTalent(u).category === 'student').length },
            { id: 'parent', label: 'Parents & Pros', icon: UserIcon, count: usersList.filter(u => getNormalizedTalent(u).category === 'parent').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategoryTab(tab.id)}
              className={cn(
                "flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
                activeCategoryTab === tab.id 
                  ? "bg-white text-slate-900 shadow-md shadow-black/20" 
                  : "bg-white/5 hover:bg-white/10 text-emerald-100 hover:text-white"
              )}
            >
              <tab.icon size={16} />
              <span className="truncate">{tab.label}</span>
              <span className={cn(
                "ml-auto text-[10px] px-1.5 py-0.5 rounded-full",
                activeCategoryTab === tab.id ? "bg-slate-200 text-slate-800" : "bg-white/10 text-emerald-200"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Rechercher par nom, compétence (Python, Algèbre, Droit), ville, établissement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-800"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select 
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-700"
            >
              <option value="Tous">Domaines (Tous)</option>
              {allDomains.filter(d => d !== 'Tous').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select 
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-700"
            >
              <option value="Tous">Services (Tous)</option>
              {allServices.filter(s => s !== 'Tous').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select 
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-700 col-span-2 sm:col-span-1"
            >
              <option value="Tous">Villes (Toutes)</option>
              {allCities.filter(c => c !== 'Tous').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">{filteredTalents.length}</span> talent(s) trouvé(s)
            {(searchTerm || domainFilter !== 'Tous' || serviceFilter !== 'Tous' || cityFilter !== 'Tous' || availabilityOnly) && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setDomainFilter('Tous');
                  setServiceFilter('Tous');
                  setCityFilter('Tous');
                  setAvailabilityOnly(false);
                  setActiveCategoryTab('all');
                }}
                className="text-emerald-600 hover:underline font-bold ml-2"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={availabilityOnly} 
              onChange={(e) => setAvailabilityOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Afficher uniquement les profils disponibles immédiatement</span>
          </label>
        </div>
      </div>

      {/* Talent Cards Grid */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Chargement des talents CampusBF...</p>
        </div>
      ) : filteredTalents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Aucun talent ne correspond à votre recherche</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Essayez d’élargir vos critères de recherche ou réinitialisez les filtres pour découvrir l'ensemble de notre réseau d'experts.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setDomainFilter('Tous');
              setServiceFilter('Tous');
              setCityFilter('Tous');
              setAvailabilityOnly(false);
              setActiveCategoryTab('all');
            }}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all"
          >
            Voir tous les talents
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTalents.map(talent => {
            const data = getNormalizedTalent(talent);
            return (
              <div 
                key={talent.id} 
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 hover:shadow-xl hover:border-emerald-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", data.categoryBadgeColor)}>
                      {data.categoryLabel}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className={cn("w-2 h-2 rounded-full", data.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                      <span className={data.isAvailable ? "text-emerald-700" : "text-slate-400"}>
                        {data.isAvailable ? "Disponible" : "Occupé"}
                      </span>
                    </div>
                  </div>

                  {/* Profile Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative shrink-0">
                      <img 
                        src={talent.avatarUrl || `https://ui-avatars.com/api/?name=${talent.firstName}+${talent.lastName}&background=10b981&color=fff`} 
                        alt={talent.firstName} 
                        className="w-16 h-16 rounded-2xl bg-slate-100 object-cover shadow-sm border-2 border-white" 
                      />
                      {talent.isVerified && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full" title="Profil vérifié CampusBF">
                          <CheckCircle2 size={14} className="fill-emerald-600 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight truncate group-hover:text-emerald-700 transition-colors">
                        {talent.firstName} {talent.lastName}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-1">
                        {data.headline}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-emerald-600" /> {data.city}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star size={12} className="fill-amber-400" />
                          {data.rating}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="space-y-3 mb-5">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Compétences clés</p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.skills.slice(0, 4).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                            {s}
                          </span>
                        ))}
                        {data.skills.length > 4 && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                            +{data.skills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Services list */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Services proposés</p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {data.services.slice(0, 2).map((srv, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <Check size={12} className="text-emerald-600 shrink-0" />
                            <span className="truncate">{srv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Tarif indicatif</span>
                    <span className="text-sm font-black text-slate-900">{data.rateText}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTalent(talent)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                      title="Voir le profil complet"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenConsultationModal(talent)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Consulter</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TALENT PROFILE DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedTalent && (() => {
        const data = getNormalizedTalent(selectedTalent);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
              {/* Modal Top Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 p-4 sm:p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", data.categoryBadgeColor)}>
                    {data.categoryLabel}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Fiche Talent CampusBF</span>
                </div>
                <button 
                  onClick={() => setSelectedTalent(null)} 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                {/* Talent Banner / Bio header */}
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <img 
                    src={selectedTalent.avatarUrl || `https://ui-avatars.com/api/?name=${selectedTalent.firstName}+${selectedTalent.lastName}&background=10b981&color=fff`} 
                    alt={selectedTalent.firstName} 
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-100 object-cover shadow-md border-4 border-slate-50 shrink-0" 
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        {selectedTalent.firstName} {selectedTalent.lastName}
                      </h2>
                      {selectedTalent.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                          <CheckCircle2 size={12} /> Vérifié
                        </span>
                      )}
                    </div>
                    <p className="text-base text-emerald-700 font-semibold">{data.headline}</p>
                    <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1"><Building2 size={14} className="text-slate-400" /> {data.organization}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {data.city}</span>
                      <span className="flex items-center gap-1"><Clock size={14} className="text-slate-400" /> {data.experience} ans d'expérience</span>
                      <span className="flex items-center gap-1 text-amber-500 font-bold"><Star size={14} className="fill-amber-400" /> {data.rating} ({data.reviewsCount} avis)</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons for Recruiters / Parents / Institutions */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">Tarif & Conditions</span>
                    <span className="text-lg font-black text-emerald-950">{data.rateText}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={getWhatsAppLink(data.whatsapp, `${selectedTalent.firstName} ${selectedTalent.lastName}`, data.headline)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                    >
                      <MessageCircle size={16} />
                      WhatsApp Direct
                    </a>

                    <a
                      href={`tel:${data.phone}`}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
                    >
                      <Phone size={16} />
                      Appeler ({data.phone})
                    </a>

                    <button
                      onClick={() => {
                        setSelectedTalent(null);
                        handleOpenConsultationModal(selectedTalent);
                      }}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles size={16} />
                      Demander une consultation
                    </button>
                  </div>
                </div>

                {/* About & Bio */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <UserIcon size={16} className="text-emerald-600" />
                    Présentation & Biographie
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {data.bio}
                  </p>
                </div>

                {/* Grid: Skills & Services */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Award size={16} className="text-emerald-600" />
                      Domaines & Compétences
                    </h3>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {data.domains.map((dom, i) => (
                          <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs">
                            {dom}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {data.skills.map((sk, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded-lg text-xs">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Briefcase size={16} className="text-emerald-600" />
                      Prestations & Services
                    </h3>
                    <div className="space-y-2">
                      {data.services.map((srv, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span>{srv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Publications or Research (if teacher/alumni) */}
                {selectedTalent.teacherProfile?.publications && selectedTalent.teacherProfile.publications.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen size={16} className="text-emerald-600" />
                      Publications & Travaux de recherche
                    </h3>
                    <div className="space-y-2">
                      {selectedTalent.teacherProfile.publications.map((pub, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                          <p className="font-bold text-slate-900">{pub.title}</p>
                          <p className="text-slate-500 mt-0.5">{pub.journal} • {pub.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews & Feedback Section */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Star size={16} className="text-amber-500 fill-amber-400" />
                      Avis & Témoignages ({talentReviews.length + (selectedTalent.teacherProfile?.reviews?.length || 0)})
                    </h3>
                  </div>

                  {/* Add Review Form */}
                  <form onSubmit={handleSubmitReview} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <p className="text-xs font-bold text-slate-700">Laisser une recommandation ou un avis :</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Note :</span>
                      {[1, 2, 3, 4, 5].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setNewReviewRating(st)}
                          className={cn("p-1 transition-colors", st <= newReviewRating ? "text-amber-400" : "text-slate-300")}
                        >
                          <Star size={18} className="fill-current" />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Votre commentaire (ex: Excellent pédagogue, très réactif pour nos besoins)..."
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all whitespace-nowrap"
                      >
                        Publier
                      </button>
                    </div>
                  </form>

                  {/* Reviews List */}
                  <div className="space-y-2">
                    {talentReviews.map((rev, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">{rev.authorName}</span>
                          <div className="flex text-amber-400">
                            {Array.from({ length: rev.rating || 5 }).map((_, st) => (
                              <Star key={st} size={12} className="fill-current" />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* CONSULTATION REQUEST MODAL (For Parents, Companies, Institutions) */}
      {/* ========================================================================= */}
      {showConsultationModal && talentForConsultation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Demande formelle</span>
                <h2 className="text-xl font-bold text-slate-900">
                  Solliciter {talentForConsultation.firstName} {talentForConsultation.lastName}
                </h2>
              </div>
              <button 
                onClick={() => setShowConsultationModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitConsultation} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Votre Nom complet *</label>
                  <input 
                    type="text"
                    value={consultationForm.requesterName}
                    onChange={(e) => setConsultationForm({ ...consultationForm, requesterName: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Votre Profil / Rôle *</label>
                  <select
                    value={consultationForm.requesterRole}
                    onChange={(e) => setConsultationForm({ ...consultationForm, requesterRole: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  >
                    <option value="parent">👨‍👩‍👧 Parent d'élève</option>
                    <option value="company">💼 Entreprise / Recruteur</option>
                    <option value="institution">🏫 Établissement / Université</option>
                    <option value="student">🎓 Étudiant</option>
                    <option value="other">Autre demandeur</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone / WhatsApp *</label>
                  <input 
                    type="tel"
                    value={consultationForm.requesterPhone}
                    onChange={(e) => setConsultationForm({ ...consultationForm, requesterPhone: e.target.value })}
                    required
                    placeholder="+226 70 00 00 00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Organisation / Entreprise / Famille</label>
                  <input 
                    type="text"
                    value={consultationForm.requesterOrg}
                    onChange={(e) => setConsultationForm({ ...consultationForm, requesterOrg: e.target.value })}
                    placeholder="Nom de la structure ou famille"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type de consultation demandée *</label>
                <select
                  value={consultationForm.consultationType}
                  onChange={(e) => setConsultationForm({ ...consultationForm, consultationType: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                >
                  <option value="tutoring">Cours de soutien scolaire / Répétition à domicile</option>
                  <option value="vacation">Vacation d'enseignement universitaire / Cours magistral</option>
                  <option value="company_consultation">Consultation Entreprise / Mission d'expertise technique</option>
                  <option value="mentoring">Mentorat de carrière & Coaching</option>
                  <option value="conference">Conférence, Panel ou Animation d'atelier</option>
                  <option value="audit">Audit, Étude ou Conseil spécialisé</option>
                  <option value="other">Autre besoin spécifique</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Objet / Titre du besoin *</label>
                <input 
                  type="text"
                  value={consultationForm.subject}
                  onChange={(e) => setConsultationForm({ ...consultationForm, subject: e.target.value })}
                  required
                  placeholder="Ex: Cours particuliers Mathématiques Terminale C ou Vacation Informatique Licence 3"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description détaillée de votre besoin *</label>
                <textarea 
                  rows={4}
                  value={consultationForm.message}
                  onChange={(e) => setConsultationForm({ ...consultationForm, message: e.target.value })}
                  required
                  placeholder="Précisez les objectifs, la fréquence souhaitée, le lieu (présentiel ou distanciel), le niveau..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date ou période souhaitée</label>
                  <input 
                    type="text"
                    value={consultationForm.preferredDate}
                    onChange={(e) => setConsultationForm({ ...consultationForm, preferredDate: e.target.value })}
                    placeholder="Ex: Dès lundi prochain / Semestre 2"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Budget proposé (FCFA)</label>
                  <input 
                    type="text"
                    value={consultationForm.proposedBudget}
                    onChange={(e) => setConsultationForm({ ...consultationForm, proposedBudget: e.target.value })}
                    placeholder="Ex: 50 000 FCFA / mois ou À négocier"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConsultationModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingConsultation}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {submittingConsultation ? (
                    <span>Envoi en cours...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Envoyer la demande</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGE MY TALENT PROFILE MODAL */}
      {/* ========================================================================= */}
      {showProfileEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">CampusBF Talents</span>
                <h2 className="text-xl font-bold text-slate-900">Présenter mes compétences</h2>
              </div>
              <button 
                onClick={() => setShowProfileEditModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie de Talent *</label>
                  <select
                    value={profileForm.category}
                    onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value as TalentCategory })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  >
                    <option value="teacher">👨‍🏫 Enseignant / Professeur universitaire</option>
                    <option value="alumni">🎓 Alumni / Mentor professionnel</option>
                    <option value="student">💡 Étudiant Tuteur / Répétiteur</option>
                    <option value="parent">👨‍👩‍👧 Parent / Coach d'orientation</option>
                    <option value="professional">💼 Professionnel / Consultant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Titre / Titre de profil *</label>
                  <input 
                    type="text"
                    value={profileForm.headline}
                    onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
                    required
                    placeholder="Ex: Enseignant en Mathématiques & IA ou Lead Developer & Mentor"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Biographie & Description de vos compétences *</label>
                <textarea 
                  rows={4}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  required
                  placeholder="Décrivez votre parcours académique, vos réussites, vos méthodes d'enseignement ou d'accompagnement..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              {/* Skills Tags input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Compétences clés (ajoutez des mots-clés) *</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="Ex: Python, Algèbre, Prépa BAC, Audit..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSkillInput.trim()) {
                          setProfileForm({
                            ...profileForm,
                            skills: [...(profileForm.skills || []), newSkillInput.trim()]
                          });
                          setNewSkillInput('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSkillInput.trim()) {
                        setProfileForm({
                          ...profileForm,
                          skills: [...(profileForm.skills || []), newSkillInput.trim()]
                        });
                        setNewSkillInput('');
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profileForm.skills?.map((sk, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                      {sk}
                      <X 
                        size={12} 
                        className="cursor-pointer hover:text-red-500" 
                        onClick={() => setProfileForm({ ...profileForm, skills: profileForm.skills?.filter((_, i) => i !== idx) })}
                      />
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tarif indicatif par heure (FCFA)</label>
                  <input 
                    type="number"
                    value={profileForm.hourlyRate}
                    onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Texte de tarification</label>
                  <input 
                    type="text"
                    value={profileForm.consultationRateText}
                    onChange={(e) => setProfileForm({ ...profileForm, consultationRateText: e.target.value })}
                    placeholder="Ex: 15 000 FCFA / séance ou Sur devis"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Années d'expérience</label>
                  <input 
                    type="number"
                    value={profileForm.yearsOfExperience}
                    onChange={(e) => setProfileForm({ ...profileForm, yearsOfExperience: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ville principale</label>
                  <input 
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp de contact</label>
                  <input 
                    type="tel"
                    value={profileForm.whatsapp}
                    onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                    placeholder="+226 70 00 00 00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileEditModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {savingProfile ? 'Enregistrement...' : 'Enregistrer ma fiche Talent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MY CONSULTATIONS MODAL (Received & Sent) */}
      {/* ========================================================================= */}
      {showMyConsultationsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Suivi des échanges</span>
                <h2 className="text-xl font-bold text-slate-900">Mes Consultations & Demandes</h2>
              </div>
              <button 
                onClick={() => setShowMyConsultationsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {myConsultations.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Calendar size={40} className="mx-auto text-slate-300" />
                  <h3 className="text-base font-bold text-slate-700">Aucune demande enregistrée</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Vous n'avez pas encore envoyé ou reçu de demandes de consultation sur CampusBF Talents.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myConsultations.map(req => {
                    const isReceived = req.talentId === user?.id;
                    return (
                      <div key={req.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-xs font-bold",
                              isReceived ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            )}>
                              {isReceived ? '📥 Demande Reçue' : '📤 Demande Envoyée'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {req.consultationType}
                            </span>
                          </div>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-bold",
                            req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'declined' ? 'bg-red-100 text-red-800' :
                            req.status === 'completed' ? 'bg-slate-200 text-slate-800' :
                            'bg-amber-100 text-amber-800'
                          )}>
                            {req.status === 'accepted' ? 'Acceptée' :
                             req.status === 'declined' ? 'Refusée' :
                             req.status === 'completed' ? 'Terminée' : 'En attente'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{req.subject}</h4>
                          <p className="text-xs text-slate-600 mt-1 whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100">
                            {req.message}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60 gap-2">
                          <div>
                            <span className="font-bold text-slate-700">Demandeur : </span>
                            {req.requesterName} ({req.requesterRole}) • {req.requesterPhone}
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${req.requesterPhone}`}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1"
                            >
                              <Phone size={12} /> Appeler
                            </a>
                            <a
                              href={getWhatsAppLink(req.requesterPhone, req.requesterName, req.subject)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-1"
                            >
                              <MessageCircle size={12} /> WhatsApp
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
