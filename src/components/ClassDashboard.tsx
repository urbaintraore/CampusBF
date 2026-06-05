import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, 
  FileText, 
  MessageSquare, 
  Plus, 
  Download, 
  Upload, 
  History, 
  Paperclip, 
  Clock, 
  Edit, 
  Save, 
  User, 
  BookOpen, 
  MapPin, 
  MessageCircle, 
  CheckCircle2, 
  ArrowLeftRight,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  addDoc,
  orderBy, 
  serverTimestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { academicService } from '@/services/academicService';
import { logService } from '@/services/logService';
import { 
  Classe, 
  AcademicStudent, 
  Timetable, 
  TimetableVersion, 
  TimetableCell, 
  AcademicDocument, 
  ClassMessage, 
  Commentary, 
  AcademicRole 
} from '@/types/academic';
import { toast } from 'sonner';
import ClassChat from './ClassChat';

interface ClassDashboardProps {
  classeId: string;
  selectedRole: AcademicRole;
}

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const TIMESLOTS = ['08:00 - 10:00', '10:15 - 12:15', '14:00 - 16:00', '16:15 - 18:15'];

export default function ClassDashboard({ classeId, selectedRole }: ClassDashboardProps) {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'timetable' | 'documents' | 'chat'>('timetable');
  const [currentClass, setCurrentClass] = useState<Classe | null>(null);

  // --- TIMETABLE STATES ---
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [isEditingGrid, setIsEditingGrid] = useState(false);
  const [gridCells, setGridCells] = useState<TimetableCell[]>([]);
  const [timetableDesc, setTimetableDesc] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showUploadTimetableModal, setShowUploadTimetableModal] = useState(false);
  const [newTimetableForm, setNewTimetableForm] = useState({
    fileName: '',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: ''
  });

  // --- DOCUMENTS STATES ---
  const [documents, setDocuments] = useState<AcademicDocument[]>([]);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocForm, setNewDocForm] = useState({
    title: '',
    category: 'Cours' as AcademicDocument['category'],
    description: '',
    fileName: '',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  });

  // --- REAL-TIME CHAT / MESSAGES STATES ---
  const [messages, setMessages] = useState<ClassMessage[]>([]);
  const [newMessage, setNewMessage] = useState({
    title: '',
    content: '',
    allowComments: true,
    attachmentsName: '',
    attachmentsUrl: ''
  });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showAddMessageModal, setShowAddMessageModal] = useState(false);

  // Determine if user has managerial capabilities on this class
  const canManageClass = ['super_admin', 'admin_university', 'chef_departement', 'responsable_filiere', 'teacher', 'admin', 'institution'].includes(selectedRole);

  // --- LOAD CLASS GENERAL INFO ---
  useEffect(() => {
    const clsList = academicService.getClasses();
    const target = clsList.find(c => c.id === classeId);
    if (target) {
      setCurrentClass(target);
    }
  }, [classeId]);

  // --- 1. REAL-TIME LISTENER FOR TIMETABLES ---
  useEffect(() => {
    const q = query(collection(db, 'academic_timetables'), where('classeId', '==', classeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data() as Timetable;
        setTimetable(docData);
        // Sync interactive cell values
        if (docData.gridData) {
          setGridCells(docData.gridData);
        } else {
          setGridCells([]);
        }
      } else {
        // Fallback to local storage or set null
        const localT = academicService.getTimetable(classeId);
        if (localT) {
          setTimetable(localT);
          setGridCells(localT.gridData || []);
        } else {
          setTimetable(null);
          setGridCells([]);
        }
      }
    }, (error) => {
      console.error("Timetable Snapshot Error, falling back: ", error);
      const localT = academicService.getTimetable(classeId);
      if (localT) {
        setTimetable(localT);
        setGridCells(localT.gridData || []);
      }
    });

    return () => unsubscribe();
  }, [classeId]);

  // --- 2. REAL-TIME LISTENER FOR DOCUMENTS ---
  useEffect(() => {
    const q = query(collection(db, 'academic_documents'), where('classeId', '==', classeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AcademicDocument[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AcademicDocument);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      if (list.length > 0) {
        setDocuments(list);
      } else {
        // Fallback or seed
        setDocuments(academicService.getDocuments(classeId));
      }
    }, (error) => {
      console.warn("Docs Snapshot Error, local storage fallback", error);
      setDocuments(academicService.getDocuments(classeId));
    });

    return () => unsubscribe();
  }, [classeId]);

  // --- 3. REAL-TIME LISTENER FOR CLASS CHAT MESSAGES ---
  useEffect(() => {
    const q = query(collection(db, 'academic_messages'), where('classeId', '==', classeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ClassMessage[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ClassMessage);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (list.length > 0) {
        setMessages(list);
      } else {
        setMessages(academicService.getMessages(classeId));
      }
    }, (error) => {
      console.warn("Messages Snapshot Error, local storage fallback", error);
      setMessages(academicService.getMessages(classeId));
    });

    return () => unsubscribe();
  }, [classeId]);

  // ==========================================
  // TIMETABLE ACTIONS
  // ==========================================
  const handleCellChange = (day: string, timeSlot: string, field: 'subject' | 'teacher' | 'room', value: string) => {
    setGridCells(prev => {
      const filtered = prev.filter(cell => !(cell.day === day && cell.timeSlot === timeSlot));
      const existing = prev.find(cell => cell.day === day && cell.timeSlot === timeSlot);
      const updatedCell = {
        day,
        timeSlot,
        subject: field === 'subject' ? value : (existing?.subject || ''),
        teacher: field === 'teacher' ? value : (existing?.teacher || ''),
        room: field === 'room' ? value : (existing?.room || '')
      };
      return [...filtered, updatedCell].filter(c => c.subject || c.teacher || c.room);
    });
  };

  const getCellData = (day: string, timeSlot: string) => {
    return gridCells.find(c => c.day === day && c.timeSlot === timeSlot) || { subject: '', teacher: '', room: '' };
  };

  const handleSaveInteractiveGrid = async () => {
    try {
      const uId = user?.id || 'admin';
      const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administration Scolaire';
      
      const updated = academicService.addOrReplaceTimetable(
        classeId,
        'UJKZ',
        'EDT_Format_Interactif_Plateforme.pdf',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        uName,
        timetableDesc || 'Édition directe de l\'emploi du temps via la grille interactive'
      );

      // Inject the cell data into the timetable
      const updatedWithGrid: Timetable = {
        ...updated,
        gridData: gridCells,
        versions: updated.versions.map((v, i) => i === 0 ? { ...v, gridData: gridCells } : v)
      };

      // Set directly in firestore for instantaneous replication
      await setDoc(doc(db, 'academic_timetables', updatedWithGrid.id), updatedWithGrid, { merge: true });
      
      // Also send class notification
      await academicService.triggerPushNotification(
        'UJKZ',
        classeId,
        "🔄 Emploi du Temps Modifié en Direct",
        `L'emploi du temps interactif a été mis à jour par ${uName}.`
      );

      // Add actual notification documents in Firestore for real-time trigger
      const notifRef = doc(collection(db, 'academic_notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: 'all',
        classeId,
        title: "🔄 Emploi du Temps Modifié en Direct",
        content: `L'emploi du temps interactif a été mis à jour par ${uName}.`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'timetable'
      });

      // Audit Log
      await logService.logAudit(
        user?.id || 'admin',
        uName,
        user?.email || '',
        'Modification d\'emploi du temps',
        `Mise à jour de l'emploi du temps interactif de la classe ID: ${classeId}. Motif: ${timetableDesc || 'Édition directe via la grille.'}`
      );

      toast.success('Emploi du temps enregistré et synchronisé en temps réel avec les étudiants !');
      setIsEditingGrid(false);
      setTimetableDesc('');
    } catch (e: any) {
      toast.error('Erreur lors de la sauvegarde: ' + e.message);
    }
  };

  const handleRollbackVersion = async (version: TimetableVersion) => {
    if (!timetable) return;
    try {
      const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administration Scolaire';
      const updatedTimetable: Timetable = {
        ...timetable,
        currentFileName: version.fileName,
        currentUrl: version.fileUrl,
        gridData: version.gridData || [],
        lastUpdated: new Date().toISOString(),
        updatedBy: `${uName} (Restauration V${version.version})`
      };

      await setDoc(doc(db, 'academic_timetables', timetable.id), updatedTimetable, { merge: true });
      
      // Audit Log
      await logService.logAudit(
        user?.id || 'admin',
        uName,
        user?.email || '',
        'Modification d\'emploi du temps',
        `Restauration d'une version précédente de l'emploi du temps (v${version.version}) pour la classe ID: ${timetable.classeId}`
      );

      toast.success(`Restauration de la version ${version.version} réussie !`);
      setShowVersionHistory(false);
    } catch (e: any) {
      toast.error('Échec de la restauration : ' + e.message);
    }
  };

  const handleUploadTimetablePDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimetableForm.fileName || !newTimetableForm.description) {
      toast.error('Veuillez remplir le nom du fichier et le motif de mise à jour.');
      return;
    }

    try {
      const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administration';
      
      const updated = academicService.addOrReplaceTimetable(
        classeId,
        'UJKZ',
        newTimetableForm.fileName.endsWith('.pdf') ? newTimetableForm.fileName : `${newTimetableForm.fileName}.pdf`,
        newTimetableForm.fileUrl,
        uName,
        newTimetableForm.description
      );

      // Save directly to firestore
      await setDoc(doc(db, 'academic_timetables', updated.id), updated, { merge: true });

      // Audit Log
      await logService.logAudit(
        user?.id || 'admin',
        uName,
        user?.email || '',
        'Modification d\'emploi du temps',
        `Mise à jour de l'emploi du temps PDF (${newTimetableForm.fileName}) pour la classe ID: ${classeId}. Motif: ${newTimetableForm.description}`
      );

      // Add real-time notification in firestore
      const notifRef = doc(collection(db, 'academic_notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: 'all',
        classeId,
        title: "📄 Nouvel Emploi du Temps PDF publié",
        content: `Une nouvelle version de l'emploi du temps (${newTimetableForm.fileName}) a été mise en ligne par ${uName}.`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'timetable'
      });

      toast.success('Nouvelle version de l\'emploi du temps PDF téléversée !');
      setShowUploadTimetableModal(false);
      setNewTimetableForm({
        fileName: '',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        description: ''
      });
    } catch (err: any) {
      toast.error('Erreur lors du téléversement : ' + err.message);
    }
  };

  // ==========================================
  // DOCUMENT ACTIONS
  // ==========================================
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocForm.title || !newDocForm.fileName) {
      toast.error('Veuillez spécifier un titre et un nom de fichier.');
      return;
    }

    try {
      const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administration';
      const payload: Omit<AcademicDocument, 'id' | 'downloadsCount' | 'uploadedAt'> = {
        classeId,
        filiereId: currentClass?.filiereId || 'filiere_gl_ujkz',
        departmentId: currentClass?.departmentId || 'dept_mi_ujkz',
        universityId: 'UJKZ',
        title: newDocForm.title,
        category: newDocForm.category,
        description: newDocForm.description,
        fileName: newDocForm.fileName.endsWith('.pdf') ? newDocForm.fileName : `${newDocForm.fileName}.pdf`,
        fileUrl: newDocForm.fileUrl,
        fileType: 'pdf',
        uploadedBy: uName
      };

      const result = academicService.saveDocument(payload);
      
      // Save directly to firestore
      await setDoc(doc(db, 'academic_documents', result.id), result);

      // Trigger standard notification & Firestore notification
      const notifRef = doc(collection(db, 'academic_notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: 'all',
        classeId,
        title: "📂 Nouveau Document de Cours",
        content: `Le document "${payload.title}" (${payload.category}) a été téléversé par ${uName}.`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'document'
      });

      toast.success('Document d\'étude ajouté avec succès !');
      setShowAddDocModal(false);
      setNewDocForm({
        title: '',
        category: 'Cours',
        description: '',
        fileName: '',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      });
    } catch (e: any) {
      toast.error('Erreur de sauvegarde: ' + e.message);
    }
  };

  const handleDownloadDoc = (docId: string, url: string) => {
    academicService.incrementDownload(docId);
    window.open(url, '_blank');
    toast.success('Téléchargement démarré !');
  };

  // ==========================================
  // CHAT / MESSAGES ACTIONS
  // ==========================================
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.title || !newMessage.content) {
      toast.error('Veuillez remplir le sujet et le message.');
      return;
    }

    try {
      const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Anonyme';
      const uRole = selectedRole === 'teacher' ? 'Enseignant' : 'Délégué';
      
      const payload: Omit<ClassMessage, 'id' | 'createdAt' | 'comments'> = {
        classeId,
        universityId: 'UJKZ',
        title: newMessage.title,
        content: newMessage.content,
        authorId: user?.id || 'anon_author_id',
        authorName: uName,
        authorRole: uRole,
        allowComments: newMessage.allowComments,
        attachments: newMessage.attachmentsName ? [{
          fileName: newMessage.attachmentsName,
          fileUrl: newMessage.attachmentsUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileType: 'pdf'
        }] : []
      };

      const savedLocal = academicService.saveMessage(payload);

      // Store in firestore to activate SN real-time
      await setDoc(doc(db, 'academic_messages', savedLocal.id), savedLocal);

      // Also create a Firestore Real-time push notification
      const notifRef = doc(collection(db, 'academic_notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: 'all',
        classeId,
        title: `📢 Annonce de Classe : ${payload.title}`,
        content: `${payload.authorName} a posté une nouvelle communication dans votre classe.`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'message'
      });

      toast.success('Annonce publiée en direct dans la classe !');
      setShowAddMessageModal(false);
      setNewMessage({
        title: '',
        content: '',
        allowComments: true,
        attachmentsName: '',
        attachmentsUrl: ''
      });
    } catch (e: any) {
      toast.error('Erreur lors de la publication : ' + e.message);
    }
  };

  const handleAddComment = async (messageId: string) => {
    const inputVal = commentInputs[messageId];
    if (!inputVal || !inputVal.trim()) return;

    try {
      const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Visiteur';
      const uRole = selectedRole === 'teacher' ? 'Enseignant' : 'Étudiant';

      const updatedLocal = academicService.addComment(
        messageId,
        inputVal,
        user?.id || 'anon_commenter_id',
        uName,
        uRole
      );

      if (updatedLocal) {
        // Direct replication in firestore
        await setDoc(doc(db, 'academic_messages', messageId), updatedLocal, { merge: true });
        
        setCommentInputs(prev => ({ ...prev, [messageId]: '' }));
        toast.success('Commentaire publié !');
      }
    } catch (e: any) {
      toast.error('Erreur d\'envoi du commentaire : ' + e.message);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Supprimer définitivement ce message de classe ?')) return;
    try {
      await deleteDoc(doc(db, 'academic_messages', messageId));
      toast.success('Message supprimé !');
    } catch (e: any) {
      toast.error('Erreur lors de la suppression' + e.message);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Supprimer définitivement ce document d\'étude ?')) return;
    try {
      await deleteDoc(doc(db, 'academic_documents', docId));
      toast.success('Document supprimé !');
    } catch (e: any) {
      toast.error('Erreur lors de la suppression' + e.message);
    }
  };

  return (
    <div id="class_dashboard_container" className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Espace Académique
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-slate-800 text-slate-300">
                UJKZ / {currentClass?.academicYear || '2025-2026'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{currentClass?.name || 'Salle de classe'}</h1>
            <p className="text-slate-400 text-xs mt-1">
              Gérant de promotion: <span className="text-slate-200 font-bold">{currentClass?.responsible || 'Non assigné'}</span> • Effectif: <span className="text-slate-100 font-bold">{currentClass?.studentCount || 0} inscrits</span>
            </p>
          </div>

          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold leading-normal">
              Simulation : {selectedRole}
            </span>
          </div>
        </div>
      </div>

      {/* DASHBOARD TABS NAVIGATION */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex max-w-md">
        <button
          onClick={() => setCurrentTab('timetable')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all ${currentTab === 'timetable' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar size={15} />
          Emploi du Temps
        </button>
        <button
          onClick={() => setCurrentTab('documents')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all ${currentTab === 'documents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <FileText size={15} />
          Cours & Docs
        </button>
        <button
          onClick={() => setCurrentTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all ${currentTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <MessageSquare size={15} />
          Messagerie Directe
        </button>
      </div>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <div className="transition-all duration-200">
        
        {/* ==========================================
            TAB: TIMETABLE
            ========================================== */}
        {currentTab === 'timetable' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Moduler le Calendrier Hebdomadaire</h3>
                <p className="text-slate-500 text-xs mt-0.5">Saisissez les cours directement ou consultez l'historique et les fichiers PDF officiels.</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <History size={14} className="text-slate-500" />
                  Historique ({timetable?.versions.length || 0})
                </button>
                
                {canManageClass && !isEditingGrid && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowUploadTimetableModal(true)}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Upload size={14} />
                      Téléverser un PDF d'EDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGrid(true)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Edit size={14} />
                      Saisir l'Emploi du Temps
                    </button>
                  </>
                )}

                {isEditingGrid && (
                  <button
                    type="button"
                    onClick={() => setIsEditingGrid(false)}
                    className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw size={14} />
                    Annuler Saisie
                  </button>
                )}
              </div>
            </div>

            {/* CURRENT ACTIVE TIMETABLE PDF BLOCK & UPDATE DATES */}
            {timetable ? (
              <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-200/50">
                    PDF
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">{timetable.currentFileName}</span>
                      <span className="px-2 py-0.5 bg-slate-200/80 text-slate-800 text-[9px] font-extrabold rounded-full">
                        Version Actuelle (V{timetable.versions.length ? Math.max(...timetable.versions.map(v => v.version)) : 1})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Dernière mise à jour : <span className="font-bold text-slate-700">{timetable.lastUpdated ? new Date(timetable.lastUpdated).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date inconnue'}</span> par <span className="font-bold text-slate-700">{timetable.updatedBy || 'Administration'}</span>
                    </p>
                    {timetable.versions[0]?.description && (
                      <p className="text-[11px] text-slate-600 italic leading-snug">
                        "{timetable.versions[0].description}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto shrink-0">
                  <a
                    href={timetable.currentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 md:flex-none px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Download size={14} className="text-slate-500" />
                    Télécharger PDF d'EDT
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-200 p-4 sm:p-5 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1">
                  <span className="text-xs font-black text-amber-900 block">Aucun fichier PDF d'emploi du temps officiel n'est configuré</span>
                  <p className="text-amber-800/80 text-xs">Veuillez téléverser un fichier officiel ou saisir directement la grille hebdomadaire interactive pour informer les étudiants.</p>
                </div>
              </div>
            )}	

            {/* VERSION LOGS DRAWER OVERLAY */}
            {showVersionHistory && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animation-slide-in">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <History size={14} className="text-slate-500" />
                  Archives des emplois du temps de la classe
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timetable?.versions.map((ver, i) => (
                    <div key={ver.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex justify-between items-start text-xs relative">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">Version {ver.version}</span>
                          {i === 0 && (
                            <span className="px-1.5 py-0.5 text-[8px] bg-emerald-100 text-emerald-800 font-extrabold rounded uppercase">Active</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px] italic">"{ver.description || 'Aucune notice de modification.'}"</p>
                        <span className="block text-[9px] text-slate-400">Par {ver.uploadedBy} le {new Date(ver.uploadedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex gap-1">
                        {canManageClass && i > 0 && (
                          <button
                            onClick={() => handleRollbackVersion(ver)}
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1"
                            title="Restaurer cette version"
                          >
                            <ArrowLeftRight size={12} />
                            Restaurer
                          </button>
                        )}
                        <a
                          href={ver.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/50 rounded-lg text-[10px] font-bold"
                        >
                          <Download size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                  {(!timetable || timetable.versions.length === 0) && (
                    <div className="col-span-2 text-center text-slate-400 py-6 text-xs italic">
                      Aucune version de rechange disponible dans la base de données.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* INTERACTIVE WEEKLY DATABASE GRID EDITOR & VIEWPORT */}
            <div className="overflow-x-auto border border-slate-200 rounded-3xl bg-slate-50">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="p-4 text-xs font-black uppercase text-slate-600 tracking-wider w-36">Créneaux / Jours</th>
                    {WEEKDAYS.map(day => (
                      <th key={day} className="p-4 text-xs font-black uppercase text-slate-600 tracking-wider text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {TIMESLOTS.map(slot => (
                    <tr key={slot} className="hover:bg-slate-100/50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-700 whitespace-nowrap bg-slate-100/80">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          {slot}
                        </div>
                      </td>
                      {WEEKDAYS.map(day => {
                        const cell = getCellData(day, slot);
                        return (
                          <td key={`${day}-${slot}`} className="p-3 text-center align-middle relative min-w-[140px]">
                            {isEditingGrid ? (
                              <div className="space-y-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
                                <input
                                  type="text"
                                  value={cell.subject}
                                  onChange={e => handleCellChange(day, slot, 'subject', e.target.value)}
                                  placeholder="Matière"
                                  className="w-full text-center px-1 py-0.5 text-xs font-bold bg-slate-50 border-0 outline-none focus:bg-emerald-50 rounded"
                                />
                                <input
                                  type="text"
                                  value={cell.teacher}
                                  onChange={e => handleCellChange(day, slot, 'teacher', e.target.value)}
                                  placeholder="Enseignant"
                                  className="w-full text-center px-1 py-0.5 text-[10px] bg-slate-50 border-0 outline-none focus:bg-emerald-50 rounded text-slate-600"
                                />
                                <input
                                  type="text"
                                  value={cell.room}
                                  onChange={e => handleCellChange(day, slot, 'room', e.target.value)}
                                  placeholder="Salle"
                                  className="w-full text-center px-1 py-0.5 text-[10px] bg-slate-50 border-0 outline-none focus:bg-emerald-50 rounded text-amber-700 font-semibold"
                                />
                              </div>
                            ) : (
                              cell.subject ? (
                                <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-2xl space-y-1 transform hover:scale-[1.02] transition-transform shadow-xs">
                                  <div className="font-extrabold text-emerald-950 text-xs leading-snug">{cell.subject}</div>
                                  <div className="text-[10px] text-slate-500 font-medium">{cell.teacher}</div>
                                  <span className="inline-block px-1.5 py-0.5 mt-1 bg-amber-100 text-amber-900 border border-amber-200/50 text-[8px] font-black rounded font-mono">
                                    Slot: {cell.room}
                                  </span>
                                </div>
                              ) : (
                                <div className="p-4 text-xs text-slate-350 italic font-light">Libre</div>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DIRECT SUBMIT GRID FORM ACTIONS */}
            {isEditingGrid && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-300/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in-50 duration-200">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Motif de la modification (Requis pour l'historique de version) :</label>
                  <input
                    type="text"
                    required
                    value={timetableDesc}
                    onChange={e => setTimetableDesc(e.target.value)}
                    placeholder="ex: Report de programmation, Changement de salle pour le cours de Médecine Générale..."
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={handleSaveInteractiveGrid}
                  disabled={!timetableDesc.trim()}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm shrink-0 disabled:opacity-50 transition-all border border-emerald-700"
                >
                  <Save size={14} />
                  Enregistrer Nouvelle Version
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB: DOCUMENTS PÉDAGOGIQUES
            ========================================== */}
        {currentTab === 'documents' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Espace de Partage Documentaire</h3>
                <p className="text-slate-500 text-xs mt-0.5">Supports officiels rattachés au programme pédagogique de la classe.</p>
              </div>
              {canManageClass && (
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Plus size={14} />
                  Ajouter un Document
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <div key={doc.id} className="p-5 border border-slate-200 rounded-3xl hover:border-emerald-500/40 hover:shadow-md transition-all space-y-4 flex flex-col justify-between bg-white relative group">
                  
                  {/* DELETE DOC BUTTON */}
                  {canManageClass && (
                    <button 
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="absolute top-4 right-4 p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-150 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 font-extrabold text-[8px] uppercase rounded border ${
                        doc.category === 'Cours' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/50' :
                        doc.category === 'TD' ? 'bg-orange-50 text-orange-700 border-orange-200/50' :
                        doc.category === 'TP' ? 'bg-purple-50 text-purple-700 border-purple-200/50' :
                        doc.category === 'Examen' ? 'bg-rose-50 text-rose-700 border-rose-200/50' :
                        'bg-slate-50 text-slate-700 border-slate-250'
                      }`}>
                        {doc.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{doc.fileName.split('.').pop()?.toUpperCase() || 'PDF'}</span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug tracking-tight">{doc.title}</h4>
                    <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed font-light">
                      {doc.description || 'Aucun résumé ou description disponible.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div>
                      <span className="block font-bold">Par {doc.uploadedBy}</span>
                      <span className="text-[9px] text-slate-400 font-light block">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleDownloadDoc(doc.id, doc.fileUrl)}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <Download size={13} />
                      {doc.downloadsCount || 0}
                    </button>
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 text-xs italic">
                  Aucun support de cours disponible pour l'instant.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: CLASS CHAT & REAL-TIME COMMUNICATIONS
            ========================================== */}
        {currentTab === 'chat' && (
          <ClassChat
            classeId={classeId}
            selectedRole={selectedRole}
            messages={messages}
            onPostMessage={async (form) => {
              try {
                const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administration';
                const uRole = selectedRole === 'teacher' ? 'Enseignant' : 'Délégué';
                const payload = academicService.saveMessage({
                  classeId,
                  universityId: 'UJKZ',
                  title: form.title,
                  content: form.content,
                  authorId: user?.id || 'sys_publisher',
                  authorName: uName,
                  authorRole: uRole,
                  allowComments: form.allowComments,
                  attachments: form.attachmentsName ? [{ fileName: form.attachmentsName, fileUrl: form.attachmentsUrl, fileType: 'PDF' }] : []
                });

                // Direct replication in Firestore Database
                await setDoc(doc(db, 'academic_messages', payload.id), payload);

                // Broadcast live notification
                const notifRef = doc(collection(db, 'academic_notifications'));
                await setDoc(notifRef, {
                  id: notifRef.id,
                  userId: 'all',
                  classeId,
                  title: `📣 Nouvelle communication : ${payload.title}`,
                  content: `${payload.authorName} a posté une nouvelle communication de classe.`,
                  createdAt: new Date().toISOString(),
                  read: false,
                  type: 'message'
                });

                toast.success('Annonce publiée en direct !');
              } catch (e: any) {
                toast.error('Erreur lors de la publication : ' + e.message);
              }
            }}
            onAddComment={async (messageId, content) => {
              try {
                const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administration';
                const uRole = selectedRole === 'teacher' ? 'Enseignant' : 'Étudiant';
                
                const updatedLocal = academicService.addComment(
                  messageId,
                  content,
                  user?.id || 'sys_commenter',
                  uName,
                  uRole
                );

                if (updatedLocal) {
                  await setDoc(doc(db, 'academic_messages', messageId), updatedLocal, { merge: true });
                  toast.success('Réponse publiée !');
                }
              } catch (e: any) {
                toast.error('Erreur lors du commentaire : ' + e.message);
              }
            }}
            onDeleteMessage={handleDeleteMessage}
          />
        )}

      </div>

      {/* ==========================================
          MODALS SECTION
          ========================================== */}
      
      {/* 1. NEW DOCUMENT MODAL */}
      {showAddDocModal && (
        <div id="new_doc_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm sm:text-base">Mettre en ligne un Document</h3>
              <button onClick={() => setShowAddDocModal(false)} className="text-white hover:opacity-80">
                &times;
              </button>
            </div>
            <form onSubmit={handleAddDocument} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Catégorie du Support</label>
                <select
                  value={newDocForm.category}
                  onChange={e => setNewDocForm({ ...newDocForm, category: e.target.value as any })}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Cours">Support de Cours</option>
                  <option value="TD">Travaux Dirigés (TD)</option>
                  <option value="TP">Travaux Pratiques (TP)</option>
                  <option value="Examen">Sujet d'Examen</option>
                  <option value="Corrigé">Corrigé Examen</option>
                  <option value="Autre">Ressource Complémentaire</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Titre explicite</label>
                <input
                  type="text"
                  required
                  value={newDocForm.title}
                  onChange={e => setNewDocForm({ ...newDocForm, title: e.target.value })}
                  placeholder="ex: Patrons de conception structurels (GoF)"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description / Résumé</label>
                <textarea
                  value={newDocForm.description}
                  onChange={e => setNewDocForm({ ...newDocForm, description: e.target.value })}
                  placeholder="Expliquez brièvement l'objet de ce document..."
                  rows={3}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nom du fichier PDF physique</label>
                <input
                  type="text"
                  required
                  value={newDocForm.fileName}
                  onChange={e => setNewDocForm({ ...newDocForm, fileName: e.target.value })}
                  placeholder="ex: Design_Patterns_Part_2.pdf"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddDocModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm">Publier le document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. NEW MESSAGE MODAL */}
      {showAddMessageModal && (
        <div id="new_msg_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm sm:text-base">Diffuser une Annonce</h3>
              <button onClick={() => setShowAddMessageModal(false)} className="text-white hover:opacity-80">
                &times;
              </button>
            </div>
            <form onSubmit={handlePostMessage} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Objet de l'annonce</label>
                <input
                  type="text"
                  required
                  value={newMessage.title}
                  onChange={e => setNewMessage({ ...newMessage, title: e.target.value })}
                  placeholder="ex: Report de session de ratrapage ou note de service"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Contenu du message</label>
                <textarea
                  required
                  value={newMessage.content}
                  onChange={e => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder="Saisissez la communication détaillée..."
                  rows={4}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                <span className="text-xs font-extrabold text-slate-800 block mb-1">Fichier de support joint (Facultatif)</span>
                <input
                  type="text"
                  value={newMessage.attachmentsName}
                  onChange={e => setNewMessage({ ...newMessage, attachmentsName: e.target.value, attachmentsUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' })}
                  placeholder="Nom de la pièce jointe (ex: Note_Explicative.pdf)"
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowComments"
                  checked={newMessage.allowComments}
                  onChange={e => setNewMessage({ ...newMessage, allowComments: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="allowComments" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Autoriser les commentaires & questions des étudiants
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddMessageModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm">Publier en direct</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. UPLOAD TIMETABLE VERSION MODAL */}
      {showUploadTimetableModal && (
        <div id="upload_timetable_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <Upload size={16} />
                Téléverser une version d'EDT
              </h3>
              <button onClick={() => setShowUploadTimetableModal(false)} className="text-white hover:opacity-80">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleUploadTimetablePDF} className="p-6 space-y-4">
              <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 font-medium">
                Cette action créera une nouvelle version de l'emploi du temps pour cette classe. L'ancienne version sera archivée dans l'historique et restera consultable à tout moment.
              </div>

              {/* Pseudo-upload Drag and Drop Area for premium styling */}
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50 hover:bg-emerald-50/10 transition-all space-y-1">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-500">
                  <Upload size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 block">Sélectionnez le fichier PDF de l'EDT</span>
                <p className="text-[10px] text-slate-400">PDF officiel de la faculté, max 10 Mo</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nom du Fichier de l'Emploi du Temps</label>
                <input
                  type="text"
                  required
                  value={newTimetableForm.fileName}
                  onChange={e => setNewTimetableForm({ ...newTimetableForm, fileName: e.target.value })}
                  placeholder="ex: EDT_L3GL_Semestre2_Revision5.pdf"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">URL du Fichier (Simulé ou Réel)</label>
                <input
                  type="text"
                  required
                  value={newTimetableForm.fileUrl}
                  onChange={e => setNewTimetableForm({ ...newTimetableForm, fileUrl: e.target.value })}
                  placeholder="https://example.com/edt.pdf"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Motif de la mise à jour / Notes</label>
                <textarea
                  required
                  value={newTimetableForm.description}
                  onChange={e => setNewTimetableForm({ ...newTimetableForm, description: e.target.value })}
                  placeholder="ex: Programmation de la semaine d'examens ou réaffectation de la salle de conférence."
                  rows={3}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowUploadTimetableModal(false)} 
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm"
                >
                  Publier la Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
