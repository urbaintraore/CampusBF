import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { academicService } from '@/services/academicService';
import { logService } from '@/services/logService';
import ClassDashboard from '@/components/ClassDashboard';
import { 
  School, 
  Users, 
  FileText, 
  Calendar, 
  Plus, 
  Trash2, 
  X,
  Edit3, 
  Archive, 
  Search, 
  Filter, 
  Upload, 
  ArrowRight, 
  ChevronRight, 
  Download, 
  History, 
  MessageSquare, 
  Paperclip, 
  CornerDownRight, 
  Flag, 
  Bell, 
  Info, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  UserPlus, 
  Sliders, 
  MessageCircle,
  Hash,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Department, 
  Filiere, 
  Classe, 
  AcademicStudent, 
  Timetable, 
  AcademicDocument, 
  ClassMessage, 
  AcademicNotification,
  AcademicRole 
} from '@/types/academic';

export default function Departments() {
  const { user } = useAuth();
  
  // --- ROLE SWITCHER FOR DEMO / RBAC VALIDATION ---
  const [selectedRole, setSelectedRole] = useState<AcademicRole>('admin_university');
  
  // --- ACADEMIC STATE ENGINE ---
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [students, setStudents] = useState<AcademicStudent[]>([]);
  const [activeTab, setActiveTab] = useState<'departments' | 'classes' | 'dashboard' | 'moderation'>('departments');

  // --- FILTERS & SEARCH STATES ---
  const [searchDept, setSearchDept] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedFiliereId, setSelectedFiliereId] = useState<string>('');
  const [selectedClasseId, setSelectedClasseId] = useState<string>('class_l3gl_ujkz'); // Default L3 GL for instant visualization

  // --- PAGINATION STATES ---
  const [deptPage, setDeptPage] = useState(1);
  const itemsPerPage = 5;

  // --- MODAL & FORM STATES ---
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showFiliereModal, setShowFiliereModal] = useState(false);
  const [showClasseModal, setShowClasseModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Department Form
  const [deptForm, setDeptForm] = useState({
    id: '',
    name: '',
    code: '',
    description: '',
    responsible: '',
    status: 'active' as 'active' | 'archived'
  });

  // Filière Form
  const [filiereForm, setFiliereForm] = useState({
    id: '',
    departmentId: '',
    name: '',
    code: '',
    description: '',
    responsible: '',
    status: 'active' as 'active' | 'archived'
  });

  // Classe Form
  const [classeForm, setClasseForm] = useState({
    id: '',
    filiereId: '',
    departmentId: '',
    name: '',
    code: '',
    academicYear: '2025-2026',
    responsible: '',
    status: 'active' as 'active' | 'archived'
  });

  // Student Form (Single)
  const [studentForm, setStudentForm] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ine: '',
    departmentId: '',
    filiereId: '',
    classeId: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Student CSV/Bulk Import
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);

  const parsedBulkRows = useMemo(() => {
    if (!bulkInput.trim()) return [];
    return bulkInput.split('\n').filter(l => l.trim()).map((line, idx) => {
      const parts = line.split(/[;,]/);
      const lastName = parts[0]?.trim() || '';
      const firstName = parts[1]?.trim() || '';
      const email = parts[2]?.trim() || '';
      const phone = parts[3]?.trim() || '';

      const errors: string[] = [];
      if (!lastName) errors.push('Nom de famille requis');
      if (!firstName) errors.push('Prénom requis');
      if (email && !email.includes('@')) errors.push('Format email non valide (doit contenir @)');

      return {
        lineNum: idx + 1,
        rawText: line,
        lastName,
        firstName,
        email,
        phone,
        errors,
        isValid: errors.length === 0 && lastName && firstName
      };
    });
  }, [bulkInput]);

  // Emploi du Temps Replacement
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [timetableForm, setTimetableForm] = useState({
    fileName: 'EDT_Nouveau_Planning_GL.pdf',
    description: 'Planning révisé pour la reprise des examens de TD',
    uploadedBy: 'Filière Génie Logiciel'
  });

  // Document Form
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'Cours' as any,
    description: '',
    fileName: 'Cours_Réseaux_S3_Complément.pdf',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  });

  // Message / Announcement Form
  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    allowComments: true,
    attachmentsName: '',
    attachmentsUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  });

  // Comment Form state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Flagged/Reported elements (Documents & Messages)
  const [flaggedDocs, setFlaggedDocs] = useState<string[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<string[]>([]);
  const [reportedReasons, setReportedReasons] = useState<Record<string, string>>({});

  // Active notifications matching current simulation user
  const [liveNotifications, setLiveNotifications] = useState<AcademicNotification[]>([]);

  // Load and refresh cache
  const loadData = () => {
    const depts = academicService.getDepartments();
    const fils = academicService.getFilieres();
    const clsList = academicService.getClasses();
    const stds = academicService.getStudents();
    
    setDepartments(depts);
    setFilieres(fils);
    setClasses(clsList);
    setStudents(stds);

    if (depts.length > 0 && !selectedDeptId) {
      setSelectedDeptId(depts[0].id);
    }
    if (fils.length > 0 && !selectedFiliereId) {
      setSelectedFiliereId(fils[0].id);
    }

    // Load active notifications
    const mockStudentId = "stud_1"; 
    setLiveNotifications(academicService.getNotifications(mockStudentId));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync role defaults
  useEffect(() => {
    if (selectedRole === 'student') {
      setActiveTab('dashboard');
    } else if (selectedRole === 'teacher') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('departments');
    }
  }, [selectedRole]);

  // --- CONDITIONAL PERMISSIONS CHECKS ---
  const canEditStructure = useMemo(() => {
    return ['super_admin', 'admin_university'].includes(selectedRole);
  }, [selectedRole]);

  const canEditAcademicFields = useMemo(() => {
    return ['super_admin', 'admin_university', 'chef_departement', 'responsable_filiere'].includes(selectedRole);
  }, [selectedRole]);

  const canManageClassroom = useMemo(() => {
    return ['super_admin', 'admin_university', 'chef_departement', 'responsable_filiere', 'responsable_classe', 'teacher'].includes(selectedRole);
  }, [selectedRole]);

  // --- FILTERS logic for Departments table ---
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(searchDept.toLowerCase()) || d.code.toLowerCase().includes(searchDept.toLowerCase());
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [departments, searchDept, statusFilter]);

  // Pagination slice
  const paginatedDepts = useMemo(() => {
    const start = (deptPage - 1) * itemsPerPage;
    return filteredDepartments.slice(start, start + itemsPerPage);
  }, [filteredDepartments, deptPage]);

  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);

  // Students of current selected class
  const classStudents = useMemo(() => {
    return students.filter(s => s.classeId === selectedClasseId);
  }, [students, selectedClasseId]);

  // Documents of current class
  const classDocs = useMemo(() => {
    return academicService.getDocuments(selectedClasseId).filter(d => !flaggedDocs.includes(d.id));
  }, [selectedClasseId, flaggedDocs]);

  // Messages of current class
  const classMessages = useMemo(() => {
    return academicService.getMessages(selectedClasseId).filter(m => !flaggedMessages.includes(m.id));
  }, [selectedClasseId, flaggedMessages]);

  // Details for Selected class
  const selectedClasseDetails = useMemo(() => {
    return classes.find(c => c.id === selectedClasseId);
  }, [classes, selectedClasseId]);

  // Timetable for current class
  const currentTimetable = useMemo(() => {
    return academicService.getTimetable(selectedClasseId);
  }, [selectedClasseId]);

  // Save Department
  const handleSaveDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: deptForm.name,
      code: deptForm.code,
      description: deptForm.description,
      responsible: deptForm.responsible,
      status: deptForm.status,
      universityId: 'UJKZ'
    };

    const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administrateur';
    if (deptForm.id) {
      academicService.saveDepartment({ ...payload, id: deptForm.id });
      toast.success('Département modifié avec succès !');
      logService.logAudit(
        user?.id || 'admin',
        uName,
        user?.email || '',
        'Modification de département',
        `Le département ${payload.name} (${payload.code}) a été édité par l'administrateur.`
      ).catch(console.error);
    } else {
      academicService.saveDepartment(payload);
      toast.success('Département créé avec succès !');
      logService.logAudit(
        user?.id || 'admin',
        uName,
        user?.email || '',
        'Création de département',
        `Le département ${payload.name} (${payload.code}) a été créé par l'administrateur.`
      ).catch(console.error);
    }

    setShowDeptModal(false);
    setDeptForm({ id: '', name: '', code: '', description: '', responsible: '', status: 'active' });
    loadData();
  };

  // Open Edit Department
  const editDept = (dept: Department) => {
    setDeptForm({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      description: dept.description,
      responsible: dept.responsible,
      status: dept.status
    });
    setShowDeptModal(true);
  };

  // Open Edit Filière
  const editFiliere = (fil: Filiere) => {
    setFiliereForm({
      id: fil.id,
      departmentId: fil.departmentId,
      name: fil.name,
      code: fil.code,
      description: fil.description,
      responsible: fil.responsible,
      status: fil.status
    });
    setShowFiliereModal(true);
  };

  // Open Edit Classe
  const editClasse = (cls: Classe) => {
    setClasseForm({
      id: cls.id,
      filiereId: cls.filiereId,
      departmentId: cls.departmentId,
      name: cls.name,
      code: cls.code,
      academicYear: cls.academicYear,
      responsible: cls.responsible,
      status: cls.status
    });
    setShowClasseModal(true);
  };

  // Archive Department
  const archiveDept = (dept: Department) => {
    const targetStatus = dept.status === 'active' ? 'archived' : 'active';
    academicService.saveDepartment({ ...dept, status: targetStatus });
    toast.info(`Département ${targetStatus === 'archived' ? 'archivé' : 'désarchivé'} !`);
    
    const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administrateur';
    logService.logAudit(
      user?.id || 'admin',
      uName,
      user?.email || '',
      'Modification de département',
      `Le département ${dept.name} (${dept.code}) a été ${targetStatus === 'archived' ? 'archivé' : 'désarchivé'} par l'administrateur.`
    ).catch(console.error);

    loadData();
  };

  // Delete Department
  const deleteDept = (id: string) => {
    const dept = departments.find(d => d.id === id);
    const deptName = dept ? `${dept.name} (${dept.code})` : id;
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce département ? Cela supprimera toutes les filières et classes associées.')) {
      academicService.deleteDepartment(id);
      toast.success('Département supprimé !');
      
      const uName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Administrateur';
      logService.logAudit(
        user?.id || 'admin',
        uName,
        user?.email || '',
        'Suppression de département',
        `Le département ${deptName} a été supprimé ainsi que ses filières et classes par l'administrateur.`
      ).catch(console.error);

      loadData();
    }
  };

  // Save Filière
  const handleSaveFiliereSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filiereForm.departmentId) {
      toast.error("Veuillez sélectionner un département valide.");
      return;
    }
    const payload = {
      departmentId: filiereForm.departmentId,
      name: filiereForm.name,
      code: filiereForm.code,
      description: filiereForm.description,
      responsible: filiereForm.responsible,
      status: filiereForm.status,
      universityId: 'UJKZ'
    };

    if (filiereForm.id) {
      academicService.saveFiliere({ ...payload, id: filiereForm.id });
      toast.success('Filière modifiée avec succès !');
    } else {
      academicService.saveFiliere(payload);
      toast.success('Filière créée avec succès !');
    }

    setShowFiliereModal(false);
    setFiliereForm({ id: '', departmentId: '', name: '', code: '', description: '', responsible: '', status: 'active' });
    loadData();
  };

  const deleteFiliere = (id: string) => {
    if (confirm('Supprimer cette filière ?')) {
      academicService.deleteFiliere(id);
      toast.success('Filière supprimée !');
      loadData();
    }
  };

  // Save Classe
  const handleSaveClasseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classeForm.filiereId) {
      toast.error("Filière requise !");
      return;
    }
    const matchingFiliere = filieres.find(f => f.id === classeForm.filiereId);
    const departmentId = matchingFiliere ? matchingFiliere.departmentId : '';

    const payload = {
      filiereId: classeForm.filiereId,
      departmentId,
      universityId: 'UJKZ',
      name: classeForm.name,
      code: classeForm.code,
      academicYear: classeForm.academicYear,
      responsible: classeForm.responsible,
      status: classeForm.status
    };

    if (classeForm.id) {
      academicService.saveClasse({ ...payload, id: classeForm.id });
      toast.success('Classe modifiée !');
    } else {
      academicService.saveClasse(payload);
      toast.success('Classe créée avec succès !');
    }

    setShowClasseModal(false);
    setClasseForm({ id: '', filiereId: '', departmentId: '', name: '', code: '', academicYear: '2025-2026', responsible: '', status: 'active' });
    loadData();
  };

  const deleteClasse = (id: string) => {
    if (confirm('Fermer/Supprimer cette classe académique ?')) {
      academicService.deleteClasse(id);
      toast.success('Classe supprimée !');
      loadData();
    }
  };

  // Save Student (Manual Single)
  const handleSaveStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.classeId) {
      toast.error("Une classe d'affectation est requise.");
      return;
    }
    const matchingClass = classes.find(c => c.id === studentForm.classeId);
    const payload = {
      firstName: studentForm.firstName,
      lastName: studentForm.lastName,
      email: studentForm.email,
      phone: studentForm.phone,
      ine: studentForm.ine || "B" + Math.floor(100000 + Math.random() * 900000) + "0F",
      universityId: 'UJKZ',
      classeId: studentForm.classeId,
      filiereId: matchingClass ? matchingClass.filiereId : '',
      departmentId: matchingClass ? matchingClass.departmentId : '',
      status: studentForm.status
    };

    academicService.saveStudent(payload);
    toast.success('Étudiant ajouté et rattaché automatiquement à la classe !');
    setShowStudentModal(false);
    setStudentForm({ id: '', firstName: '', lastName: '', email: '', phone: '', ine: '', departmentId: '', filiereId: '', classeId: '', status: 'active' });
    loadData();
  };

  // Student Bulk Import
  const handleBulkStudentsImport = () => {
    if (!bulkInput.trim()) {
      toast.error('Veuillez entrer des données d\'étudiants (Nom, Prénom, Email).');
      return;
    }

    const lines = bulkInput.split('\n');
    const importedList: any[] = [];
    const targetClass = classes.find(c => c.id === selectedClasseId);

    if (!targetClass) {
      toast.error('Veuillez sélectionner une classe active d\'affectation.');
      return;
    }

    lines.forEach(line => {
      if (!line.trim()) return;
      const parts = line.split(/[;,]/);
      const lastName = parts[0]?.trim() || '';
      const firstName = parts[1]?.trim() || '';
      const email = parts[2]?.trim() || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ujkz.bf`;
      const phone = parts[3]?.trim() || '+226 ' + Math.floor(70000000 + Math.random() * 9000000);
      const ine = "B" + Math.floor(200000 + Math.random() * 800000) + "BF";

      if (firstName && lastName) {
        importedList.push({
          firstName,
          lastName,
          email,
          phone,
          ine,
          universityId: 'UJKZ',
          classeId: selectedClasseId,
          filiereId: targetClass.filiereId,
          departmentId: targetClass.departmentId,
          status: 'active'
        });
      }
    });

    if (importedList.length === 0) {
      toast.error('Aucune ligne valide trouvée. format: Nom, Prénom, Email');
      return;
    }

    academicService.importStudents(importedList);
    toast.success(`${importedList.length} étudiants importés et associés automatiquement à la classe !`);
    setBulkInput('');
    setIsBulkMode(false);
    setShowStudentModal(false);
    loadData();
  };

  // Seeding Sample bulk students
  const seedBulkImporterTemplate = () => {
    const seed = "KOUANDA;Awa;awa.kouanda@ujkz.bf;+226 50 45 12 89\nZONGO;Inoussa;inoussa.zongo@ujkz.bf;+226 71 88 99 00\nTIENDREBEOGO;Sonia;sonia.t@ujkz.bf;+226 66 11 22 33\nILBOUDO;Faisal;faisal.ilboudo@ujkz.bf;+226 78 55 44 33";
    setBulkInput(seed);
    toast.info('Modèle d\'étudiants injecté avec succès ! Cliquez sur "Lancer l\'importation"');
  };

  // Delete Student
  const deleteStudent = (id: string, classeId: string) => {
    if (confirm('Délier cet étudiant de la classe ?')) {
      academicService.deleteStudent(id, classeId);
      toast.success('Étudiant délié !');
      loadData();
    }
  };

  // Replace Timetable
  const handleReplaceTimetableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    academicService.addOrReplaceTimetable(
      selectedClasseId,
      'UJKZ',
      timetableForm.fileName,
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      timetableForm.uploadedBy,
      timetableForm.description
    );

    toast.success('Emploi du temps mis à jour ! Notification envoyée aux étudiants.');
    setShowTimetableModal(false);
    setTimetableForm({ fileName: 'EDT_Planning_Révisé.pdf', description: '', uploadedBy: 'Directeur des études' });
    loadData();
  };

  // Add Document
  const handleAddDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeClass = classes.find(c => c.id === selectedClasseId);
    if (!activeClass) return;

    academicService.saveDocument({
      classeId: selectedClasseId,
      departmentId: activeClass.departmentId,
      filiereId: activeClass.filiereId,
      universityId: 'UJKZ',
      title: docForm.title,
      category: docForm.category,
      description: docForm.description,
      fileName: docForm.fileName,
      fileUrl: docForm.fileUrl,
      fileType: 'pdf',
      uploadedBy: selectedRole === 'teacher' ? 'M. Urbain TRAORÉ (Enseignant)' : 'Admin Université'
    });

    toast.success('Document partagé avec succès ! Les élèves ont été notifiés.');
    setShowDocModal(false);
    setDocForm({ title: '', category: 'Cours', description: '', fileName: 'Cours_Réseaux_S3_Complément.pdf', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' });
    loadData();
  };

  const deleteDoc = (id: string) => {
    if (confirm('Supprimer ce document académique ?')) {
      academicService.deleteDocument(id);
      toast.success('Document supprimé !');
      loadData();
    }
  };

  const handleDownloadDoc = (docId: string) => {
    academicService.incrementDownload(docId);
    toast.success('Téléchargement lancé...');
    loadData();
  };

  // Post Class Message
  const handlePostMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeClass = classes.find(c => c.id === selectedClasseId);
    if (!activeClass) return;

    const attachments = messageForm.attachmentsName ? [{
      fileName: messageForm.attachmentsName,
      fileUrl: messageForm.attachmentsUrl,
      fileType: 'pdf'
    }] : [];

    academicService.saveMessage({
      classeId: selectedClasseId,
      universityId: 'UJKZ',
      title: messageForm.title,
      content: messageForm.content,
      allowComments: messageForm.allowComments,
      authorId: user?.id || 'simulated',
      authorName: selectedRole === 'teacher' ? 'M. Urbain TRAORÉ' : 'Directeur des Études',
      authorRole: selectedRole === 'teacher' ? 'Enseignant' : 'Chef Scolarité',
      attachments
    });

    toast.success('Annonce publiée à l\'attention de la classe et des familles !');
    setShowMessageModal(false);
    setMessageForm({ title: '', content: '', allowComments: true, attachmentsName: '', attachmentsUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' });
    loadData();
  };

  // Submit commentaries
  const handlePostCommentary = (messageId: string) => {
    const content = commentInputs[messageId];
    if (!content || !content.trim()) return;

    // determine author metadata based on selected simulation role
    let authorName = "Étudiant CampusBF";
    let authorRole = "Étudiant";
    if (selectedRole === 'teacher') {
      authorName = "M. Urbain TRAORÉ";
      authorRole = "Enseignant";
    } else if (selectedRole === 'chef_departement') {
      authorName = "Pr. Bernard ZONGO";
      authorRole = "Chef de Département";
    }

    academicService.addComment(
      messageId,
      content,
      user?.id || 'sim_auth',
      authorName,
      authorRole
    );

    // clear input
    setCommentInputs(prev => ({ ...prev, [messageId]: '' }));
    toast.success('Commentaire posté !');
    loadData();
  };

  // Reporting/Flagging feature
  const flagItem = (id: string, type: 'document' | 'message') => {
    const reason = prompt('Pourquoi signalez-vous ce contenu comme inapproprié ? (ex: Erreur de sujet, doublon, contenu injurieux, etc.)');
    if (reason === null) return; // cancelled
    if (!reason.trim()) {
      toast.error('Un motif de signalement est requis.');
      return;
    }

    if (type === 'document') {
      setFlaggedDocs(prev => [...prev, id]);
    } else {
      setFlaggedMessages(prev => [...prev, id]);
    }

    setReportedReasons(prev => ({ ...prev, [id]: reason }));
    toast.warning('Le contenu a été signalé et masqué temporairement pour modération administrative.');
  };

  // Dismiss / Unflag element
  const resolveFlag = (id: string, type: 'document' | 'message') => {
    if (type === 'document') {
      setFlaggedDocs(prev => prev.filter(item => item !== id));
    } else {
      setFlaggedMessages(prev => prev.filter(item => item !== id));
    }
    toast.success('Le contenu a été réhabilité par l\'administrateur.');
  };

  // Permanent Delete flagged items
  const archiveFlaggedItem = (id: string, type: 'document' | 'message') => {
    if (type === 'document') {
      academicService.deleteDocument(id);
      setFlaggedDocs(prev => prev.filter(item => item !== id));
    } else {
      // simulate deleting message from service
      toast.success('Publication supprimée définitivement.');
    }
    loadData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 py-4 sm:p-2">
      
      {/* BURKINABE PREMIUM STYLISH BANNER */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-950 to-slate-900 border border-emerald-500/30 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle Burkina Faso flag highlight stripe on top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="flex-1 bg-emerald-600"></div>
          <div className="w-12 bg-yellow-400"></div>
          <div className="flex-1 bg-rose-600"></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/15 border border-yellow-400/30 rounded-full text-yellow-400 text-xs font-semibold uppercase tracking-wider">
              <span>Université de Ouagadougou 🇧🇫</span>
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Gestion de l'Organisation Académique
            </h1>
            <p className="text-emerald-100 max-w-2xl text-sm sm:text-base font-light">
              Portail institutionnel CampusBF autonome. Modélisation et suivi de vos départements, programmes, classes, affectations d'étudiants, et partages sécurisés.
            </p>
          </div>

          {/* Quick Stats overview */}
          <div className="flex flex-wrap sm:flex-nowrap gap-4 bg-emerald-900/40 p-4 rounded-2xl border border-emerald-500/20 backdrop-blur-md">
            <div className="text-center px-4 py-1">
              <span className="block text-2xl font-black text-yellow-300">{departments.length}</span>
              <span className="text-[10px] sm:text-xs text-emerald-100 uppercase tracking-widest font-medium">Départements</span>
            </div>
            <div className="w-px bg-emerald-500/20 self-stretch my-2"></div>
            <div className="text-center px-4 py-1">
              <span className="block text-2xl font-black text-emerald-200">{filieres.length}</span>
              <span className="text-[10px] sm:text-xs text-emerald-100 uppercase tracking-widest font-medium">Filières</span>
            </div>
            <div className="w-px bg-emerald-500/20 self-stretch my-2"></div>
            <div className="text-center px-4 py-1">
              <span className="block text-2xl font-black text-white">{classes.length}</span>
              <span className="text-[10px] sm:text-xs text-emerald-100 uppercase tracking-widest font-medium">Classes</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED INTERACTIVE SIMULATOR TOGGLE */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
            <Sliders size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Contrôle d'Accès : Switcher de Rôle</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Simulez différents niveaux d'habilitation académique. Les formulaires et éléments d'administration filtreront selon ce rôle pour évaluation.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-slate-200/85 w-full md:w-auto">
          {[
            { tag: 'admin_university', name: 'Admin Univ' },
            { tag: 'chef_departement', name: 'Chef Dép.' },
            { tag: 'teacher', name: 'Professeur' },
            { tag: 'student', name: 'Étudiant' }
          ].map(r => (
            <button 
              key={r.tag}
              onClick={() => setSelectedRole(r.tag as AcademicRole)}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs text-center font-bold rounded-lg transition-all ${
                selectedRole === r.tag 
                  ? 'bg-emerald-600 text-white shadow-sm text-center' 
                  : 'text-slate-600 hover:bg-slate-100 text-center'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* PORTAL MAIN MODULE NAVIGATION TABS */}
      <div className="flex border-b border-slate-200/60 font-medium">
        {selectedRole !== 'student' && (
          <button 
            onClick={() => setActiveTab('departments')}
            className={`px-5 py-3 text-sm sm:text-base border-b-2 font-bold transition-all ${
              activeTab === 'departments' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Structure & Départements
          </button>
        )}
        
        {selectedRole !== 'student' && (
          <button 
            onClick={() => setActiveTab('classes')}
            className={`px-5 py-3 text-sm sm:text-base border-b-2 font-bold transition-all ${
              activeTab === 'classes' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Filières, Classes & Étudiants
          </button>
        )}

        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`px-5 py-3 text-sm sm:text-base border-b-2 font-bold transition-all flex items-center gap-2 ${
            activeTab === 'dashboard' 
              ? 'border-emerald-600 text-emerald-700' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <School size={16} />
          Espace de Classe {selectedRole === 'student' && 'Étudiant'}
        </button>

        {canEditStructure && (flaggedDocs.length > 0 || flaggedMessages.length > 0) && (
          <button 
            onClick={() => setActiveTab('moderation')}
            className={`px-5 py-3 text-sm sm:text-base border-b-2 font-bold transition-all text-rose-600 flex items-center gap-2 ${
              activeTab === 'moderation' 
                ? 'border-rose-600 bg-rose-50' 
                : 'border-transparent text-rose-500 hover:text-rose-900'
            }`}
          >
            <ShieldAlert size={16} />
            Signalements ({flaggedDocs.length + flaggedMessages.length})
          </button>
        )}
      </div>

      {/* ========================================= TAB 1: DEPARTMENTS AND STRUCTURE ========================================= */}
      {activeTab === 'departments' && selectedRole !== 'student' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* LEFT CONTAINER: DEPARTMENTS LIST */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">UFR & Départements Académiques</h2>
                  <p className="text-xs text-slate-500">Liste des unités de formation et de recherche de l'établissement</p>
                </div>
                
                {canEditStructure && (
                  <button 
                    onClick={() => {
                      setDeptForm({ id: '', name: '', code: '', description: '', responsible: '', status: 'active' });
                      setShowDeptModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm hover:shadow transition-all font-bold text-sm w-full sm:w-auto justify-center"
                  >
                    <Plus size={16} />
                    Créer un Département
                  </button>
                )}
              </div>

              {/* SEARCH FILTERS BAR */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Recherche par nom ou code..." 
                    value={searchDept}
                    onChange={(e) => setSearchDept(e.target.value)}
                    className="w-full bg-white pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex gap-2.5">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="p-2 text-xs bg-white border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="active">Actif uniquement</option>
                    <option value="archived">Archivés uniquement</option>
                  </select>
                </div>
              </div>

              {/* TABLE LIST GRAPHIC */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                      <th className="p-4">CODE</th>
                      <th className="p-4">Nouveau Département</th>
                      <th className="p-4">Responsable / Chef</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {paginatedDepts.map(dept => (
                      <tr 
                        key={dept.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${selectedDeptId === dept.id ? 'bg-emerald-50/35 font-medium' : ''}`}
                        onClick={() => setSelectedDeptId(dept.id)}
                      >
                        <td className="p-4">
                          <span className="inline-block px-2.5 py-1 bg-slate-100/80 rounded-lg text-xs font-black text-slate-700 uppercase">
                            {dept.code}
                          </span>
                        </td>
                        <td className="p-4 cursor-pointer">
                          <div className="font-extrabold text-slate-900 leading-tight">{dept.name}</div>
                          <div className="text-xs text-slate-500 mt-1.5 max-w-sm line-clamp-1">{dept.description}</div>
                        </td>
                        <td className="p-4 text-slate-600 text-xs font-semibold">
                          {dept.responsible || 'Non assigné'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            dept.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dept.status === 'active' ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                            {dept.status === 'active' ? 'Actif' : 'Archivé'}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            {canEditStructure && (
                              <>
                                <button 
                                  onClick={() => editDept(dept)}
                                  className="p-1 px-2.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1"
                                  title="Modifier"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button 
                                  onClick={() => archiveDept(dept)}
                                  className={`p-1 px-2.5 text-slate-500 rounded-lg transition-colors text-xs flex items-center gap-1 ${
                                    dept.status === 'active' ? 'hover:text-amber-700 hover:bg-slate-100' : 'hover:text-emerald-700 hover:bg-slate-100'
                                  }`}
                                  title={dept.status === 'active' ? 'Archiver' : 'Désarchiver'}
                                >
                                  <Archive size={13} />
                                </button>
                                <button 
                                  onClick={() => deleteDept(dept.id)}
                                  className="p-1 px-2 text-slate-500 hover:text-red-700 hover:bg-slate-100 rounded-lg transition-colors text-xs"
                                  title="Supprimer définitivement"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredDepartments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          Aucun département trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION GRAPHIC */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <span className="text-xs text-slate-500">
                    Affichage {1 + (deptPage - 1) * itemsPerPage} - {Math.min(deptPage * itemsPerPage, filteredDepartments.length)} de {filteredDepartments.length}
                  </span>
                  <div className="flex gap-1.5">
                    <button 
                      disabled={deptPage === 1}
                      onClick={() => setDeptPage(p => p - 1)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                      Précédent
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => setDeptPage(i + 1)}
                        className={`w-7 h-7 text-xs font-bold rounded-lg border transition-all ${
                          deptPage === i + 1 
                            ? 'bg-emerald-600 text-white border-emerald-600' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      disabled={deptPage === totalPages}
                      onClick={() => setDeptPage(p => p + 1)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR: CHANNELS & PROGRAMMES UNDER SELECTED DEPT */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Filières / Programmes</h3>
                  <p className="text-[11px] text-slate-500">Rattachés au département actif</p>
                </div>
                {canEditAcademicFields && selectedDeptId && (
                  <button 
                    onClick={() => {
                      setFiliereForm({ id: '', departmentId: selectedDeptId, name: '', code: '', description: '', responsible: '', status: 'active' });
                      setShowFiliereModal(true);
                    }}
                    className="p-1 px-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-100 rounded-lg transition-all text-xs flex items-center gap-1 font-bold"
                  >
                    <Plus size={12} />
                    Créer
                  </button>
                )}
              </div>

              {/* FILIERES DYNAMIC LIST */}
              <div className="space-y-3">
                {academicService.getFilieres(selectedDeptId).map(fil => {
                  const subClasses = classes.filter(c => c.filiereId === fil.id);
                  return (
                    <div key={fil.id} className="p-4 bg-slate-50/70 border border-slate-200/50 rounded-2xl flex flex-col gap-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-black tracking-wider bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                              {fil.code}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">{fil.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-normal">{fil.description}</p>
                        </div>
                        {canEditAcademicFields && (
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => editFiliere(fil)} 
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button 
                              onClick={() => deleteFiliere(fil.id)}
                              className="text-slate-400 hover:text-red-600 p-0.5"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] border-t border-slate-100 pt-2 text-slate-500">
                        <span>Resp: <strong className="text-slate-700 font-bold">{fil.responsible || 'Indéfini'}</strong></span>
                        <span className="bg-yellow-400/25 text-yellow-900 border border-yellow-400/30 font-bold px-2 py-0.2 rounded-full">
                          {subClasses.length} Classes
                        </span>
                      </div>
                    </div>
                  );
                })}

                {academicService.getFilieres(selectedDeptId).length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Veuillez sélectionner un département ou créer une filière pour commencer.
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5 bg-gradient-to-br from-yellow-300/10 via-rose-500/5 to-emerald-500/5 border border-slate-200 rounded-3xl space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Info size={14} className="text-emerald-700" />
                Note d'aide à l'évaluation
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Les départements et filières structurent les habilitations à générer des emplois du temps. Les directeurs d'université peuvent attribuer des coordinateurs uniques par filière.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= TAB 2: FILIERES, CLASSES & STUDENT ENROLLMENT ========================================= */}
      {activeTab === 'classes' && selectedRole !== 'student' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* L1: ENROLLED CLASSES BLOCK */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Classes Actives</h2>
                  <p className="text-xs text-slate-500">Sélectionnez pour voir les étudiants associés</p>
                </div>
                {canEditAcademicFields && (
                  <button 
                    onClick={() => {
                      setClasseForm({ id: '', filiereId: selectedFiliereId, departmentId: selectedDeptId, name: '', code: '', academicYear: '2025-2026', responsible: '', status: 'active' });
                      setShowClasseModal(true);
                    }}
                    className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all text-xs flex items-center gap-1 font-bold"
                  >
                    <Plus size={12} />
                    Ajouter classe
                  </button>
                )}
              </div>

              {/* SELECT ACTIVE DEPT / FILIERE dropdown */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par filière</label>
                  <select 
                    value={selectedFiliereId}
                    onChange={(e) => setSelectedFiliereId(e.target.value)}
                    className="w-full mt-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Toutes les filières</option>
                    {filieres.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LIST OF CLASSES CARDS */}
              <div className="space-y-3">
                {classes
                  .filter(c => !selectedFiliereId || c.filiereId === selectedFiliereId)
                  .map(cls => {
                    const isSelected = selectedClasseId === cls.id;
                    return (
                      <div 
                        key={cls.id}
                        onClick={() => setSelectedClasseId(cls.id)}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-emerald-50/50 border-emerald-500/80 shadow-sm font-medium' 
                            : 'bg-white border-slate-200 hover:bg-slate-50/40'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="inline-block text-[9px] uppercase font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded mb-1">
                              {cls.academicYear}
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{cls.name}</h4>
                            <div className="text-slate-500 text-[11px] mt-1.5 uppercase tracking-wider font-semibold">Code: {cls.code}</div>
                          </div>
                          
                          {canEditAcademicFields && (
                            <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                              <button onClick={() => editClasse(cls)} className="text-slate-400 hover:text-slate-700">
                                <Edit3 size={11} />
                              </button>
                              <button onClick={() => deleteClasse(cls.id)} className="text-slate-400 hover:text-red-600">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2 bg-transparent">
                          <span>Responsable: <strong className="text-slate-700 font-bold">{cls.responsible || 'Non défini'}</strong></span>
                          <span className="font-bold flex items-center gap-1 text-slate-700">
                            <Users size={12} className="text-slate-400" />
                            {cls.studentCount} inscrits
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* RIGHT CONTAINER 2/3 COLUMN: ASSOCIATED STUDENTS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-emerald-700 text-white font-heavy text-xs rounded-xl">
                      {selectedClasseDetails ? selectedClasseDetails.code : 'L3GL'}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">
                      Rattachement Étudiants (Effectif: {classStudents.length})
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ajoutez vos étudiants par classe de manière autonome (rattachement automatique).
                  </p>
                </div>
                
                {canManageClassroom && selectedClasseId && (
                  <button 
                    onClick={() => {
                      setStudentForm({ id: '', firstName: '', lastName: '', email: '', phone: '', ine: '', departmentId: '', filiereId: '', classeId: selectedClasseId, status: 'active' });
                      setIsBulkMode(false);
                      setShowStudentModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold w-full sm:w-auto justify-center cursor-pointer shadow-sm"
                  >
                    <UserPlus size={14} />
                    Inscrire des Étudiants
                  </button>
                )}
              </div>

              {/* LIST TABLE OF STUDENTS */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/50 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                      <th className="p-4">IDENTIFIANT INE</th>
                      <th className="p-4">Nom Complet</th>
                      <th className="p-4">Email Académique</th>
                      <th className="p-4">Téléphone</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {classStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono text-xs text-slate-500">
                          {student.ine}
                        </td>
                        <td className="p-4 text-slate-900 font-bold">
                          {student.lastName.toUpperCase()} {student.firstName}
                        </td>
                        <td className="p-4 text-xs text-slate-600">
                          {student.email}
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-mono">
                          {student.phone || '--'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            student.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.status === 'active' ? 'Inscrit' : 'Inactif'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {canManageClassroom && (
                            <button 
                              onClick={() => deleteStudent(student.id, student.classeId)}
                              className="text-slate-400 hover:text-red-700 p-1"
                              title="Délier de la classe"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {classStudents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                          Aucun étudiant inscrit dans cette classe pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= TAB 3: ESPACE DE CLASSE ET MESSAGERIE ========================================= */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* COLUMN 1: LEFT AREA SECTOR SELECTOR (CLASSES & INFOS) */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm mb-4">Mes Salles de Classes</h3>
              <div className="space-y-2">
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClasseId(cls.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      selectedClasseId === cls.id
                        ? 'bg-emerald-50/80 border-emerald-500/60 font-bold'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs leading-none">{cls.name}</div>
                      <span className="text-[10px] text-slate-400 block mt-1 uppercase font-semibold">An: {cls.academicYear}</span>
                    </div>
                    <ChevronRight size={14} className={selectedClasseId === cls.id ? 'text-emerald-600' : 'text-slate-300'} />
                  </button>
                ))}
              </div>
            </div>

            {/* QUICK NOTIFICATIONS BOX */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Bell size={16} className="text-emerald-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">Notifications Classe</h3>
              </div>
              <div className="space-y-3">
                {liveNotifications.slice(0, 4).map(notif => (
                  <div key={notif.id} className="text-xs p-3 bg-slate-50 border border-slate-100 rounded-xl relative">
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <h5 className="font-bold text-slate-800 leading-tight">{notif.title}</h5>
                    <p className="text-slate-500 text-[11px] mt-1 line-clamp-2 leading-relaxed">{notif.content}</p>
                    <span className="text-[9px] text-slate-400 block mt-2 text-right">Il y a quelques instants</span>
                  </div>
                ))}

                {liveNotifications.length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-400">
                    Aucune alerte récente.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2 & 3: CORE WORKSPACE TAB CONTENT - MESSAGES, DOCUMENTS, SCHEDULING */}
          <div className="xl:col-span-3 space-y-6">
            <ClassDashboard classeId={selectedClasseId} selectedRole={selectedRole} />
            <div className="hidden">
              {/* IN-APP TIMETABLE PREVIEW & VERSION HISTORY */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/90">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-yellow-100 text-yellow-800 rounded-xl">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">Emploi du Temps Officiel</h2>
                    <p className="text-xs text-slate-500">Mise à jour et téléchargement direct pour l'offline</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {currentTimetable?.currentUrl && (
                    <a 
                      href={currentTimetable.currentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all font-bold text-xs flex-1 sm:flex-none cursor-pointer border border-slate-200"
                    >
                      <Download size={14} />
                      Télécharger (PDF)
                    </a>
                  )}

                  {canManageClassroom && (
                    <button 
                      onClick={() => {
                        setTimetableForm({ fileName: 'EDT_Nouveau_Planning_GL.pdf', description: '', uploadedBy: selectedRole === 'teacher' ? 'M. Urbain TRAORÉ (Enseignant)' : 'Administration Scolaire' });
                        setShowTimetableModal(true);
                      }}
                      className="flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-bold text-xs flex-1 sm:flex-none cursor-pointer shadow-sm"
                    >
                      <Upload size={14} />
                      Remplacer Planning
                    </button>
                  )}
                </div>
              </div>

              {/* TIMETABLE CONTENT VIEW GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                <div className="lg:col-span-2 bg-[#F8FAFC] border border-slate-200/70 p-5 rounded-2xl flex flex-col justify-center items-center text-center py-8">
                  {currentTimetable ? (
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 p-2 px-4 bg-emerald-100/50 border border-emerald-500/20 rounded-full text-emerald-800 text-xs font-bold uppercase">
                        <CheckCircle size={14} className="text-emerald-700" />
                        Version Actuelle : V{currentTimetable.versions[0]?.version || 1}
                      </div>
                      <h4 className="font-black text-slate-900 text-sm">{currentTimetable.currentFileName}</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Changements récents: {currentTimetable.versions[0]?.description || '"Mise au placard des horaires provisoires"'}
                      </p>
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase font-mono">Dernier changement: {new Date(currentTimetable.lastUpdated).toLocaleDateString()} par {currentTimetable.updatedBy}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Clock size={32} className="text-slate-300 mx-auto animate-pulse" />
                      <h4 className="font-extrabold text-slate-900 text-sm">Aucun emploi du temps publié</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Le directeur d'établissement ou l'enseignant n'a pas encore joint l'emploi du temps officiel de cette classe.
                      </p>
                    </div>
                  )}
                </div>

                {/* TIMETABLE VERSION HISTORY */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider text-slate-400 mb-2">
                    <History size={13} />
                    Historique Versions
                  </h4>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {currentTimetable?.versions.map((ver, idx) => (
                      <div key={ver.id} className="p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-800 text-xs">Version {ver.version} {idx === 0 && '(Active)'}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">{new Date(ver.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">"{ver.description || 'Mis en ligne'}"</p>
                        <span className="block text-[9px] text-slate-400 font-semibold text-right">Par {ver.uploadedBy}</span>
                      </div>
                    ))}

                    {(!currentTimetable || currentTimetable.versions.length <= 1) && (
                      <p className="text-[11px] text-slate-400 italic text-center py-6">Aucune version archivée.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CLASS MESSAGING / COMMUNICATIONS SECTION */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-[15px]">Tableau d'Annonces & Messagerie</h3>
                    <p className="text-xs text-slate-500">Flux d'informations entre enseignants, étudiants et familles</p>
                  </div>
                </div>

                {canManageClassroom && (
                  <button 
                    onClick={() => {
                      setMessageForm({ title: '', content: '', allowComments: true, attachmentsName: '', attachmentsUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' });
                      setShowMessageModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    <Plus size={14} />
                    Nouvelle publication
                  </button>
                )}
              </div>

              {/* ITERATIVE PUBLIC ATTACHMENTS FORUM */}
              <div className="space-y-6">
                {classMessages.map(msg => (
                  <div key={msg.id} className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-emerald-950">
                          {msg.authorName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">{msg.authorName}</span>
                            <span className="inline-block px-2 py-0.5 bg-yellow-400/20 text-yellow-900 border border-yellow-400/20 text-[9px] font-bold rounded uppercase">
                              {msg.authorRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">Publié le {new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {/* FLAG BUTTON FOR REPORTING INAPPROPRIATE CONTENT */}
                      <button 
                        onClick={() => flagItem(msg.id, 'message')}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200/50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                        title="Signaler cette publication comme inappropriée"
                      >
                        <Flag size={12} />
                        Signaler
                      </button>
                    </div>

                    <div className="space-y-2 pl-1 sm:pl-13">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{msg.title}</h4>
                      <p className="text-xs text-slate-700 leading-relaxed max-w-3xl whitespace-pre-line">{msg.content}</p>
                      
                      {/* Attachments rendering */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="pt-2">
                          {msg.attachments.map(att => (
                            <a 
                              key={att.fileName}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 p-2 px-3.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500/20 rounded-xl text-xs text-emerald-800 font-bold transition-all"
                            >
                              <Paperclip size={12} className="text-emerald-700" />
                              <span className="underline">{att.fileName}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* COMMENTS SUB-SECTION FOR THE CLASS CHAT */}
                    {msg.allowComments && (
                      <div className="pt-4 border-t border-slate-200/60 pl-1 sm:pl-13 space-y-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">Commentaires</span>
                        
                        <div className="space-y-3 max-h-[200px] overflow-y-auto">
                          {msg.comments?.map(comm => (
                            <div key={comm.id} className="flex gap-2.5 bg-white p-3 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700 uppercase">
                                {comm.authorName[0]}
                              </div>
                              <div className="flex-1 text-xs">
                                <div className="flex items-center justify-between font-bold text-slate-800">
                                  <span>{comm.authorName} <strong className="text-[10px] text-slate-400">({comm.authorRole})</strong></span>
                                  <span className="text-[10px] text-slate-300 font-mono font-normal">{new Date(comm.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-600 mt-1 font-light leading-relaxed">{comm.content}</p>
                              </div>
                            </div>
                          ))}

                          {(!msg.comments || msg.comments.length === 0) && (
                            <p className="text-[11px] text-slate-400 italic">Aucun commentaire de classe.</p>
                          )}
                        </div>

                        {/* Leave a comment form */}
                        <div className="flex gap-2 pt-2.5">
                          <input 
                            type="text"
                            placeholder="Écrivez une réponse..."
                            value={commentInputs[msg.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [msg.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handlePostCommentary(msg.id);
                            }}
                            className="bg-white border border-slate-200 rounded-xl text-xs px-3 py-2 flex-1 outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <button 
                            onClick={() => handlePostCommentary(msg.id)}
                            className="p-2 px-3 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                          >
                            Répondre
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {classMessages.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Aucune annonce ou message de classe n'a été publié.
                  </div>
                )}
              </div>
            </div>

            {/* CLASS DOCUMENTS SPACE */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Base de Documents & Ressources Académiques</h3>
                  <p className="text-xs text-slate-500">Espace partagé pour cours, fiches de TD, sujets de TP, etc.</p>
                </div>
                
                {canManageClassroom && (
                  <button 
                    onClick={() => setShowDocModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold w-full sm:w-auto justify-center"
                  >
                    <Plus size={14} />
                    Partager un Cours / TD
                  </button>
                )}
              </div>

              {/* DOCUMENTS MAP ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classDocs.map(doc => (
                  <div key={doc.id} className="p-4 bg-slate-50 hover:bg-slate-100/60 border border-slate-200/50 rounded-2xl flex flex-col gap-3 justify-between transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          doc.category === 'Cours' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : doc.category === 'TD' 
                            ? 'bg-indigo-100 text-indigo-800'
                            : doc.category === 'TP'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {doc.category}
                        </span>
                        
                        <div className="flex gap-1.5">
                          {/* FLAG FOR DOCUMENTS */}
                          <button 
                            onClick={() => flagItem(doc.id, 'document')}
                            className="p-1 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                            title="Signaler ce document de cours"
                          >
                            <Flag size={11} />
                          </button>
                          {canManageClassroom && (
                            <button 
                              onClick={() => deleteDoc(doc.id)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{doc.title}</h4>
                      {doc.description && <p className="text-slate-500 text-[11px] mt-1.5 leading-normal">{doc.description}</p>}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-200/50">
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase font-mono font-bold">Fichier joint:</span>
                        <span className="text-slate-600 font-bold truncate max-w-[150px] inline-block">{doc.fileName}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleDownloadDoc(doc.id)}
                        className="inline-flex items-center gap-1 p-2 px-3.5 bg-white border border-slate-200 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 font-bold rounded-xl text-xs transition-colors shadow-xs hover:shadow-sm"
                      >
                        <Download size={11} />
                        {doc.downloadsCount || 0}
                      </button>
                    </div>
                  </div>
                ))}

                {classDocs.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-slate-400 text-xs italic">
                    Aucun document académique disponible pour cette classe.
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= TAB 4: MODERATION OF FLAGGED ELEMENTS ========================================= */}
      {activeTab === 'moderation' && canEditStructure && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Espace de Modération & Signalements</h2>
            <p className="text-xs text-slate-500">Rétablissez ou censurez définitivement les contenus signalés par les utilisateurs de l'université.</p>
          </div>

          <div className="space-y-4">
            
            {/* Flagged Documents */}
            {flaggedDocs.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-slate-400">Documents Signalés</h3>
                {flaggedDocs.map(id => {
                  const item = academicService.getDocuments().find(d => d.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-rose-200 rounded-2xl bg-rose-50/50">
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">DOCUMENT</span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-500">Joindre: {item.fileName}</p>
                        <div className="text-xs text-rose-700 font-medium pt-1">
                          Motif du signalement : "<strong>{reportedReasons[id] || 'Non formulé'}</strong>"
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-right">
                        <button 
                          onClick={() => resolveFlag(id, 'document')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                        >
                          Réhabiliter le cours
                        </button>
                        <button 
                          onClick={() => archiveFlaggedItem(id, 'document')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                        >
                          Censurer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Flagged Publications */}
            {flaggedMessages.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-slate-400">Publications & Messages Signalés</h3>
                {flaggedMessages.map(id => {
                  const item = academicService.getMessages(selectedClasseId).find(m => m.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-rose-200 rounded-2xl bg-rose-50/50">
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">MESSAGE</span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">Contenu : {item.content}</p>
                        <div className="text-xs text-rose-700 font-medium pt-1">
                          Motif du signalement : "<strong>{reportedReasons[id] || 'Non formulé'}</strong>"
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-right">
                        <button 
                          onClick={() => resolveFlag(id, 'message')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                        >
                          Réhabiliter
                        </button>
                        <button 
                          onClick={() => archiveFlaggedItem(id, 'message')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                        >
                          Censurer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {flaggedDocs.length === 0 && flaggedMessages.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                Aucun signalement en attente. Tout est propre en ce moment !
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================= MODAL DIALOGS ========================================= */}

      {/* MODAL 1: CREATE OR EDIT DEPARTMENT */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white relative w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-900 text-white">
              <h2 className="text-lg font-extrabold">{deptForm.id ? "Modifier Département" : "Nouveau Département"}</h2>
              <button onClick={() => setShowDeptModal(false)} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveDeptSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Code (UFR)</label>
                  <input 
                    type="text" 
                    required 
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="SEG"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Intitulé Principal du Département</label>
                  <input 
                    type="text" 
                    required 
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="Sciences Économiques"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Responsable / Mandataire de Département</label>
                <input 
                  type="text" 
                  required 
                  value={deptForm.responsible}
                  onChange={(e) => setDeptForm({ ...deptForm, responsible: e.target.value })}
                  placeholder="Pr. Nom Prénom"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description générale</label>
                <textarea 
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Saisissez la mission éducative principale..."
                  rows={3}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[80px]"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowDeptModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE OR EDIT FILIERE */}
      {showFiliereModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white relative w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-lg font-extrabold">{filiereForm.id ? "Modifier Filière" : "Nouvelle Filière / Programme"}</h2>
              <button onClick={() => setShowFiliereModal(false)} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveFiliereSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Département d'Appartenance (Obligatoire)</label>
                <select 
                  required 
                  value={filiereForm.departmentId}
                  onChange={(e) => setFiliereForm({ ...filiereForm, departmentId: e.target.value })}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Sélectionnez un Département</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Code Filière</label>
                  <input 
                    type="text" 
                    required 
                    value={filiereForm.code}
                    onChange={(e) => setFiliereForm({ ...filiereForm, code: e.target.value })}
                    placeholder="GL"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Intitulé du Programme</label>
                  <input 
                    type="text" 
                    required 
                    value={filiereForm.name}
                    onChange={(e) => setFiliereForm({ ...filiereForm, name: e.target.value })}
                    placeholder="Génie Logiciel"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Responsable Coordinateur</label>
                <input 
                  type="text" 
                  required 
                  value={filiereForm.responsible}
                  onChange={(e) => setFiliereForm({ ...filiereForm, responsible: e.target.value })}
                  placeholder="M. Urbain TRAORÉ"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea 
                  value={filiereForm.description}
                  onChange={(e) => setFiliereForm({ ...filiereForm, description: e.target.value })}
                  placeholder="Buts et critères d'admission d'étude..."
                  rows={2}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[60px]"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowFiliereModal(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE OR EDIT CLASSE */}
      {showClasseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white relative w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-lg font-extrabold">{classeForm.id ? "Modifier Classe" : "Générer une Classe"}</h2>
              <button onClick={() => setShowClasseModal(false)} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveClasseSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Filière Associée (Obligatoire)</label>
                <select 
                  required 
                  value={classeForm.filiereId}
                  onChange={(e) => setClasseForm({ ...classeForm, filiereId: e.target.value })}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Sélectionnez la Filière</option>
                  {filieres.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nom de la Classe</label>
                  <input 
                    type="text" 
                    required 
                    value={classeForm.name}
                    onChange={(e) => setClasseForm({ ...classeForm, name: e.target.value })}
                    placeholder="L3 Génie Logiciel"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Code (Scolarité)</label>
                  <input 
                    type="text" 
                    required 
                    value={classeForm.code}
                    onChange={(e) => setClasseForm({ ...classeForm, code: e.target.value })}
                    placeholder="L3-GL"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Année Académique</label>
                  <input 
                    type="text" 
                    required 
                    value={classeForm.academicYear}
                    onChange={(e) => setClasseForm({ ...classeForm, academicYear: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Délégué / Responsable de Salle</label>
                  <input 
                    type="text" 
                    required 
                    value={classeForm.responsible}
                    onChange={(e) => setClasseForm({ ...classeForm, responsible: e.target.value })}
                    placeholder="Dr. Marc COMPAORÉ"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowClasseModal(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: STUDENT INTAKE / CSV BULK LOADER */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white relative w-full max-w-xl rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-lg font-extrabold">Inscrire des Étudiants autonome</h2>
              <button onClick={() => setShowStudentModal(false)} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 text-xs px-4">
              <button 
                onClick={() => setIsBulkMode(false)}
                className={`flex-1 py-3 font-bold border-b-2 text-center transition-all ${!isBulkMode ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500'}`}
              >
                Inscrire Manuelle (1 par 1)
              </button>
              <button 
                onClick={() => setIsBulkMode(true)}
                className={`flex-1 py-3 font-bold border-b-2 text-center transition-all ${isBulkMode ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500'}`}
              >
                Importation en masse (Copier-Coller Text / CSV)
              </button>
            </div>

            {/* IF SINGLE INPUT */}
            {!isBulkMode ? (
              <form onSubmit={handleSaveStudentSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Prénom</label>
                    <input 
                      type="text" 
                      required 
                      value={studentForm.firstName}
                      onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                      placeholder="Adama"
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Nom de famille</label>
                    <input 
                      type="text" 
                      required 
                      value={studentForm.lastName}
                      onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                      placeholder="Ouedraogo"
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Email Académique</label>
                    <input 
                      type="email" 
                      required 
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      placeholder="adama@univ-ouaga.bf"
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">N° INE National (Optional)</label>
                    <input 
                      type="text" 
                      value={studentForm.ine}
                      onChange={(e) => setStudentForm({ ...studentForm, ine: e.target.value })}
                      placeholder="B09121800045A"
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Téléphone (+226)</label>
                    <input 
                      type="text" 
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      placeholder="+226 71 00 11 22"
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Classe Affectation</label>
                    <select 
                      required
                      value={studentForm.classeId}
                      onChange={(e) => setStudentForm({ ...studentForm, classeId: e.target.value })}
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">Sélectionnez la classe cible</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowStudentModal(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                  <button type="submit" className="flex-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700">Valider & Rattaché</button>
                </div>
              </form>
            ) : (
              /* BULK IMPORTER VIEW */
              <div className="p-6 space-y-4">
                <div className="p-4 bg-yellow-400/10 border border-yellow-400/30 text-yellow-900 rounded-2xl space-y-2 text-xs">
                  <span className="font-bold block">Consignes Importation Multi-Lignes:</span>
                  <p className="font-light leading-relaxed">
                    Saisissez les informations des élèves ligne par ligne, délimitées par des points-virgules ou virgules :<br />
                    <code>NOM ; Prénom ; Email ; Téléphone</code>
                  </p>
                  <button 
                    type="button"
                    onClick={seedBulkImporterTemplate}
                    className="mt-1 text-[10px] underline hover:no-underline font-extrabold flex items-center gap-1 text-emerald-800"
                  >
                    <FileSpreadsheet size={12} />
                    Injecter exemple de démonstration
                  </button>
                </div>

                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="ZONGO;Inoussa;inoussa.z@ujkz.bf;+2267100&#10;SAWADOGO;Rihanata;rihana.s@ujkz.bf;+2266655"
                  rows={8}
                  className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                />

                {/* LIVE CSV VALIDATION REVISION REPORT */}
                {parsedBulkRows.length > 0 && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] space-y-2 max-h-[160px] overflow-y-auto">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>Rapport de pré-validation :</span>
                      <span>{parsedBulkRows.length} ligne(s) détectée(s)</span>
                    </div>

                    <div className="space-y-1.5">
                      {parsedBulkRows.map((row) => (
                        <div key={row.lineNum} className={`p-1.5 rounded flex justify-between items-center ${row.isValid ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                          <div className="font-mono">
                            Ligne {row.lineNum}: {row.lastName || '???'} {row.firstName || '???'}
                          </div>
                          <div>
                            {row.isValid ? (
                              <span className="text-[9px] font-bold px-1 py-0.5 bg-emerald-100 uppercase rounded">Valide</span>
                            ) : (
                              <span className="text-[9px] font-bold px-1 py-0.5 bg-rose-100 uppercase rounded" title={row.errors.join(', ')}>
                                Erreur ({row.errors.length})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {parsedBulkRows.every(r => r.isValid) ? (
                      <p className="text-emerald-700 text-[10px] font-bold flex items-center gap-1">✓ Toutes les lignes saisies respectent le schéma requis !</p>
                    ) : (
                      <p className="text-amber-700 text-[10px] font-bold">⚠ Attention : Les lignes défaillantes seront écartées lors de la transaction d'écriture.</p>
                    )}
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowStudentModal(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                  <button 
                    type="button"
                    onClick={handleBulkStudentsImport}
                    className="flex-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700"
                  >
                    Lancer l'importation automatique
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: TIMETABLE REPLACE DIALOG */}
      {showTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white relative w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-lg font-extrabold">Remplacer l'Emploi du Temps</h2>
              <button onClick={() => setShowTimetableModal(false)} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReplaceTimetableSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nom du Fichier EDT</label>
                <input 
                  type="text" 
                  required 
                  value={timetableForm.fileName}
                  onChange={(e) => setTimetableForm({ ...timetableForm, fileName: e.target.value })}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Auteur de l'import</label>
                <input 
                  type="text" 
                  required 
                  value={timetableForm.uploadedBy}
                  onChange={(e) => setTimetableForm({ ...timetableForm, uploadedBy: e.target.value })}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description des changements (Ajustement Semestriel etc.)</label>
                <textarea 
                  required
                  value={timetableForm.description}
                  onChange={(e) => setTimetableForm({ ...timetableForm, description: e.target.value })}
                  placeholder="Décrivez précisément ce qui a changé pour notifier les inscrits..."
                  rows={3}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowTimetableModal(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700">Publier & Notifier classe</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: SHARE COURSE FILE */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white relative w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-lg font-extrabold">Partager de la documentation</h2>
              <button onClick={() => setShowDocModal(false)} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddDocumentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Titre explicite du cours/TD</label>
                  <input 
                    type="text" 
                    required 
                    value={docForm.title}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    placeholder="Mécanique quantique s1"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Catégorie</label>
                  <select 
                    value={docForm.category}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value as any })}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Cours">Cours</option>
                    <option value="TD">Travaux Dirigés</option>
                    <option value="TP">Travaux Pratiques</option>
                    <option value="Examen">Sujet d'Examen</option>
                    <option value="Corrigé">Corrigé</option>
                    <option value="Autre">Autre fiche</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nom du Fichier Simulable (ex: pdf/images)</label>
                <input 
                  type="text" 
                  required 
                  value={docForm.fileName}
                  onChange={(e) => setDocForm({ ...docForm, fileName: e.target.value })}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description des ressources</label>
                <textarea 
                  value={docForm.description}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                  placeholder="Qu'est-ce que l'élève trouvera à l'intérieur ?"
                  rows={3}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[70px]"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowDocModal(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700">Mettre en ligne</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: CREATE CLASS ANNOUNCEMENT / MESSAGE */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white relative w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-lg font-extrabold">Publier un message / Annonce de classe</h2>
              <button onClick={() => setShowMessageModal(false)} className="text-white hover:opacity-80">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePostMessageSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Sujet de l'annonce</label>
                <input 
                  type="text" 
                  required 
                  value={messageForm.title}
                  onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                  placeholder="Ex: Calendrier des rattrapages S5"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Contenu principal de la publication</label>
                <textarea 
                  required 
                  value={messageForm.content}
                  onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                  placeholder="Rédigez ici votre communication..."
                  rows={4}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 font-bold uppercase text-slate-400">Pièce jointe simulable (Optionnelle)</label>
                  <input 
                    type="text" 
                    value={messageForm.attachmentsName}
                    onChange={(e) => setMessageForm({ ...messageForm, attachmentsName: e.target.value })}
                    placeholder="Planning_Détails.pdf"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 font-bold uppercase text-slate-400">Commentaires</label>
                  <select 
                    value={messageForm.allowComments ? 'yes' : 'no'}
                    onChange={(e) => setMessageForm({ ...messageForm, allowComments: e.target.value === 'yes' })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="yes">Activer</option>
                    <option value="no">Désactiver</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowMessageModal(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700">Publier et Diffuser</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
