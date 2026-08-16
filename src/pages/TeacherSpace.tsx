import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, User as UserIcon, Video, BookOpen, FileText, GraduationCap, 
  Package, Users, MessageSquare, Calendar, Award, TrendingUp, DollarSign, Sparkles, 
  Bell, Settings, Plus, CheckCircle2, Clock, Star, Shield, Send, Check, X, Eye, Trash2, ExternalLink, Search
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, setDoc, onSnapshot 
} from 'firebase/firestore';
import { restructureAcademicDocument } from '@/services/geminiService';
import TeacherClassDetail from '@/components/TeacherClassDetail';
import toast from 'react-hot-toast';

export default function TeacherSpace() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'profile' | 'videos' | 'classes' | 'tutoring' | 'calendar' | 'ai_assistant' | 'stats' | 'revenues' | 'trainings' | 'packs'
  >('dashboard');

  // Teacher Profile local state for editing
  const [bio, setBio] = useState(user?.teacherProfile?.biography || '');
  const [academicRank, setAcademicRank] = useState(user?.teacherProfile?.academicRank || 'Assistant');
  const [specialtiesStr, setSpecialtiesStr] = useState(user?.teacherProfile?.specialties?.join(', ') || '');
  const [domainsStr, setDomainsStr] = useState(user?.teacherProfile?.domains?.join(', ') || '');
  const [yearsExp, setYearsExp] = useState(user?.teacherProfile?.yearsOfExperience || 3);
  
  const [publicationsList, setPublicationsList] = useState<any[]>(user?.teacherProfile?.publications || []);
  const [booksList, setBooksList] = useState<any[]>(user?.teacherProfile?.books || []);
  const [projectsList, setProjectsList] = useState<any[]>(user?.teacherProfile?.projects || []);
  const [supervisionsList, setSupervisionsList] = useState<any[]>(user?.teacherProfile?.supervisions || []);

  // Firestore Data State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [tutoringRequests, setTutoringRequests] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');
  const [showClassModal, setShowClassModal] = useState(false);

  // Student view state
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [allClassesCatalog, setAllClassesCatalog] = useState<any[]>([]);
  const [studentTab, setStudentTab] = useState<'teachers' | 'enrolled' | 'discover'>('teachers');
  const [selectedTeacherModal, setSelectedTeacherModal] = useState<any | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

  // AI Assistant state
  const [aiPromptTopic, setAiPromptTopic] = useState('');
  const [aiContentType, setAiContentType] = useState<'quiz' | 'td' | 'tp' | 'exam' | 'summary'>('quiz');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState('');

  const handleRequestJoinClass = async (cls: any) => {
    if (!user) return;
    try {
      const existingReqs = cls.joinRequests || [];
      const newReq = {
        studentId: user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        studentEmail: user.email,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
      if (existingReqs.some((r: any) => r.studentId === user.id && r.status === 'pending')) {
        toast.error("Vous avez déjà une demande en attente pour cette classe.");
        return;
      }
      const updatedReqs = [...existingReqs.filter((r: any) => r.studentId !== user.id), newReq];
      await updateDoc(doc(db, 'teacherClasses', cls.id), {
        joinRequests: updatedReqs
      });
      toast.success("Demande d'inscription envoyée à l'enseignant !");
      setAllClassesCatalog(prev => prev.map(c => c.id === cls.id ? { ...c, joinRequests: updatedReqs } : c));
    } catch (e) {
      toast.error("Erreur lors de la demande");
    }
  };

  useEffect(() => {
    if (!user) return;
    if (user.role === 'student') {
      getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'))).then(snap => {
        setAllTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      getDocs(collection(db, 'teacherClasses')).then(snap => {
        const allCls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllClassesCatalog(allCls);
        const list = allCls.filter((cls: any) => 
          cls.enrolledStudents?.some((st: any) => st.id === user.id || st.email === user.email)
        );
        setEnrolledClasses(list);
      });
      return;
    }

    // Fetch classes for teachers
    const qClasses = query(collection(db, 'teacherClasses'), where('teacherId', '==', user.id));
    const unsubClasses = onSnapshot(qClasses, (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch tutoring requests
    const qTutoring = query(collection(db, 'tutoringRequests'), where('teacherId', '==', user.id));
    const unsubTutoring = onSnapshot(qTutoring, (snap) => {
      setTutoringRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch videos & courses
    getDocs(query(collection(db, 'videos'), where('creatorId', '==', user.id))).then(snap => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    getDocs(query(collection(db, 'documents'), where('creatorId', '==', user.id))).then(snap => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    getDocs(query(collection(db, 'trainings'), where('instructorId', '==', user.id))).then(snap => {
      setTrainings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubClasses();
      unsubTutoring();
    };
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updatedProfile = {
      ...(user.teacherProfile || {}),
      biography: bio,
      academicRank: academicRank as any,
      languages: user.teacherProfile?.languages || ['Français'],
      specialties: specialtiesStr.split(',').map(s => s.trim()).filter(Boolean),
      domains: domainsStr.split(',').map(d => d.trim()).filter(Boolean),
      yearsOfExperience: Number(yearsExp),
      publications: publicationsList,
      books: booksList,
      projects: projectsList,
      supervisions: supervisionsList,
      courses: user.teacherProfile?.courses || [],
      availability: user.teacherProfile?.availability || { isAvailable: true, willingToTravel: false }
    };
    await updateUser({ teacherProfile: updatedProfile });
    alert("Profil enseignant mis à jour avec succès !");
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newClassName.trim()) return;
    try {
      await addDoc(collection(db, 'teacherClasses'), {
        teacherId: user.id,
        teacherName: `${user.firstName} ${user.lastName}`,
        name: newClassName,
        subject: newClassSubject,
        studentsCount: 0,
        createdAt: serverTimestamp()
      });
      setNewClassName('');
      setNewClassSubject('');
      setShowClassModal(false);
      alert("Classe interactive créée avec succès !");
    } catch (e) {
      console.error("Error creating class:", e);
    }
  };

  const handleUpdateTutoringStatus = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'tutoringRequests', requestId), { status });
      alert(`Demande ${status === 'accepted' ? 'acceptée' : 'refusée'}.`);
    } catch (e) {
      console.error("Error updating tutoring request:", e);
    }
  };

  const handleGenerateAiContent = async () => {
    if (!aiPromptTopic.trim()) return;
    setAiLoading(true);
    setAiGeneratedResult('');
    try {
      const promptText = `Génère un contenu pédagogique de type ${aiContentType} de haute qualité pour le sujet suivant au Burkina Faso : "${aiPromptTopic}". Format en Markdown structuré professionnel.`;
      const result = await restructureAcademicDocument(promptText, {
        institution: user?.university || 'Université de Ouagadougou',
        subject: aiPromptTopic,
        academicYear: '2025-2026',
        documentType: aiContentType.toUpperCase(),
        level: 'Licence / Master'
      });
      setAiGeneratedResult(result);
    } catch (e) {
      console.error("AI Generation error:", e);
      setAiGeneratedResult("Erreur lors de la génération par l'IA. Veuillez réessayer.");
    } finally {
      setAiLoading(false);
    }
  };

  const navTabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'profile', label: 'Mon Profil', icon: UserIcon },
    { id: 'videos', label: 'Mes Vidéos', icon: Video },
    { id: 'classes', label: 'Mes Classes', icon: GraduationCap },
    { id: 'tutoring', label: 'Tutorat & Accompagnements', icon: Users },
    { id: 'calendar', label: 'Mon Calendrier', icon: Calendar },
    { id: 'ai_assistant', label: 'Assistant Pédagogique IA', icon: Sparkles },
    { id: 'trainings', label: 'Formations & Academy', icon: Award },
    { id: 'revenues', label: 'Revenus & Transactions', icon: DollarSign },
  ];

  if (user?.role === 'student') {
    if (selectedClass) {
      return <TeacherClassDetail classItem={selectedClass} onBack={() => setSelectedClass(null)} />;
    }

    const filteredTeachers = allTeachers.filter(t => {
      const name = `${t.firstName} ${t.lastName}`.toLowerCase();
      const spec = t.teacherProfile?.specialties?.join(' ').toLowerCase() || '';
      const q = teacherSearchQuery.toLowerCase();
      return name.includes(q) || spec.includes(q);
    });

    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-950 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Espace Enseignant & Cours Étudiant
            </span>
            <h1 className="text-3xl font-extrabold">
              Bienvenue, {user.firstName} {user.lastName}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Consultez l'annuaire des professeurs, découvrez leurs profils de recherche et accédez directement aux ressources et activités des cours où vous êtes inscrit.
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-b border-slate-200 pb-2">
          <button
            onClick={() => setStudentTab('teachers')}
            className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              studentTab === 'teachers' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users size={16} /> Annuaire des Enseignants ({allTeachers.length})
          </button>
          <button
            onClick={() => setStudentTab('enrolled')}
            className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              studentTab === 'enrolled' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen size={16} /> Mes Cours Inscrits ({enrolledClasses.length})
          </button>
          <button
            onClick={() => setStudentTab('discover')}
            className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
              studentTab === 'discover' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <GraduationCap size={16} /> Classes Ouvertes & Inscription
          </button>
        </div>

        {studentTab === 'discover' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Classes et Cours Ouverts</h3>
              <p className="text-xs text-slate-500 mt-1">Demandez à rejoindre une classe ouverte. L'enseignant validera votre inscription pour vous donner accès aux ressources et activités.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allClassesCatalog.map((cls) => {
                const isEnrolled = cls.enrolledStudents?.some((st: any) => st.id === user?.id || st.email === user?.email);
                const req = cls.joinRequests?.find((r: any) => r.studentId === user?.id);
                const isPending = req && req.status === 'pending';
                const isApproved = isEnrolled || (req && req.status === 'approved');

                return (
                  <div key={cls.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase">
                        {cls.subject || 'Cours Général'}
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-900">{cls.name}</h4>
                      <p className="text-xs text-slate-500">Enseignant : <span className="font-bold text-slate-700">{cls.teacherName || 'Professeur'}</span></p>
                    </div>

                    <div>
                      {isApproved ? (
                        <button
                          onClick={() => setSelectedClass(cls)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Check size={16} /> Inscrit • Accéder au cours
                        </button>
                      ) : isPending ? (
                        <div className="w-full py-3 bg-amber-50 text-amber-700 rounded-2xl text-xs font-bold text-center border border-amber-200">
                          ⏳ Demande en attente de validation
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRequestJoinClass(cls)}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Send size={14} /> Demander à rejoindre
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {studentTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou spécialité..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeachers.map((teacher) => {
                const p = teacher.teacherProfile || {};
                return (
                  <div key={teacher.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-extrabold flex items-center justify-center text-lg">
                          {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                        </div>
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase">
                          {p.academicRank || 'Enseignant'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-lg">Pr. {teacher.firstName} {teacher.lastName}</h3>
                        <p className="text-xs text-indigo-600 font-semibold">{teacher.university || 'Université de Ouagadougou'}</p>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{p.biography || 'Aucune biographie renseignée.'}</p>
                      {p.specialties && p.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.specialties.slice(0, 3).map((s: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => setSelectedTeacherModal(teacher)}
                        className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Eye size={14} /> Voir Profil & Recherche
                      </button>
                      <button
                        onClick={() => window.open(`/teacher-profile/${teacher.id}`, '_blank')}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                        title="Vitrine Publique"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {studentTab === 'enrolled' && (
          <div className="space-y-6">
            {enrolledClasses.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <BookOpen size={48} className="mx-auto text-emerald-300" />
                <h3 className="text-lg font-bold text-slate-800">Aucun cours ou classe inscrit</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Vous n'avez pas encore été inscrit dans une classe interactive par un enseignant. Contactez votre professeur pour rejoindre son espace de cours.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledClasses.map((cls) => (
                  <div key={cls.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
                        {cls.subject || 'Cours Général'}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900">{cls.name}</h3>
                      <p className="text-xs text-slate-500">Enseignant : <span className="font-bold text-slate-700">{cls.teacherName || 'Professeur'}</span></p>
                      <p className="text-xs text-slate-500">Chapitres publiés : <span className="font-bold text-indigo-600">{cls.sections?.length || 0}</span></p>
                    </div>

                    <button
                      onClick={() => setSelectedClass(cls)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <BookOpen size={16} /> Accéder au Cours & Activités
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTeacherModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase">
                    {selectedTeacherModal.teacherProfile?.academicRank || 'Enseignant'}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Pr. {selectedTeacherModal.firstName} {selectedTeacherModal.lastName}</h2>
                  <p className="text-xs text-slate-500">{selectedTeacherModal.university || 'Université de Ouagadougou'}</p>
                </div>
                <button
                  onClick={() => setSelectedTeacherModal(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Biographie & Présentation</h4>
                  <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl leading-relaxed">{selectedTeacherModal.teacherProfile?.biography || 'Aucune biographie.'}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2">Publications Scientifiques ({selectedTeacherModal.teacherProfile?.publications?.length || 0})</h4>
                  {selectedTeacherModal.teacherProfile?.publications?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucune publication enregistrée.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeacherModal.teacherProfile?.publications?.map((pub: any, i: number) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <p className="font-bold text-slate-900">{pub.title}</p>
                          <p className="text-slate-500">{pub.journal} • {pub.year}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2">Ouvrages & Manuels ({selectedTeacherModal.teacherProfile?.books?.length || 0})</h4>
                  {selectedTeacherModal.teacherProfile?.books?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun ouvrage enregistré.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeacherModal.teacherProfile?.books?.map((b: any, i: number) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <p className="font-bold text-slate-900">{b.title}</p>
                          <p className="text-slate-500">{b.publisher} • {b.year}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2">Projets de Recherche ({selectedTeacherModal.teacherProfile?.projects?.length || 0})</h4>
                  {selectedTeacherModal.teacherProfile?.projects?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun projet enregistré.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeacherModal.teacherProfile?.projects?.map((proj: any, i: number) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">{proj.title}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">{proj.status}</span>
                          </div>
                          <p className="text-slate-600">{proj.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Espace Professionnel Enseignant
            </span>
            {user?.teacherStatus === 'approved' && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={14} /> Vérifié
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold">
            Pr. {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-slate-300 text-sm">
            Gérez vos contenus pédagogiques, vos classes interactives et développez votre audience sur CampusBF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.open(`/teacher-profile/${user?.id}`, '_blank')}
            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs transition-all border border-white/20 flex items-center gap-2"
          >
            <Eye size={16} /> Voir ma Vitrine Publique
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-slate-200">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 py-3 px-4 font-bold text-xs rounded-2xl transition-all whitespace-nowrap cursor-pointer",
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Rendering */}
      <div className="space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Vidéos & Cours</span>
                  <Video size={20} className="text-emerald-600" />
                </div>
                <p className="text-3xl font-extrabold text-slate-900">{videos.length + courses.length}</p>
                <p className="text-xs text-emerald-600 font-semibold">+ Publications gratuites</p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Classes Actives</span>
                  <GraduationCap size={20} className="text-indigo-600" />
                </div>
                <p className="text-3xl font-extrabold text-slate-900">{classes.length}</p>
                <p className="text-xs text-indigo-600 font-semibold">Groupes d'étudiants</p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Demandes Tutorat</span>
                  <Users size={20} className="text-amber-500" />
                </div>
                <p className="text-3xl font-extrabold text-slate-900">{tutoringRequests.length}</p>
                <p className="text-xs text-amber-600 font-semibold">En attente de réponse</p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Note Pédagogique</span>
                  <Star size={20} className="text-amber-400 fill-amber-400" />
                </div>
                <p className="text-3xl font-extrabold text-slate-900">4.8 <span className="text-sm font-normal text-slate-400">/5</span></p>
                <p className="text-xs text-emerald-600 font-semibold">Excellent retour étudiant</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Actions Rapides Pédagogiques</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setActiveTab('classes')}
                  className="p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all border border-emerald-200/60"
                >
                  <Plus size={20} className="text-emerald-600" /> Créer une Classe Interactive
                </button>
                <button 
                  onClick={() => setActiveTab('ai_assistant')}
                  className="p-4 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all border border-purple-200/60"
                >
                  <Sparkles size={20} className="text-purple-600" /> Générer Quiz / TD avec l'IA
                </button>
                <button 
                  onClick={() => setActiveTab('classes')}
                  className="p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all border border-indigo-200/60"
                >
                  <BookOpen size={20} className="text-indigo-600" /> Gérer mes Classes
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-3xl mx-auto space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Mon Profil Professionnel & Recherche</h3>
              <p className="text-xs text-slate-500">Mettez à jour vos grades, publications, ouvrages, projets et encadrements académiques.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grade Académique</label>
                  <select 
                    value={academicRank} 
                    onChange={(e) => setAcademicRank(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="Assistant">Assistant</option>
                    <option value="Maître Assistant">Maître Assistant</option>
                    <option value="Maître de Conférences">Maître de Conférences</option>
                    <option value="Professeur Titulaire">Professeur Titulaire</option>
                    <option value="Vacataire">Vacataire</option>
                    <option value="Maitre de Recherche">Maitre de Recherche</option>
                    <option value="Directeur de Recherche">Directeur de Recherche</option>
                    <option value="Maitre de Conférence Agrégé">Maitre de Conférence Agrégé</option>
                    <option value="Chercheurs">Chercheurs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Années d'expérience</label>
                  <input 
                    type="number" 
                    value={yearsExp} 
                    onChange={(e) => setYearsExp(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Domaines d'enseignement (séparés par des virgules)</label>
                <input 
                  type="text" 
                  value={domainsStr} 
                  onChange={(e) => setDomainsStr(e.target.value)}
                  placeholder="Ex: Mathématiques, Informatique, Économie..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Spécialités (séparées par des virgules)</label>
                <input 
                  type="text" 
                  value={specialtiesStr} 
                  onChange={(e) => setSpecialtiesStr(e.target.value)}
                  placeholder="Ex: Algèbre linéaire, Python, Data Science..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Biographie professionnelle</label>
                <textarea 
                  rows={4} 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Présentez votre parcours, vos recherches et votre approche pédagogique..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                ></textarea>
              </div>

              {/* PUBLICATIONS SCIENTIFIQUES */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-sm">Publications Scientifiques (Articles)</h4>
                  <button
                    type="button"
                    onClick={() => setPublicationsList([...publicationsList, { title: '', journal: '', year: new Date().getFullYear().toString(), link: '' }])}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                  >
                    + Ajouter un article
                  </button>
                </div>
                {publicationsList.map((pub, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => setPublicationsList(publicationsList.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 text-red-500 font-bold text-xs"
                    >
                      ✕
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Titre de l'article"
                        value={pub.title}
                        onChange={(e) => {
                          const updated = [...publicationsList];
                          updated[idx].title = e.target.value;
                          setPublicationsList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs sm:col-span-2 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Année"
                        value={pub.year}
                        onChange={(e) => {
                          const updated = [...publicationsList];
                          updated[idx].year = e.target.value;
                          setPublicationsList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Revue / Journal scientifique"
                      value={pub.journal}
                      onChange={(e) => {
                        const updated = [...publicationsList];
                        updated[idx].journal = e.target.value;
                        setPublicationsList(updated);
                      }}
                      className="w-full p-2 border rounded-xl text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* OUVRAGES */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-sm">Ouvrages / Livres</h4>
                  <button
                    type="button"
                    onClick={() => setBooksList([...booksList, { title: '', publisher: '', year: new Date().getFullYear().toString() }])}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                  >
                    + Ajouter un ouvrage
                  </button>
                </div>
                {booksList.map((book, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => setBooksList(booksList.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 text-red-500 font-bold text-xs"
                    >
                      ✕
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Titre de l'ouvrage"
                        value={book.title}
                        onChange={(e) => {
                          const updated = [...booksList];
                          updated[idx].title = e.target.value;
                          setBooksList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs sm:col-span-2 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Année"
                        value={book.year}
                        onChange={(e) => {
                          const updated = [...booksList];
                          updated[idx].year = e.target.value;
                          setBooksList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Maison d'édition"
                      value={book.publisher}
                      onChange={(e) => {
                        const updated = [...booksList];
                        updated[idx].publisher = e.target.value;
                        setBooksList(updated);
                      }}
                      className="w-full p-2 border rounded-xl text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* PROJETS */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-sm">Projets Exécutés ou en Cours d'Exécution</h4>
                  <button
                    type="button"
                    onClick={() => setProjectsList([...projectsList, { title: '', status: 'En cours', period: '', description: '' }])}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                  >
                    + Ajouter un projet
                  </button>
                </div>
                {projectsList.map((proj, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => setProjectsList(projectsList.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 text-red-500 font-bold text-xs"
                    >
                      ✕
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Intitulé du projet"
                        value={proj.title}
                        onChange={(e) => {
                          const updated = [...projectsList];
                          updated[idx].title = e.target.value;
                          setProjectsList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs sm:col-span-2 bg-white"
                      />
                      <select
                        value={proj.status}
                        onChange={(e) => {
                          const updated = [...projectsList];
                          updated[idx].status = e.target.value;
                          setProjectsList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs bg-white"
                      >
                        <option value="En cours">En cours</option>
                        <option value="Exécuté / Achevé">Exécuté / Achevé</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Période (ex: 2023 - 2025)"
                      value={proj.period}
                      onChange={(e) => {
                        const updated = [...projectsList];
                        updated[idx].period = e.target.value;
                        setProjectsList(updated);
                      }}
                      className="w-full p-2 border rounded-xl text-xs bg-white"
                    />
                    <textarea
                      placeholder="Description du projet..."
                      rows={2}
                      value={proj.description}
                      onChange={(e) => {
                        const updated = [...projectsList];
                        updated[idx].description = e.target.value;
                        setProjectsList(updated);
                      }}
                      className="w-full p-2 border rounded-xl text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* THÈSES, MÉMOIRES, RAPPORTS */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-sm">Thèses, Mémoires de Master & Rapports de Licence</h4>
                  <button
                    type="button"
                    onClick={() => setSupervisionsList([...supervisionsList, { studentName: '', degree: 'Master', period: '', defenseDate: '', currentSituation: '' }])}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                  >
                    + Ajouter un encadrement
                  </button>
                </div>
                {supervisionsList.map((sup, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => setSupervisionsList(supervisionsList.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 text-red-500 font-bold text-xs"
                    >
                      ✕
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nom complet de l'étudiant"
                        value={sup.studentName}
                        onChange={(e) => {
                          const updated = [...supervisionsList];
                          updated[idx].studentName = e.target.value;
                          setSupervisionsList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs bg-white"
                      />
                      <select
                        value={sup.degree}
                        onChange={(e) => {
                          const updated = [...supervisionsList];
                          updated[idx].degree = e.target.value;
                          setSupervisionsList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs bg-white"
                      >
                        <option value="Licence">Rapport de Licence</option>
                        <option value="Master">Mémoire de Master</option>
                        <option value="Thèse">Thèse de Doctorat</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Période d'encadrement (ex: 2024-2025)"
                        value={sup.period}
                        onChange={(e) => {
                          const updated = [...supervisionsList];
                          updated[idx].period = e.target.value;
                          setSupervisionsList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Date de soutenance"
                        value={sup.defenseDate}
                        onChange={(e) => {
                          const updated = [...supervisionsList];
                          updated[idx].defenseDate = e.target.value;
                          setSupervisionsList(updated);
                        }}
                        className="p-2 border rounded-xl text-xs bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Situation actuelle de l'étudiant (ex: Doctorant à l'Université, Ingénieur chez ...)"
                      value={sup.currentSituation}
                      onChange={(e) => {
                        const updated = [...supervisionsList];
                        updated[idx].currentSituation = e.target.value;
                        setSupervisionsList(updated);
                      }}
                      className="w-full p-2 border rounded-xl text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              <button type="submit" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md">
                Enregistrer les modifications
              </button>
            </form>
          </div>
        )}

        {activeTab === 'classes' && (
          selectedClass ? (
            <TeacherClassDetail 
              classItem={selectedClass} 
              onBack={() => setSelectedClass(null)} 
            />
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Mes Classes Interactives</h3>
                  <p className="text-xs text-slate-500">Créez et gérez vos groupes d'étudiants, devoirs et annonces.</p>
                </div>
                <button 
                  onClick={() => setShowClassModal(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Plus size={16} /> Créer une classe
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {classes.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-100">
                    Aucune classe créée pour l'instant. Cliquez sur "Créer une classe" pour commencer.
                  </div>
                ) : (
                  classes.map((cls) => (
                    <div key={cls.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                      <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl w-fit">
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{cls.name}</h4>
                        <p className="text-xs text-emerald-600 font-semibold">{cls.subject}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span>{cls.enrolledStudents?.length || cls.studentsCount || 0} étudiants inscrits</span>
                        <button 
                          onClick={() => setSelectedClass(cls)}
                          className="text-indigo-600 font-bold hover:underline"
                        >
                          Gérer
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        )}

        {activeTab === 'tutoring' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Demandes de Tutorat & Accompagnements</h3>
              <p className="text-xs text-slate-500">Gérez les demandes reçues de la part des étudiants.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {tutoringRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-500">Aucune demande de tutorat en attente.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tutoringRequests.map((req) => (
                    <div key={req.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{req.studentName}</span>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            req.status === 'accepted' ? "bg-emerald-100 text-emerald-700" :
                            req.status === 'rejected' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {req.status === 'accepted' ? 'Acceptée' : req.status === 'rejected' ? 'Refusée' : 'En attente'}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 font-semibold">Sujet : {req.subject} ({req.type})</p>
                        <p className="text-xs text-slate-600">{req.problem}</p>
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleUpdateTutoringStatus(req.id, 'accepted')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <Check size={14} /> Accepter
                          </button>
                          <button 
                            onClick={() => handleUpdateTutoringStatus(req.id, 'rejected')}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <X size={14} /> Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ai_assistant' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Assistant Pédagogique IA (Gemini)</h3>
                <p className="text-xs text-slate-500">Générez instantanément des quiz, TD, TP ou corrigés validés par vos soins.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type de contenu pédagogique</label>
                  <select 
                    value={aiContentType} 
                    onChange={(e: any) => setAiContentType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="quiz">Quiz interactif (QCM)</option>
                    <option value="td">Travaux Dirigés (TD)</option>
                    <option value="tp">Travaux Pratiques (TP)</option>
                    <option value="exam">Examen / Épreuve type</option>
                    <option value="summary">Fiche de révision / Résumé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sujet ou Chapitre académique</label>
                  <input 
                    type="text" 
                    value={aiPromptTopic} 
                    onChange={(e) => setAiPromptTopic(e.target.value)}
                    placeholder="Ex: Algèbre linéaire, Thermodynamique, Python..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateAiContent}
                disabled={aiLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {aiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Sparkles size={16} />}
                Générer avec l'IA Gemini
              </button>
            </div>

            {aiGeneratedResult && (
              <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Résultat Généré (Validation Requise)</span>
                  <button 
                    onClick={() => { alert("Contenu validé et prêt à être publié dans vos cours !"); }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    Valider & Publier
                  </button>
                </div>
                <div className="prose max-w-none text-sm text-slate-800 whitespace-pre-wrap font-mono bg-white p-4 rounded-xl border border-slate-200/80">
                  {aiGeneratedResult}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Mes Vidéos Pédagogiques
                </h3>
                <p className="text-xs text-slate-500">Publiez gratuitement vos ressources pour vos étudiants.</p>
              </div>
              <button 
                onClick={() => navigate('/videos-communautaires')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Video size={16} /> Ajouter une vidéo communautaire
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {videos.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500">Aucune vidéo publiée pour le moment.</div>
              ) : (
                videos.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Gratuit</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'revenues' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Mes Revenus & Transactions</h3>
              <p className="text-xs text-slate-500">Suivi des ventes de formations et prestations de tutorat payant.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Revenus du mois</span>
                <p className="text-2xl font-extrabold text-emerald-900">125 000 FCFA</p>
              </div>
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-1">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Disponible</span>
                <p className="text-2xl font-extrabold text-indigo-900">90 000 FCFA</p>
              </div>
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-1">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">En attente</span>
                <p className="text-2xl font-extrabold text-amber-900">35 000 FCFA</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">ℹ️ Règle de commission CampusBF :</p>
              <p>Sur chaque formation ou session payante, CampusBF prélève une commission de maintenance de 20%, garantissant 80% de reversement direct à l'enseignant.</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg">Créer une classe interactive</h3>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom de la classe</label>
                <input 
                  type="text" 
                  value={newClassName} 
                  onChange={(e) => setNewClassName(e.target.value)} 
                  placeholder="Ex: Master 1 Data Science - 2026" 
                  className="w-full p-3 rounded-xl border text-sm"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Matière / Spécialité</label>
                <input 
                  type="text" 
                  value={newClassSubject} 
                  onChange={(e) => setNewClassSubject(e.target.value)} 
                  placeholder="Ex: Machine Learning" 
                  className="w-full p-3 rounded-xl border text-sm"
                  required 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowClassModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Créer la classe</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
