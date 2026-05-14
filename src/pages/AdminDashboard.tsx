import { seedContestParticipants } from '@/utils/seedData';
import React, { useState, useEffect } from 'react';
import { Users, FileText, AlertTriangle, Activity, Shield, GraduationCap, Check, X, Download, Search, MoreVertical, Ban, UserCheck, Briefcase, ShoppingBag, MessageSquare, Trash2, Megaphone, Plus, ExternalLink, Eye, EyeOff, Upload, CreditCard, Library, Calendar, MapPin, Newspaper, Bike, Edit2, RefreshCw, BookOpen, CheckCircle2, Trophy, Tag, Home, Sparkles, Building2, School, Printer, Unlock, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { User, Log, Contest } from '@/types';
import { uploadFile } from '@/services/storageService';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { DocumentModal } from '@/components/DocumentModal';
import { DocumentProcessor } from '@/components/admin/document-processor/DocumentProcessor';
import { ExamProcessor } from '@/components/admin/exam-processor/ExamProcessor';
import { ActivityLogsAdmin } from '@/components/admin/ActivityLogsAdmin';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { generateDevReport, generateSummaryReport, generateFullReport } from '@/services/devReportService';
import { generatePublicServiceExam } from '@/services/geminiService';
import { PublicServiceCategory, PublicServiceLevel } from '@/types';
import { toast } from 'react-hot-toast';
import { useCachedQuery } from '@/hooks/useCachedQuery';

export default function AdminDashboard() {
  const { data: publicServiceContests, loading: loadingContests, loadMore: loadMoreContests, hasMore: hasMoreContests, invalidateCache: invalidateContestsCache } = useCachedQuery(
    'public_service_contests',
    [orderBy('createdAt', 'desc')],
    'admin_public_service_contests_cache',
    50
  );

  const { 
    user: currentUser,
    applications, 
    reviewApplication, 
    teacherApplications,
    reviewTeacherApplication,
    subscriptionRequests, 
    reviewSubscriptionRequest, 
    syncCommunityGroup,
    addPublicServiceContest,
    deletePublicServiceContest,
    updateUserRole, 
    activateUser,
    deactivateUser,
    adminCreateUser,
    deleteUser,
    addGroupMember,
    groups,
    ads,
    createAd,
    updateAd,
    deleteAd,
    documents,
    updateDocument,
    addDocument,
    internships,
    updateInternship,
    marketplace,
    community,
    events,
    news,
    lostAndFound,
    deleteDocument,
    deleteInternship,
    deleteMarketplaceItem,
    reviewMarketplaceItem,
    deletePost,
    deleteEvent,
    deleteNews,
    deleteLostAndFound,
    reports,
    deleteReport,
    motoRides,
    deleteMotoRide,
    verifyDriver,
    updateRideStatus,
    trainings,
    trainingReports,
    updateTrainingStatus,
    deleteTraining,
    contests,
    contestParticipants,
    createContest,
    updateContest,
    deleteContest,
    updateParticipantStatus,
    publishContestResults,
    deals,
    dealSuggestions,
    createDeal,
    updateDeal,
    deleteDeal,
    reviewDealSuggestion,
    deleteDealSuggestion,
    colocations,
    deleteColocation,
    logs,
    tutors,
    teachers
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'logs' | 'stats' | 'rankings'>('overview');
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
  const [totalDocumentsCount, setTotalDocumentsCount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [contentTab, setContentTab] = useState<'documents' | 'print_orders' | 'stages' | 'marketplace' | 'community' | 'ads' | 'teachers' | 'events' | 'lostAndFound' | 'news' | 'tutors' | 'reports' | 'motoRide' | 'payments' | 'formations' | 'contests' | 'deals' | 'colocation' | 'public_service_contests' | 'enterprise' | 'university' | 'doc_processor' | 'exam_processor'>('documents');
  const [dealsSubTab, setDealsSubTab] = useState<'list' | 'suggestions'>('list');
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Content states
  const [showAddAdModal, setShowAddAdModal] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', imageUrl: '', linkUrl: '', userId: '', active: true, createdAt: '' });
  const [showGroupSelectModal, setShowGroupSelectModal] = useState<string | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'student' as User['role'] });
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [showEditInternshipModal, setShowEditInternshipModal] = useState(false);
  const [editingInternship, setEditingInternship] = useState<any>(null);
  const [showAddContestModal, setShowAddContestModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState<Contest | null>(null);
  const [editingContest, setEditingContest] = useState<any>(null);
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [showAIGenModal, setShowAIGenModal] = useState(false);
  const [showManualContestModal, setShowManualContestModal] = useState(false);
  const [manualContestData, setManualContestData] = useState({ category: 'culture_generale', level: 'BAC', title: '', questionsJSON: '', shuffle: false });
  const [parsedQuestionsCount, setParsedQuestionsCount] = useState(0);

  const [printOrders, setPrintOrders] = useState<any[]>([]);
  const [loadingPrintOrders, setLoadingPrintOrders] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const { userService } = await import('@/services/userService');
        const { documentService } = await import('@/services/documentService');
        
        const [uCount, dCount] = await Promise.all([
          userService.getUsersCount(),
          documentService.getDocumentsCount()
        ]);
        
        setTotalUsersCount(uCount);
        setTotalDocumentsCount(dCount);
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'rankings' || (activeTab === 'content' && contentTab === 'print_orders')) {
      const fetchUsers = async () => {
        if (adminUsers.length > 0) return; // Already fetched
        setLoadingUsers(true);
        try {
          const { userService } = await import('@/services/userService');
          // Fetch top 150 users for list and ranking view
          const data = await userService.getUsers(150);
          setAdminUsers(data);
        } catch (error) {
          console.error("Error fetching admin users:", error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [activeTab, contentTab, adminUsers.length]);

  useEffect(() => {
    if (contentTab === 'print_orders') {
      const fetchOrders = async () => {
        setLoadingPrintOrders(true);
        try {
          const { getAllPrintOrders } = await import('@/services/printService');
          const orders = await getAllPrintOrders();
          setPrintOrders(orders);
        } catch (error) {
          console.error("Failed to load print orders", error);
        } finally {
          setLoadingPrintOrders(false);
        }
      };
      fetchOrders();
    }
  }, [contentTab]);

  const handleUpdatePrintStatus = async (orderId: string, status: string) => {
    try {
      const { updatePrintOrderStatus } = await import('@/services/printService');
      const { notificationService } = await import('@/services/notificationService');
      
      await updatePrintOrderStatus(orderId, status as any);
      
      setPrintOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      
      // Notify user physically via DB
      const order = printOrders.find(o => o.id === orderId);
      if (order && order.userId) {
        let title = "Commande en traitement";
        let body = `Votre commande d\'impression pour ${order.fileName} est en cours de traitement.`;
        
        if (status === 'ready') {
          title = "Commande prête !";
          body = `Votre commande d'impression pour ${order.fileName} est prête à être récupérée au ${order.pickupPoint}.`;
        } else if (status === 'delivered') {
          title = "Commande livrée";
          body = `Votre commande d'impression pour ${order.fileName} a été livrée.`;
        }
        
        await notificationService.addNotification(order.userId, {
          title,
          message: body,
          type: 'info',
          link: '/documents'
        });

        // Simuler push/WhatsApp via API
        fetch('/api/notify/print_status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: order.userId, status, fileName: order.fileName })
        }).catch(err => console.log('Notification call failed', err));
      }
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleJSONChange = (val: string) => {
    setManualContestData({ ...manualContestData, questionsJSON: val });
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        setParsedQuestionsCount(parsed.length);
      } else {
        setParsedQuestionsCount(0);
      }
    } catch (e) {
      setParsedQuestionsCount(0);
    }
  };
  const [aiGenData, setAiGenData] = useState({ category: 'culture_generale', level: 'BAC', numQuestions: 10, title: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [newDeal, setNewDeal] = useState<any>({
    title: '',
    description: '',
    partnerName: '',
    discountValue: '',
    category: 'other',
    active: true
  });
  const [newContest, setNewContest] = useState<Partial<Contest>>({
    title: '',
    description: '',
    type: 'academic',
    startDate: '',
    endDate: '',
    resultsDate: '',
    maxParticipants: 100,
    reward: '',
    conditions: { minInvites: 0, requireVerifiedProfile: false },
    criteria: [{ id: '1', label: 'Score', key: 'score', weight: 100 }],
    status: 'draft'
  });

  const handleSaveInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, ...updateData } = editingInternship;
      await updateInternship(id, { ...updateData, updatedAt: serverTimestamp() } as any);
      setShowEditInternshipModal(false);
      setEditingInternship(null);
      alert('Offre modifiée avec succès');
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la modification');
    }
  };

  const handleSaveDocument = async (data: any) => {
    try {
      if (editingDoc) {
        await updateDocument(editingDoc.id, data);
      } else {
        await addDocument(data);
      }
      setIsDocModalOpen(false);
      setEditingDoc(null);
    } catch (error) {
      console.error("Error in handleSaveDocument:", error);
      throw error;
    }
  };

  const handleSaveContest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContest) {
        const { id, ...data } = editingContest;
        await updateContest(id, data);
      } else {
        await createContest(newContest as Contest);
      }
      setShowAddContestModal(false);
      setEditingContest(null);
      setNewContest({
        title: '',
        description: '',
        type: 'academic',
        startDate: '',
        endDate: '',
        resultsDate: '',
        maxParticipants: 100,
        reward: '',
        conditions: { minInvites: 0, requireVerifiedProfile: false },
        criteria: [{ id: '1', label: 'Score', key: 'score', weight: 100 }],
        status: 'draft'
      });
    } catch (error: any) {
      console.error("Full error on Save Contest:", error);
      alert('Erreur lors de l\'enregistrement du concours: ' + error.message + '\n\n' + JSON.stringify(error));
    }
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDeal) {
        const { id, ...data } = editingDeal;
        await updateDeal(id, data);
      } else {
        await createDeal(newDeal);
      }
      setShowAddDealModal(false);
      setEditingDeal(null);
      setNewDeal({
        title: '',
        description: '',
        partnerName: '',
        discountValue: '',
        category: 'other',
        active: true
      });
      alert('Bon Plan enregistré avec succès');
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const fixMemoires = async () => {
    const toFix = documents.filter(docItem => 
      (docItem.type === 'thesis' || docItem.type === 'Mémoire') && 
      (docItem.title.toLowerCase().includes('examen') || 
       docItem.title.toLowerCase().includes('sujet') || 
       docItem.title.toLowerCase().includes('corrigé') ||
       docItem.title.toLowerCase().includes('td ') ||
       docItem.title.toLowerCase().includes('exercice') ||
       docItem.title.toLowerCase().includes('composition') ||
       docItem.title.toLowerCase().includes('partiel') ||
       docItem.title.toLowerCase().includes('épreuve') ||
       docItem.title.toLowerCase().includes('session'))
    );
    
    if (toFix.length === 0) {
      alert("Aucun document mal classé trouvé dans l'espace Mémoires.");
      return;
    }
    
    if (confirm(`Voulez-vous reclasser ${toFix.length} documents de "Mémoires" vers "Examens/Exercices" ?`)) {
      let count = 0;
      for (const docItem of toFix) {
        try {
          let newType = 'exam';
          if (docItem.title.toLowerCase().includes('td ') || docItem.title.toLowerCase().includes('exercice')) {
            newType = 'exercise';
          }
          await updateDocument(docItem.id, { type: newType });
          count++;
        } catch (error) {
          console.error(`Error fixing doc ${docItem.id}:`, error);
        }
      }
      alert(`${count} documents ont été reclassés avec succès.`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { url } = await uploadFile(file);
        setNewAd({ ...newAd, imageUrl: url });
      } catch (error) {
        console.error("Error uploading ad image:", error);
      }
    }
  };

  const handleAddUserToGroup = async (groupId: string) => {
    if (!showGroupSelectModal) return;
    try {
      await addGroupMember(groupId, showGroupSelectModal);
      setShowGroupSelectModal(null);
    } catch (error) {
      console.error("Error adding user to group:", error);
    }
  };

  const handleCreateUser = async () => {
    try {
      await adminCreateUser(newUser);
      setShowCreateUserModal(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'student' });
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const exportStudentContacts = async () => {
    const loadingToast = toast.loading("Récupération des données étudiants...");
    try {
      const { userService } = await import('@/services/userService');
      const allStudents = await userService.getUsersByRole('student', 2000);
      
      if (allStudents.length === 0) {
        toast.dismiss(loadingToast);
        alert("Aucun étudiant trouvé.");
        return;
      }

      const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Université', 'Filière', 'Niveau', 'Promotion', 'INE', 'Ville', 'Quartier', 'Date Inscription'];
      const csvRows = allStudents.map(u => {
        const createdAtDate = u.createdAt?.toDate ? u.createdAt.toDate() : (u.createdAt ? new Date(u.createdAt) : null);
        return [
          `"${u.firstName || ''}"`,
          `"${u.lastName || ''}"`,
          `"${u.email || ''}"`,
          `"${u.phone || ''}"`,
          `"${u.university || ''}"`,
          `"${u.major || ''}"`,
          `"${u.level || ''}"`,
          `"${u.promotion || ''}"`,
          `"${u.ine || ''}"`,
          `"${u.city || ''}"`,
          `"${u.neighborhood || ''}"`,
          `"${createdAtDate ? createdAtDate.toLocaleDateString() : ''}"`
        ].join(',');
      });
      
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_etudiants_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(loadingToast);
    } catch (error) {
       console.error("Export error:", error);
       toast.dismiss(loadingToast);
       toast.error("Erreur lors de l'exportation");
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const lines = content.split('\n');
          if (lines.length < 2) {
            toast.error("Le fichier CSV est vide ou invalide");
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const dataRows = lines.slice(1).filter(line => line.trim() !== '');

          const loadingToast = toast.loading(`Traitement de ${dataRows.length} lignes...`);
          
          let updatedCount = 0;
          let createdCount = 0;

          const { userService } = await import('@/services/userService');
          const allStudentsForMatch = await userService.getUsersByRole('student', 5000);

          // Process in batches if many? For now just simple loop
          for (const row of dataRows) {
            // Regex to handle quoted CSV values properly
            const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || row.split(',');
            const userData: any = { role: 'student', updatedAt: serverTimestamp() };
            
            headers.forEach((header, index) => {
              const value = values[index];
              if (!value) return;

              if (header.includes('Prénom')) userData.firstName = value;
              else if (header.includes('Nom')) userData.lastName = value;
              else if (header.includes('Email')) userData.email = value;
              else if (header.includes('Téléphone')) userData.phone = value;
              else if (header.includes('Université')) userData.university = value;
              else if (header.includes('Filière')) userData.major = value;
              else if (header.includes('Niveau')) userData.level = value;
              else if (header.includes('Promotion')) userData.promotion = value;
              else if (header.includes('INE')) userData.ine = value;
              else if (header.includes('Ville')) userData.city = value;
              else if (header.includes('Quartier')) userData.neighborhood = value;
            });

            if (userData.email) {
              const existingUser = allStudentsForMatch.find(u => u.email === userData.email);
              if (existingUser) {
                await updateDoc(doc(db, 'users', existingUser.id), userData);
                updatedCount++;
              }
            }
          }

          toast.dismiss(loadingToast);
          toast.success(`${updatedCount} étudiants mis à jour.`);
          
          // Re-fetch users for display
          const data = await userService.getUsers(150);
          setAdminUsers(data);
        } catch (error) {
          console.error("Error importing CSV:", error);
          toast.error("Erreur lors de l'importation");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleManualContestCreate = async () => {
    if (!manualContestData.title || !manualContestData.questionsJSON) {
      toast.error('Veuillez remplir le titre et les questions (JSON)');
      return;
    }
    
    let questionsParsed;
    try {
      questionsParsed = JSON.parse(manualContestData.questionsJSON);
      if (!Array.isArray(questionsParsed)) throw new Error('Les questions doivent être dans un tableau [ ]');
      if (manualContestData.shuffle) {
        questionsParsed.sort(() => Math.random() - 0.5);
      }
    } catch (e: any) {
      toast.error('Format JSON invalide: ' + e.message);
      return;
    }

    if (questionsParsed.length === 0) {
      toast.error('Le tableau de questions est vide.');
      return;
    }

    const tId = toast.loading('Création du concours...');
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
      
      console.log('AdminDashboard: Creating contest with', questionsParsed.length, 'questions');
      await addPublicServiceContest(newCtx);
      
      if (invalidateContestsCache) {
        invalidateContestsCache();
      }
      
      toast.success(`${questionsParsed.length} questions ajoutées avec succès`, { id: tId });
      setShowManualContestModal(false);
      setManualContestData({ category: 'culture_generale', level: 'BAC', title: '', questionsJSON: '', shuffle: false });
      setParsedQuestionsCount(0);
    } catch (error) {
      console.error('Error in handleManualContestCreate:', error);
      toast.error("Erreur lors de l'ajout manuel", { id: tId });
    }
  };

  const handleAIGenerateContest = async () => {
    if (!aiGenData.title) {
      toast.error('Veuillez donner un titre au concours');
      return;
    }
    setIsGenerating(true);
    try {
      const questions = await generatePublicServiceExam(aiGenData.category, aiGenData.level, aiGenData.numQuestions);
      const newCtx = {
        titre: aiGenData.title,
        categorie: aiGenData.category,
        niveau: aiGenData.level,
        type: 'qcm',
        duree: aiGenData.numQuestions * 2, // 2 mins per question roughly
        difficulte: 'moyen',
        questions: questions
      };
      await addPublicServiceContest(newCtx);
      setShowAIGenModal(false);
      setAiGenData({ category: 'culture_generale', level: 'BAC', numQuestions: 10, title: '' });
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la génération IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const pendingTeacherApplications = teacherApplications.filter(app => app.status === 'pending');
  console.log("AdminDashboard: pendingTeacherApplications:", pendingTeacherApplications.map(app => ({ id: app.id, status: app.status })));
  const rejectedTeacherApplications = teacherApplications.filter(app => app.status === 'rejected');
  const pendingSubscriptions = subscriptionRequests.filter(req => req.status === 'pending');

  const filteredUsers = adminUsers.filter(u => 
    u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleToggleUserRole = (userId: string) => {
    const userResult = adminUsers.find(u => u.id === userId);
    if (userResult) {
      updateUserRole(userId, userResult.role === 'admin' ? 'student' : 'admin');
    }
  };

  const handleForceUnlock = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        forceUnlocked: !currentStatus,
        lastActiveAt: serverTimestamp()
      });
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, forceUnlocked: !currentStatus } : u));
      toast.success(!currentStatus ? "Accès COMPLET débloqué pour cet utilisateur" : "Restrictions rétablies");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du déblocage");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      try {
        await deleteUser(userId);
        alert('Utilisateur supprimé avec succès.');
      } catch (error) {
        console.error("Error in handleDeleteUser:", error);
        alert('Erreur lors de la suppression de l\'utilisateur.');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-emerald-600" />
            Administration
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500">Vue d'ensemble et modération de CampusBF.</p>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest ml-2">
              Rôle : {currentUser?.role}
            </span>
          </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'overview' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Vue d'ensemble
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'users' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Gestion Utilisateurs
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'content' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Gestion Plateformes
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'logs' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Journaux
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'stats' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Statistiques
          </button>
          <button 
            onClick={() => setActiveTab('rankings')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'rankings' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Classement Étudiants
          </button>
        </div>
          <button 
            onClick={() => {
              toast.loading("Génération du rapport...", { duration: 2000 });
              generateDevReport();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <FileText size={18} />
            Rapport de Développement
          </button>
      </div>

      {activeTab === 'rankings' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2 text-xl">
                  <Trophy size={24} className="text-amber-500" />
                  Classement de l'Activité Étudiante
                </h2>
                <p className="text-sm text-gray-500 mt-1">Basé sur les interactions réelles sur la plateforme.</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-inner flex items-center gap-2">
                <Search size={18} className="text-gray-400 ml-2" />
                <input 
                  type="text" 
                  placeholder="Chercher un étudiant..."
                  className="bg-transparent border-none focus:ring-0 text-sm w-64"
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rang</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Étudiant</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Connexions</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Docs (V/T)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Quiz</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Marketplace</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">MotoRide</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Messages</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Invitations</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Score Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        <Activity className="animate-spin inline-block mr-2" size={20} />
                        Chargement des données...
                      </td>
                    </tr>
                  ) : adminUsers
                    .filter(u => u.role === 'student' && (
                      u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) || 
                      u.lastName?.toLowerCase().includes(userSearch.toLowerCase())
                    ))
                    .sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0))
                    .map((student, idx) => {
                      const stats = (student.activityStats || {}) as any;
                      return (
                        <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                              idx === 0 ? "bg-amber-100 text-amber-700" :
                              idx === 1 ? "bg-slate-200 text-slate-700" :
                              idx === 2 ? "bg-orange-100 text-orange-700" : "text-gray-400"
                            )}>
                              #{idx + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.firstName}`} alt="" className="w-10 h-10 rounded-full bg-gray-100 object-cover" />
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 text-sm truncate">{student.firstName} {student.lastName}</div>
                                <div className="text-[10px] text-gray-500 font-medium truncate">{student.major} @ {student.university}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-bold text-gray-700">{stats.logins || 0}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-700">{stats.docsViewed || 0}</span>
                              <span className="text-[10px] text-gray-400">{stats.docsDownloaded || 0} télechargés</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-bold text-gray-700">{stats.quizzesCompleted || 0}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col text-[10px] font-bold">
                              <span className="text-blue-600">{stats.marketplacePosts || 0} posts</span>
                              <span className="text-emerald-600">{stats.marketplaceContacts || 0} contacts</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col text-[10px] font-bold">
                              <span className="text-orange-600">{stats.motoRideOffers || 0} offres</span>
                              <span className="text-purple-600">{stats.motoRideContacts || 0} contacts</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-bold text-emerald-600">{stats.groupMessages || 0}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-bold text-violet-600">{stats.invitations || 0}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg inline-block font-bold text-sm">
                              {student.rankingScore || 0} pts
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Utilisateurs', count: totalUsersCount.toString(), icon: Users, color: 'bg-blue-50 text-blue-700' },
              { label: 'Documents', count: totalDocumentsCount.toString(), icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Signalements', count: reports.length.toString(), icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
              { label: 'Demandes Répétiteur', count: pendingApplications.length.toString(), icon: GraduationCap, color: 'bg-amber-50 text-amber-700' },
              { label: 'Demandes Enseignant', count: pendingTeacherApplications.length.toString(), icon: Library, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Formations en attente', count: trainings.filter(t => t.status === 'pending').length.toString(), icon: BookOpen, color: 'bg-blue-50 text-blue-700' },
              { label: 'Paiements', count: pendingSubscriptions.length.toString(), icon: CreditCard, color: 'bg-indigo-50 text-indigo-700' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <span className="block text-2xl font-bold text-gray-900">{stat.count}</span>
                  <span className="text-sm text-gray-500">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Subscription Requests Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="text-indigo-600" size={20} />
                Vérification des Paiements
              </h2>
              <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">{pendingSubscriptions.length} en attente</span>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingSubscriptions.length > 0 ? (
                pendingSubscriptions.map((req) => (
                  <div key={req.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex gap-4">
                        <img src={req.user?.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100" />
                        <div>
                          <h3 className="font-bold text-gray-900">{req.user?.firstName} {req.user?.lastName}</h3>
                          <p className="text-xs text-gray-500 mb-2">{req.user?.email} • {req.user?.phone || 'Pas de numéro'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                              req.type === 'exam' ? "bg-blue-50 text-blue-700" : 
                              req.type === 'premium' ? "bg-purple-50 text-purple-700" : 
                              req.type === 'event' ? "bg-indigo-50 text-indigo-700" : 
                              req.type === 'institution' ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                            )}>
                              {req.type === 'exam' ? 'Abonnement Examens' : 
                               req.type === 'premium' ? 'Abonnement Premium' : 
                               req.type === 'event' ? 'Abonnement Événements' : 
                               req.type === 'institution' ? 'Abonnement Établissement' : 'Abonnement Répétiteur'}
                            </span>
                            <span className="text-sm font-bold text-emerald-600">{req.amount.toLocaleString()} FCFA</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Demande effectuée le {new Date(req.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[200px] justify-center">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => reviewSubscriptionRequest(req.id, 'approved')}
                            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                          >
                            <Check size={16} />
                            Activer
                          </button>
                          <button 
                            onClick={() => reviewSubscriptionRequest(req.id, 'rejected')}
                            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                          >
                            <X size={16} />
                            Refuser
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <p>Aucun paiement en attente de vérification.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tutor Applications Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="text-amber-600" size={20} />
                Demandes de Statut Répétiteur
              </h2>
              <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded-full">{pendingApplications.length} en attente</span>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingApplications.length > 0 ? (
                pendingApplications.map((app) => (
                  <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex gap-4">
                        <img src={app.user?.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100" />
                        <div>
                          <h3 className="font-bold text-gray-900">{app.user?.firstName} {app.user?.lastName}</h3>
                          <p className="text-xs text-gray-500 mb-2">{app.user?.university} • {app.user?.major}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {app.subjects?.map((sub) => (
                              <span key={sub} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full font-bold">
                                {sub}
                              </span>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                            {app.hourlyRates?.college && <span>Col: {app.hourlyRates.college} F</span>}
                            {app.hourlyRates?.lycee && <span>Lyc: {app.hourlyRates.lycee} F</span>}
                            {app.hourlyRates?.licence && <span>Lic: {app.hourlyRates.licence} F</span>}
                            {app.hourlyRates?.master && <span>Mas: {app.hourlyRates.master} F</span>}
                          </div>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                            "{app.description}"
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[200px]">
                        {app.documentUrl && app.documentUrl !== '#' ? (
                          <a 
                            href={app.documentUrl} 
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                          >
                            <Download size={16} />
                            Voir le dossier
                          </a>
                        ) : (
                          <button 
                            disabled
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-bold cursor-not-allowed"
                          >
                            <Download size={16} />
                            Aucun dossier
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => reviewApplication(app.id, 'approved')}
                            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                          >
                            <Check size={16} />
                            Accepter
                          </button>
                          <button 
                            onClick={() => reviewApplication(app.id, 'rejected')}
                            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                          >
                            <X size={16} />
                            Refuser
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <p>Aucune demande en attente pour le moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Teacher Applications Section - MOVED TO GESTION PLATEFORMES */}
          
          <div className="grid lg:grid-cols-2 gap-8 mt-8">
            {/* Recent Reports */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-gray-900">Signalements Récents</h2>
                {reports.filter(r => r.status === 'pending').length > 0 && (
                  <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-1 rounded-full">
                    {reports.filter(r => r.status === 'pending').length} nouveaux
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {reports.filter(r => r.status === 'pending').slice(0, 5).map((report) => (
                  <div key={report.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{report.reportedItemType} - {report.reason}</p>
                      <p className="text-xs text-gray-500">Signalé par {report.reporterName} • {new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if(confirm('Supprimer cet élément signalé ?')) {
                            // Logic to delete the actual item would go here based on report.reportedItemType and report.reportedItemId
                            // For now, we just delete the report
                            deleteReport(report.id);
                          }
                        }}
                        className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                      >
                        Supprimer
                      </button>
                      <button 
                        onClick={() => deleteReport(report.id)}
                        className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Ignorer
                      </button>
                    </div>
                  </div>
                ))}
                {reports.filter(r => r.status === 'pending').length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    Aucun signalement en attente.
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">État du Système</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Supabase (Stockage)</span>
                  <span className="text-sm font-medium flex items-center gap-2 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    Opérationnel
                  </span>
                </div>
                {[
                  { label: 'Base de données', status: 'Opérationnel', color: 'text-emerald-600' },
                  { label: 'Authentification', status: 'Opérationnel', color: 'text-emerald-600' },
                  { label: 'API Gateway', status: 'Opérationnel', color: 'text-emerald-600' },
                  { label: 'Notifications Push', status: 'Maintenance', color: 'text-amber-600' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-gray-600">{item.label}</span>
                    <span className={`text-sm font-medium flex items-center gap-2 ${item.color}`}>
                      <span className={`w-2 h-2 rounded-full bg-current`}></span>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reports & Statistics Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-emerald-600" size={20} />
                Rapports & Statistiques Plateforme
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    toast.success("Génération du rapport résumé...");
                    generateSummaryReport({ users: adminUsers, documents, community, marketplace });
                  }}
                  className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <Download size={14} />
                  Rapport résumé
                </button>
                <button 
                  onClick={() => {
                    toast.success("Génération du rapport complet...");
                    generateFullReport({ users: adminUsers, documents, community, marketplace, logs });
                  }}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Download size={14} />
                  Rapport complet
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* User Distribution */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Répartition Utilisateurs</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Étudiants', count: adminUsers.filter(u => u.role === 'student').length, color: 'bg-blue-500' },
                      { label: 'Répétiteurs & Prof de maison', count: adminUsers.filter(u => u.role === 'tutor').length, color: 'bg-amber-500' },
                      { label: 'Enseignants', count: adminUsers.filter(u => u.role === 'teacher').length, color: 'bg-emerald-500' },
                      { label: 'Entreprises', count: adminUsers.filter(u => u.role === 'company').length, color: 'bg-purple-500' },
                      { label: 'Admins', count: adminUsers.filter(u => u.role === 'admin').length, color: 'bg-red-500' },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="text-gray-900 font-bold">
                            {item.label === 'Étudiants' && adminUsers.length === 150 ? `~${Math.round(totalUsersCount)}` : item.count}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color}`} 
                            style={{ width: `${(item.count / Math.max(adminUsers.length, 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Statistics */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Contenus Publiés</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-xl font-bold text-gray-900">{totalDocumentsCount}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Documents</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-xl font-bold text-gray-900">{community.length}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Posts Forum</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-xl font-bold text-gray-900">{marketplace.length}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Marketplace</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-xl font-bold text-gray-900">{motoRides.length}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Trajets Moto</p>
                    </div>
                  </div>
                </div>

                {/* Engagement & Activity */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Activité Récente</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Nouveaux inscrits</p>
                        <p className="text-xs text-gray-500">7 derniers jours : {adminUsers.filter(u => {
                          const date = new Date(u.createdAt);
                          const sevenDaysAgo = new Date();
                          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                          return date > sevenDaysAgo;
                        }).length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Documents partagés</p>
                        <p className="text-xs text-gray-500">7 derniers jours : {documents.filter(d => {
                          const date = new Date(d.createdAt);
                          const sevenDaysAgo = new Date();
                          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                          return date > sevenDaysAgo;
                        }).length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Activity size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Actions admin</p>
                        <p className="text-xs text-gray-500">Total logs : {logs.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit flex-wrap gap-1">
            {[
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'print_orders', label: 'Imprimerie', icon: Printer },
              { id: 'stages', label: 'Stages & Emplois & Bourses', icon: Briefcase },
              { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
              { id: 'community', label: 'Communauté', icon: MessageSquare },
              { id: 'events', label: 'Événements', icon: Calendar },
              { id: 'lostAndFound', label: 'Objets Perdus', icon: MapPin },
              { id: 'news', label: 'Actualités', icon: Newspaper },
              { id: 'ads', label: 'Publicités', icon: Megaphone },
              { id: 'teachers', label: 'Enseignants', icon: Library },
              { id: 'tutors', label: 'Répétiteurs & Prof de maison', icon: GraduationCap },
              { id: 'enterprise', label: 'Portails Entreprises', icon: Building2 },
              { id: 'university', label: 'Portails Universités', icon: School },
              { id: 'reports', label: 'Signalements', icon: AlertTriangle },
              { id: 'motoRide', label: 'MotoRide', icon: Bike },
              { id: 'formations', label: 'Formations', icon: BookOpen },
              { id: 'contests', label: 'Concours', icon: Trophy },
              { id: 'deals', label: 'Bons Plans', icon: Tag },
              { id: 'colocation', label: 'Colocation', icon: Home },
              { id: 'public_service_contests', label: 'Concours Fonction Publique', icon: Trophy },
              { id: 'doc_processor', label: 'Traitement Doc (IA)', icon: Sparkles },
              { id: 'exam_processor', label: 'Sujets Concours (IA)', icon: Sparkles },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setContentTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  contentTab === tab.id ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 capitalize">Modération : {contentTab}</h2>
              {contentTab === 'ads' && (
                <button 
                  onClick={() => setShowAddAdModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={16} />
                  Nouvelle Publicité
                </button>
              )}
              {contentTab === 'contests' && (
                <button 
                  onClick={() => setShowAddContestModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={16} />
                  Nouveau Concours
                </button>
              )}
              {contentTab === 'deals' && (
                <button 
                  onClick={() => { setEditingDeal(null); setShowAddDealModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={16} />
                  Nouveau Bon Plan
                </button>
              )}
              {contentTab === 'deals' && (
                <button 
                  onClick={() => { setEditingDeal(null); setShowAddDealModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={16} />
                  Nouveau Bon Plan
                </button>
              )}
              {contentTab === 'documents' && (
                <div className="flex gap-2">
                  <button 
                    onClick={fixMemoires}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors"
                    title="Reclasser les examens qui sont dans Mémoires"
                  >
                    <RefreshCw size={16} />
                    Nettoyer Mémoires
                  </button>
                  <button 
                    onClick={() => { setEditingDoc(null); setIsDocModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <Plus size={16} />
                    Ajouter un document
                  </button>
                </div>
              )}
              {contentTab === 'public_service_contests' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAIGenModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
                    Générer (IA)
                  </button>
                  <button 
                    onClick={() => setShowManualContestModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <Plus size={16} />
                    Créer manuellement
                  </button>
                </div>
              )}
            </div>
            
            <div className="divide-y divide-gray-50">
        {contentTab === 'doc_processor' && (
          <div className="p-6">
            <DocumentProcessor />
          </div>
        )}
        {contentTab === 'exam_processor' && (
          <div className="p-6">
            <ExamProcessor />
          </div>
        )}
        {contentTab === 'documents' && documents.map(doc => (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{doc.title}</p>
                      <p className="text-xs text-gray-500">{doc.subject} • {doc.university}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setEditingDoc(doc); setIsDocModalOpen(true); }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 size={18} />
                    </button>
                    <a 
                      href={doc.downloadUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                      title="Voir le document"
                    >
                      <ExternalLink size={18} />
                      <span className="text-sm font-medium">Voir</span>
                    </a>
                    <button 
                      onClick={() => deleteDocument(doc.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {contentTab === 'print_orders' && (
                <div className="overflow-x-auto">
                  {loadingPrintOrders ? (
                    <div className="p-10 text-center text-slate-500">Chargement des commandes...</div>
                  ) : printOrders.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">Aucune commande pour le moment.</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100/50">
                          <th className="text-left py-4 px-6 text-sm font-bold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="text-left py-4 px-6 text-sm font-bold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                          <th className="text-left py-4 px-6 text-sm font-bold text-gray-500 uppercase tracking-wider">Fichier</th>
                          <th className="text-left py-4 px-6 text-sm font-bold text-gray-500 uppercase tracking-wider">Options</th>
                          <th className="text-left py-4 px-6 text-sm font-bold text-gray-500 uppercase tracking-wider">Prix</th>
                          <th className="text-left py-4 px-6 text-sm font-bold text-gray-500 uppercase tracking-wider">Point de retrait</th>
                          <th className="text-left py-4 px-6 text-sm font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                          <th className="text-right py-4 px-6 text-sm font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100/50">
                        {printOrders.map(order => {
                          const orderUser = adminUsers.find(u => u.id === order.userId);
                          return (
                          <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 text-sm text-gray-600">
                              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('fr-FR') : 'N/A'}
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm font-bold text-gray-900">{orderUser ? `${orderUser.firstName} ${orderUser.lastName}` : 'Inconnu'}</div>
                              <div className="text-xs text-gray-500">{orderUser?.phone || orderUser?.email || ''}</div>
                            </td>
                            <td className="py-4 px-6">
                              <a href={order.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-emerald-600 hover:underline flex items-center gap-1">
                                <FileText size={16} />
                                {order.fileName}
                                <ExternalLink size={12} />
                              </a>
                            </td>
                            <td className="py-4 px-6 text-xs text-gray-600">
                              <div>{order.options?.color ? 'Couleur' : 'N&B'} - {order.options?.twoSided ? 'Recto-Verso' : 'Recto'}</div>
                              <div>{order.pageCount} pages, {order.options?.copies} {order.options?.copies > 1 ? 'copies' : 'copie'}</div>
                              {order.options?.binding !== 'none' && <div>Reliure: {order.options?.binding}</div>}
                            </td>
                            <td className="py-4 px-6 text-sm font-bold text-slate-800">
                              {order.totalPrice} CFA
                            </td>
                            <td className="py-4 px-6 text-xs text-gray-600">
                              {order.pickupPoint}
                            </td>
                            <td className="py-4 px-6">
                              <select 
                                value={order.status}
                                onChange={(e) => handleUpdatePrintStatus(order.id, e.target.value)}
                                className={`text-xs font-bold px-2 py-1 flex items-center rounded-lg border outline-none 
                                ${order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                 order.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                 order.status === 'ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}
                              >
                                <option value="pending">En attente</option>
                                <option value="processing">En traitement</option>
                                <option value="ready">Prêt (A récupérer)</option>
                                <option value="delivered">Livré</option>
                              </select>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {/* Optionnel: Bouton pour afficher les détails du modèle ou un commentaire */}
                              {order.comment && (
                                <button className="text-slate-400 hover:text-slate-600 focus:outline-none" title={order.comment}>
                                  <MessageSquare size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {contentTab === 'stages' && (
                <div className="flex justify-end p-4 bg-gray-50 border-b border-gray-100">
                  <button 
                    onClick={() => window.location.href = '/internships'}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <Plus size={16} />
                    Publier une offre
                  </button>
                </div>
              )}
              {contentTab === 'stages' && internships.map(job => (
                <div key={job.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.company} • {job.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a 
                      href={job.linkUrl || '#'} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Voir l'offre"
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button 
                      onClick={() => {
                        setEditingInternship(job);
                        setShowEditInternshipModal(true);
                      }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Modifier l'offre"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm('Supprimer cette offre ?')) deleteInternship(job.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {contentTab === 'marketplace' && (
                <div className="divide-y divide-gray-50">
                  {marketplace.sort((a, b) => {
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return (b.reportCount || 0) - (a.reportCount || 0);
                  }).map(item => (
                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex gap-4">
                          <div className="relative">
                            <img src={item.imageUrls?.[0] || item.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                            {item.status === 'pending' && (
                              <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">EN ATTENTE</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900">{item.title}</h3>
                              <span className="text-emerald-600 font-bold text-sm">{item.price.toLocaleString()} CFA</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                            <div className="flex flex-wrap gap-3 text-[10px] font-medium text-gray-400">
                              <span className="flex items-center gap-1"><MapPin size={12} /> {item.university || item.location}</span>
                              <span className="flex items-center gap-1"><Users size={12} /> {item.seller?.firstName} {item.seller?.lastName}</span>
                              {(item.reportCount || 0) > 0 && (
                                <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={12} /> {item.reportCount} signalements
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[150px] justify-center">
                          {item.status === 'pending' ? (
                            <>
                              <button 
                                onClick={() => reviewMarketplaceItem(item.id, 'approved')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                              >
                                <Check size={16} />
                                Approuver
                              </button>
                              <button 
                                onClick={() => reviewMarketplaceItem(item.id, 'rejected')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                              >
                                <X size={16} />
                                Rejeter
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => {
                                if(confirm('Supprimer cet article ?')) deleteMarketplaceItem(item.id);
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={16} />
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {marketplace.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                      <p>Aucun article dans la marketplace.</p>
                    </div>
                  )}
                </div>
              )}

              {contentTab === 'community' && community.map(post => (
                <div key={post.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {post.author?.avatarUrl ? (
                      <img src={post.author.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                        <Users size={20} />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900 text-sm line-clamp-1">{post.content}</p>
                      <p className="text-xs text-gray-500">Par {post.author?.firstName || 'Anonyme'} • {post.likes} likes • {post.comments?.length || 0} commentaires</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if(confirm('Supprimer ce post ?')) deletePost(post.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {contentTab === 'events' && events.map(event => (
                <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.date} à {event.time} • {event.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        console.log('Attempting to delete event:', event.id);
                        deleteEvent(event.id).then(() => console.log('Event deleted')).catch(err => console.error('Delete error:', err));
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {contentTab === 'lostAndFound' && lostAndFound.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      item.status === 'lost' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{item.status === 'lost' ? 'Perdu' : 'Trouvé'} • {item.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if(confirm('Supprimer cet objet ?')) deleteLostAndFound(item.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {contentTab === 'enterprise' && adminUsers.filter(u => u.role === 'company').map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{u.companyName || `${u.firstName} ${u.lastName}`}</p>
                      <p className="text-xs text-gray-500">{u.email} • {u.city || 'Ville non précisée'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest mr-2">
                      {internships.filter(i => i.authorId === u.id).length} offres
                    </span>
                    <button 
                      onClick={() => {
                        if(confirm('Supprimer cette entreprise ?')) deleteUser(u.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {contentTab === 'university' && adminUsers.filter(u => u.role === 'institution').map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                      <School size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{u.institutionProfile?.type || u.university || `${u.firstName} ${u.lastName}`}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100 uppercase tracking-widest mr-2">
                      {events.filter(e => e.organizerId === u.id).length} événements
                    </span>
                    <button 
                      onClick={() => {
                        if(confirm('Supprimer cette institution ?')) deleteUser(u.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {contentTab === 'news' && news.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Newspaper size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{item.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if(confirm('Supprimer cette actualité ?')) deleteNews(item.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {contentTab === 'public_service_contests' && publicServiceContests.map(contest => (
                <div key={contest.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{contest.titre}</p>
                      <p className="text-xs text-gray-500">{contest.categorie} • {contest.niveau} • {contest.questions?.length || 0} questions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => deletePublicServiceContest(contest.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              {contentTab === 'ads' && ads.map(ad => (
                <div key={ad.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={ad.imageUrl} alt="" className="w-20 h-12 rounded-lg object-cover bg-gray-100" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{ad.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                          ad.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {ad.active ? 'Actif' : 'Inactif'}
                        </span>
                        <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          Lien <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateAd(ad.id, { active: !ad.active })}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title={ad.active ? "Désactiver" : "Activer"}
                    >
                      {ad.active ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm('Supprimer cette publicité ?')) deleteAd(ad.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {contentTab === 'tutors' && (
                <div className="p-0">
                  {/* Pending Tutor Applications */}
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <GraduationCap className="text-emerald-600" size={18} />
                      Demandes Répétiteurs & Prof de maison en attente
                    </h3>
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                      {applications.filter(a => a.status === 'pending').length} en attente
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {applications.filter(a => a.status === 'pending').length > 0 ? (
                      applications.filter(a => a.status === 'pending').map((app) => (
                        <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-4">
                              <img src={app.user?.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100" />
                              <div>
                                <h3 className="font-bold text-gray-900">{app.user?.firstName} {app.user?.lastName}</h3>
                                <p className="text-xs text-gray-500 mb-2">{app.user?.university} • {app.user?.major}</p>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {app.subjects?.map((sub) => (
                                    <span key={sub} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full font-bold">
                                      {sub}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                  "{app.description}"
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 min-w-[200px]">
                              {app.documentUrl && app.documentUrl !== '#' ? (
                                <div className="flex flex-col gap-2">
                                  <a 
                                    href={app.documentUrl} 
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                  >
                                    <Eye size={16} />
                                    Voir Justificatif
                                  </a>
                                  <a 
                                    href={app.documentUrl} 
                                    download
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
                                  >
                                    <Download size={16} />
                                    Télécharger
                                  </a>
                                </div>
                              ) : (
                                <button 
                                  disabled
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-bold cursor-not-allowed"
                                >
                                  <Download size={16} />
                                  Aucun justificatif
                                </button>
                              )}
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => reviewApplication(app.id, 'approved')}
                                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                                >
                                  <Check size={16} />
                                  Accepter
                                </button>
                                <button 
                                  onClick={() => reviewApplication(app.id, 'rejected')}
                                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                                >
                                  <X size={16} />
                                  Refuser
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <p>Aucune demande en attente.</p>
                      </div>
                    )}
                  </div>

                  {/* Approved Tutors */}
                  <div className="p-6 border-y border-gray-50 flex justify-between items-center bg-gray-50/50 mt-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <UserCheck className="text-blue-600" size={18} />
                      Répétiteurs & Prof de maison actifs
                    </h3>
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {tutors.length} actifs
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {tutors.map(tutor => (
                      <div key={tutor.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between gap-4 items-center">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <img src={tutor.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100 object-cover" />
                          <div>
                            <h3 className="font-bold text-gray-900">{tutor.firstName} {tutor.lastName}</h3>
                            <p className="text-xs text-gray-500 mb-1">{tutor.university} • {tutor.major}</p>
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] rounded-full font-bold">
                              Statut : Actif
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <button 
                            onClick={async () => {
                              if(confirm('Voulez-vous retirer le statut répétiteur de cet utilisateur ?')) {
                                await updateDoc(doc(db, 'users', tutor.id), { tutorStatus: 'none' });
                              }
                            }}
                            className="px-4 py-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors flex items-center gap-2"
                          >
                            <Ban size={16} />
                            Rétrograder
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(tutor.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contentTab === 'teachers' && (
                <div className="p-0">
                  {/* Pending Applications */}
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Library className="text-emerald-600" size={18} />
                      Dossiers en attente de validation
                    </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">{pendingTeacherApplications.length} en attente</span>
                        <button 
                          onClick={async () => {
                            const tId = toast.loading('Synchronisation forcée...');
                            try {
                              // We could trigger a manual refetch here if needed
                              toast.success('Données synchronisées', { id: tId });
                            } catch (e) {
                              toast.error('Erreur synchro', { id: tId });
                            }
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400"
                          title="Forcer rafraîchissement"
                        >
                          <RefreshCw size={12} className={cn(false && "animate-spin")} />
                        </button>
                        {teacherApplications.length === 0 && (
                          <span className="text-[10px] text-red-500 font-bold animate-pulse">Aucune donnée détectée</span>
                        )}
                      </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {pendingTeacherApplications.length > 0 ? (
                      pendingTeacherApplications.map((app) => (
                        <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-4">
                              <img src={app.user?.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100" />
                              <div>
                                <h3 className="font-bold text-gray-900">{app.user?.firstName} {app.user?.lastName}</h3>
                                <p className="text-xs text-gray-500 mb-2">{app.user?.university} • {app.academicRank}</p>
                                <div className="mb-2">
                                  <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] rounded-full font-bold">
                                    Statut : En attente
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {app.specialties?.map((sub) => (
                                    <span key={sub} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full font-bold">
                                      {sub}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                  "{app.biography}"
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 min-w-[200px]">
                              <div className="flex flex-col gap-2">
                                {app.cvUrl && app.cvUrl !== '#' ? (
                                  <div className="flex flex-col gap-2">
                                    <a 
                                      href={app.cvUrl} 
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                    >
                                      <Eye size={16} />
                                      Voir CV
                                    </a>
                                    <a 
                                      href={app.cvUrl} 
                                      download
                                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
                                    >
                                      <Download size={16} />
                                      Télécharger CV
                                    </a>
                                  </div>
                                ) : (
                                  <button 
                                    disabled
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-bold cursor-not-allowed"
                                  >
                                    <Download size={16} />
                                    Aucun CV
                                  </button>
                                )}
                                {app.diplomaUrl && app.diplomaUrl !== '#' ? (
                                  <div className="flex flex-col gap-2">
                                    <a 
                                      href={app.diplomaUrl} 
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                    >
                                      <Eye size={16} />
                                      Voir Diplôme
                                    </a>
                                    <a 
                                      href={app.diplomaUrl} 
                                      download
                                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
                                    >
                                      <Download size={16} />
                                      Télécharger Diplôme
                                    </a>
                                  </div>
                                ) : (
                                  <button 
                                    disabled
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-bold cursor-not-allowed"
                                  >
                                    <Download size={16} />
                                    Aucun Diplôme
                                  </button>
                                )}
                                {app.rankProofUrl && app.rankProofUrl !== '#' ? (
                                  <div className="flex flex-col gap-2">
                                    <a 
                                      href={app.rankProofUrl} 
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                    >
                                      <Eye size={16} />
                                      Preuve Grade
                                    </a>
                                    <a 
                                      href={app.rankProofUrl} 
                                      download
                                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
                                    >
                                      <Download size={16} />
                                      Télécharger Preuve
                                    </a>
                                  </div>
                                ) : (
                                  <button 
                                    disabled
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-bold cursor-not-allowed"
                                  >
                                    <Download size={16} />
                                    Aucune preuve
                                  </button>
                                )}
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button 
                                  onClick={() => reviewTeacherApplication(app.id, 'approved')}
                                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                                >
                                  <Check size={16} />
                                  Accepter
                                </button>
                                <button 
                                  onClick={() => reviewTeacherApplication(app.id, 'rejected')}
                                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                                >
                                  <X size={16} />
                                  Refuser
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <p>Aucune demande en attente pour le moment.</p>
                      </div>
                    )}
                  </div>

                  {/* Rejected Applications */}
                  {rejectedTeacherApplications.length > 0 && (
                    <>
                      <div className="p-6 border-y border-gray-50 flex justify-between items-center bg-red-50/30 mt-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <X className="text-red-600" size={18} />
                          Dossiers refusés
                        </h3>
                        <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-1 rounded-full">{rejectedTeacherApplications.length} refusés</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {rejectedTeacherApplications.map((app) => (
                          <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors opacity-75">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                              <div className="flex gap-4">
                                <img src={app.user?.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100 grayscale" />
                                <div>
                                  <h3 className="font-bold text-gray-900">{app.user?.firstName} {app.user?.lastName}</h3>
                                  <p className="text-xs text-gray-500 mb-2">{app.user?.university} • {app.academicRank}</p>
                                  <span className="px-2 py-1 bg-red-50 text-red-700 text-[10px] rounded-full font-bold">
                                    Statut : Refusé
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <button 
                                  onClick={() => reviewTeacherApplication(app.id, 'approved')}
                                  className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                                >
                                  Réévaluer (Accepter)
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Approved Teachers */}
                  <div className="p-6 border-y border-gray-50 flex justify-between items-center bg-gray-50/50 mt-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <UserCheck className="text-blue-600" size={18} />
                      Enseignants validés (Annuaire)
                    </h3>
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {teachers.filter(t => t.teacherStatus === 'approved').length} actifs
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {teachers.filter(t => t.teacherStatus === 'approved').map(teacher => (
                      <div key={teacher.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between gap-4 items-center">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <img src={teacher.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100 object-cover" />
                          <div>
                            <h3 className="font-bold text-gray-900">{teacher.firstName} {teacher.lastName}</h3>
                            <p className="text-xs text-gray-500 mb-1">{teacher.university} • {teacher.teacherProfile?.academicRank}</p>
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] rounded-full font-bold">
                              Statut : Validé
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          {teacher.tutorStatus !== 'approved' && (
                            <button 
                              onClick={async () => {
                                if(confirm('Voulez-vous promouvoir cet enseignant comme Répétiteur ?')) {
                                  await updateDoc(doc(db, 'users', teacher.id), { tutorStatus: 'approved' });
                                }
                              }}
                              className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2"
                              title="Promouvoir comme Répétiteur"
                            >
                              <GraduationCap size={16} />
                              Promouvoir Répétiteur
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              if(confirm('Voulez-vous retirer le statut enseignant de cet utilisateur ?')) {
                                updateUserRole(teacher.id, 'student');
                              }
                            }}
                            className="px-4 py-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors flex items-center gap-2"
                            title="Retirer le statut enseignant"
                          >
                            <Ban size={16} />
                            Rétrograder
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(teacher.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer le compte"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {teachers.filter(t => t.teacherStatus === 'approved').length === 0 && (
                      <div className="p-8 text-center text-gray-400">
                        <p>Aucun enseignant validé pour le moment.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contentTab === 'reports' && (
                <div className="p-0">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="text-red-600" size={18} />
                      Gestion des Signalements
                    </h3>
                    <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-1 rounded-full">
                      {reports.length} au total
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {reports.length > 0 ? (
                      reports.map((report) => (
                        <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                                <AlertTriangle size={24} />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 capitalize">
                                  {report.reportedItemType} signalé
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  Raison : <span className="font-medium">{report.reason}</span>
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>Signalé par : {report.reporterName}</span>
                                  <span>•</span>
                                  <span>ID de l'élément : {report.reportedItemId}</span>
                                  <span>•</span>
                                  <span>Date : {new Date(report.createdAt).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-[200px] justify-center">
                              <button 
                                onClick={() => {
                                  if(confirm('Supprimer cet élément définitivement ?')) {
                                    // Here we would call the specific delete function based on type
                                    switch(report.reportedItemType) {
                                      case 'document': deleteDocument(report.reportedItemId); break;
                                      case 'internship': deleteInternship(report.reportedItemId); break;
                                      case 'marketplace': deleteMarketplaceItem(report.reportedItemId); break;
                                      case 'post': deletePost(report.reportedItemId); break;
                                      case 'event': deleteEvent(report.reportedItemId); break;
                                      case 'news': deleteNews(report.reportedItemId); break;
                                      case 'lostAndFound': deleteLostAndFound(report.reportedItemId); break;
                                    }
                                    deleteReport(report.id);
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                              >
                                <Trash2 size={16} />
                                Supprimer l'élément
                              </button>
                              <button 
                                onClick={() => deleteReport(report.id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                              >
                                <Check size={16} />
                                Ignorer le signalement
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-gray-400">
                        <p>Aucun signalement à traiter.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contentTab === 'motoRide' && (
                <div className="p-0">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Bike className="text-orange-600" size={18} />
                      Modération MotoRide
                    </h3>
                    <div className="flex gap-2">
                      <span className="text-xs font-medium bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                        {motoRides.length} trajets
                      </span>
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        {adminUsers.filter(u => u.isVerified && !u.isDriverVerified && u.vehicleDetails).length} vérifications en attente
                      </span>
                    </div>
                  </div>

                  {/* Driver Verification Requests */}
                  <div className="p-4 bg-blue-50/30 border-b border-blue-100">
                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Vérifications Conducteurs en attente</h4>
                    <div className="space-y-3">
                      {adminUsers.filter(u => u.isVerified && !u.isDriverVerified && u.vehicleDetails).map(user => (
                        <div key={user.id} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex gap-4">
                            <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                            <div>
                              <p className="font-bold text-gray-900">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-500">{user.university} • {user.phone}</p>
                              <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs">
                                <p><span className="font-bold">Véhicule:</span> {user.vehicleDetails?.type}</p>
                                <p><span className="font-bold">Plaque:</span> {user.vehicleDetails?.plateNumber}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => verifyDriver(user.id, user.vehicleDetails)}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                            >
                              <Check size={16} />
                              Valider Conducteur
                            </button>
                            <button 
                              onClick={async () => {
                                if(confirm('Refuser la demande de conducteur ?')) {
                                  await updateDoc(doc(db, 'users', user.id), { vehicleDetails: null });
                                }
                              }}
                              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                            >
                              Refuser
                            </button>
                          </div>
                        </div>
                      ))}
                      {adminUsers.filter(u => u.isVerified && !u.isDriverVerified && u.vehicleDetails).length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">Aucune demande de vérification en attente.</p>
                      )}
                    </div>
                  </div>

                  {/* Active Rides */}
                  <div className="divide-y divide-gray-50">
                    <div className="p-4 bg-gray-50/50">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trajets en cours</h4>
                    </div>
                    {motoRides.map((ride) => (
                      <div key={ride.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                              <Bike size={24} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900">{ride.departure} → {ride.destination}</h3>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                  ride.status === 'active' ? "bg-emerald-100 text-emerald-700" :
                                  ride.status === 'completed' ? "bg-blue-100 text-blue-700" :
                                  ride.status === 'cancelled' ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700"
                                )}>
                                  {ride.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                Conducteur : <span className="font-bold">{ride.driverName}</span> • {ride.price} FCFA • {ride.time}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{ride.passengers?.length || 0} passagers</span>
                                <span>•</span>
                                <span>{ride.reports?.length || 0} signalements</span>
                                <span>•</span>
                                <span>{new Date(ride.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[180px] justify-center">
                            {ride.status === 'active' && (
                              <button 
                                onClick={() => updateRideStatus(ride.id, 'suspended')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors"
                              >
                                <Ban size={16} />
                                Suspendre
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                if(confirm('Supprimer ce trajet définitivement ?')) deleteMotoRide(ride.id);
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} />
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {motoRides.length === 0 && (
                      <div className="p-12 text-center text-gray-400">
                        <p>Aucun trajet publié.</p>
                      </div>
                    )}
                  </div>

                  {/* Suspended Users */}
                <div className="p-6 border-t border-gray-100 bg-red-50/30">
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-4">Utilisateurs MotoRide Suspendus</h4>
                    <div className="space-y-3">
                      {adminUsers.filter(u => u.motoRideStatus === 'suspended').map(user => (
                        <div key={user.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover grayscale" />
                            <div>
                              <p className="font-bold text-gray-900">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-red-600 font-medium">Compte MotoRide Suspendu</p>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              if(confirm('Réactiver le compte MotoRide de cet utilisateur ?')) {
                                await updateDoc(doc(db, 'users', user.id), { motoRideStatus: 'active' });
                              }
                            }}
                            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                          >
                            Réactiver
                          </button>
                        </div>
                      ))}
                      {adminUsers.filter(u => u.motoRideStatus === 'suspended').length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">Aucun utilisateur suspendu.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {contentTab === 'formations' && (
                <div className="p-0">
                  {/* Pending Trainings */}
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <BookOpen className="text-emerald-600" size={18} />
                      Formations en attente de validation
                    </h3>
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                      {trainings.filter(t => t.status === 'pending').length} en attente
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {trainings.filter(t => t.status === 'pending').length > 0 ? (
                      trainings.filter(t => t.status === 'pending').map((training) => (
                        <div key={training.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-4">
                              <img src={training.imageUrl || `https://picsum.photos/seed/${training.id}/200/200`} alt="" className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                              <div>
                                <h3 className="font-bold text-gray-900">{training.title}</h3>
                                <p className="text-xs text-gray-500 mb-2">Par {training.trainerName} • {training.domain} • {training.type === 'online' ? 'En ligne' : 'Présentiel'}</p>
                                <p className="text-sm text-gray-600 line-clamp-2 max-w-xl">{training.description}</p>
                                <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
                                  <span className="flex items-center gap-1"><Users size={12} /> {training.participants.length} / {training.maxParticipants} inscrits</span>
                                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(training.startDate).toLocaleDateString()}</span>
                                  <span className="font-bold text-emerald-600">{training.price === 0 ? 'GRATUIT' : `${training.price} CFA`}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-[150px]">
                              <button 
                                onClick={() => updateTrainingStatus(training.id, 'approved')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                <Check size={16} />
                                Approuver
                              </button>
                              <button 
                                onClick={() => updateTrainingStatus(training.id, 'rejected')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                              >
                                <X size={16} />
                                Rejeter
                              </button>
                              <button 
                                onClick={() => {
                                  if(confirm('Supprimer définitivement cette formation ?')) deleteTraining(training.id);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                              >
                                <Trash2 size={16} />
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-gray-400">
                        <p>Aucune formation en attente.</p>
                      </div>
                    )}
                  </div>

                  {/* Approved Trainings */}
                  <div className="p-6 border-y border-gray-50 flex justify-between items-center bg-gray-50/50 mt-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle2 className="text-blue-600" size={18} />
                      Formations actives
                    </h3>
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {trainings.filter(t => t.status === 'approved').length} actives
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {trainings.filter(t => t.status === 'approved').map(training => (
                      <div key={training.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between gap-4 items-center">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <img src={training.imageUrl || `https://picsum.photos/seed/${training.id}/200/200`} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                          <div>
                            <h3 className="font-bold text-gray-900">{training.title}</h3>
                            <p className="text-xs text-gray-500">{training.trainerName} • {training.domain}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-bold text-emerald-600 uppercase">{training.participants.length} participants</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{training.type}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <button 
                            onClick={() => updateTrainingStatus(training.id, 'rejected')}
                            className="px-4 py-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors"
                          >
                            Désactiver
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm('Supprimer définitivement cette formation ?')) deleteTraining(training.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contentTab === 'contests' && (
                <div className="p-0">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Trophy className="text-emerald-600" size={18} />
                      Gestion des Concours
                    </h3>
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                      {contests.length} concours
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {contests.length > 0 ? (
                      contests.map((contest) => (
                        <div key={contest.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-4">
                              <img src={contest.imageUrl || `https://picsum.photos/seed/${contest.id}/200/200`} alt="" className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                              <div>
                                <h3 className="font-bold text-gray-900">{contest.title}</h3>
                                <p className="text-xs text-gray-500 mb-2">{contest.type} • {new Date(contest.startDate).toLocaleDateString()} - {new Date(contest.endDate).toLocaleDateString()}</p>
                                <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
                                  <span className="flex items-center gap-1"><Users size={12} /> {contestParticipants.filter(p => p.contestId === contest.id).length} / {contest.maxParticipants} participants</span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full font-bold uppercase",
                                    contest.status === 'active' ? "bg-emerald-50 text-emerald-600" :
                                    contest.status === 'finished' ? "bg-blue-50 text-blue-600" :
                                    contest.status === 'results_published' ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-500"
                                  )}>
                                    {contest.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-[150px]">
                              <button 
                                onClick={() => setShowParticipantsModal(contest)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                              >
                                <Users size={16} />
                                Participants
                              </button>
                              <button 
                                onClick={async () => {
                                  if(confirm('Charger 20 participants fictifs ?')) {
                                    try {
                                      await seedContestParticipants(contest.id);
                                      alert('Participants chargés !');
                                    } catch (error) {
                                      console.error('Erreur lors du chargement:', error);
                                      alert('Erreur lors du chargement des participants. Vérifiez la console.');
                                    }
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors"
                              >
                                <Users size={16} />
                                Charger Participants
                              </button>
                              <button 
                                onClick={() => { setEditingContest(contest); setShowAddContestModal(true); }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                <Edit2 size={16} />
                                Modifier
                              </button>
                              <button 
                                onClick={() => {
                                  console.log('Attempting to delete contest:', contest.id);
                                  deleteContest(contest.id).then(() => console.log('Contest deleted')).catch(err => console.error('Delete error:', err));
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                              >
                                <Trash2 size={16} />
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-gray-400">
                        <p>Aucun concours créé.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contentTab === 'deals' && (
                <div className="p-0">
                  <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Tag className="text-emerald-600" size={18} />
                        Gestion des Bons Plans
                      </h3>
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                          onClick={() => setDealsSubTab('list')}
                          className={cn(
                            "px-3 py-1 text-xs font-bold rounded-md transition-all",
                            dealsSubTab === 'list' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Offres
                        </button>
                        <button 
                          onClick={() => setDealsSubTab('suggestions')}
                          className={cn(
                            "px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                            dealsSubTab === 'suggestions' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Suggestions
                          {dealSuggestions.filter(s => s.status === 'pending').length > 0 && (
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                        {dealsSubTab === 'list' ? `${deals.length} offres` : `${dealSuggestions.length} suggestions`}
                      </span>
                      {dealsSubTab === 'list' && (
                        <button 
                          onClick={() => { setEditingDeal(null); setShowAddDealModal(true); }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-md"
                        >
                          <Plus size={16} />
                          Ajouter
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {dealsSubTab === 'list' ? (
                      deals.length > 0 ? (
                        deals.map((deal) => (
                          <div key={deal.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                              <div className="flex gap-4">
                                <img src={deal.imageUrl || `https://picsum.photos/seed/${deal.id}/200/200`} alt="" className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                                <div>
                                  <h3 className="font-bold text-gray-900">{deal.title}</h3>
                                  <p className="text-xs text-gray-500 mb-1">{deal.partnerName} • {deal.discountValue}</p>
                                  <p className="text-xs text-gray-400 line-clamp-1 mb-2">{deal.description}</p>
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                      deal.active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                    )}>
                                      {deal.active ? 'Actif' : 'Inactif'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                      {deal.category}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 min-w-[150px]">
                                <button 
                                  onClick={() => { setEditingDeal(deal); setShowAddDealModal(true); }}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                  <Edit2 size={16} />
                                  Modifier
                                </button>
                                <button 
                                  onClick={() => {
                                    if(confirm('Supprimer ce bon plan ?')) deleteDeal(deal.id);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                                >
                                  <Trash2 size={16} />
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center text-gray-400">
                          <p>Aucun bon plan créé.</p>
                        </div>
                      )
                    ) : (
                      dealSuggestions.length > 0 ? (
                        dealSuggestions.map((suggestion) => (
                          <div key={suggestion.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-bold text-gray-900">{suggestion.title}</h3>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                    suggestion.status === 'pending' ? "bg-amber-50 text-amber-600" : 
                                    suggestion.status === 'reviewed' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                  )}>
                                    {suggestion.status === 'pending' ? 'En attente' : 
                                     suggestion.status === 'reviewed' ? 'Examiné' : 'Rejeté'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-1">Partenaire : <span className="font-bold">{suggestion.partnerName}</span></p>
                                <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                  <span className="font-bold text-gray-500 uppercase">Suggéré par : {suggestion.userName}</span>
                                  <span>•</span>
                                  <span>{suggestion.createdAt ? new Date(suggestion.createdAt).toLocaleDateString() : 'Date inconnue'}</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 min-w-[150px]">
                                {suggestion.status === 'pending' && (
                                  <>
                                    <button 
                                      onClick={() => reviewDealSuggestion(suggestion.id, 'reviewed')}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                                    >
                                      <Check size={16} />
                                      Marquer examiné
                                    </button>
                                    <button 
                                      onClick={() => reviewDealSuggestion(suggestion.id, 'rejected')}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                                    >
                                      <X size={16} />
                                      Rejeter
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={() => {
                                    if(confirm('Supprimer cette suggestion ?')) deleteDealSuggestion(suggestion.id);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                                >
                                  <Trash2 size={16} />
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center text-gray-400">
                          <p>Aucune suggestion de bon plan.</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}



              {contentTab === 'colocation' && (
                <div className="p-0">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Home className="text-emerald-600" size={18} />
                      Gestion des Colocations
                    </h3>
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                      {colocations.length} annonces
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {colocations.length > 0 ? (
                      colocations.map((coloc) => (
                        <div key={coloc.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-4">
                              <img src={coloc.imageUrls[0] || `https://picsum.photos/seed/${coloc.id}/200/200`} alt="" className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                              <div>
                                <h3 className="font-bold text-gray-900">{coloc.title}</h3>
                                <p className="text-xs text-gray-500 mb-1">{coloc.city} • {coloc.neighborhood} • {coloc.price.toLocaleString()} CFA/mois</p>
                                <p className="text-xs text-gray-400 line-clamp-1 mb-2">{coloc.description}</p>
                                <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                    coloc.status === 'active' ? "bg-emerald-50 text-emerald-600" : 
                                    coloc.status === 'filled' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                                  )}>
                                    {coloc.status === 'active' ? 'Actif' : coloc.status === 'filled' ? 'Complet' : 'Annulé'}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                    {coloc.ownerName}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-[150px]">
                              <button 
                                onClick={() => {
                                  if(confirm('Supprimer cette annonce de colocation ?')) deleteColocation(coloc.id);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                              >
                                <Trash2 size={16} />
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-gray-400">
                        <p>Aucune annonce de colocation.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contentTab === 'payments' && (
                <div className="p-0">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard className="text-indigo-600" size={18} />
                      Gestion des Paiements & Abonnements
                    </h3>
                    <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                      {subscriptionRequests.length} au total
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {subscriptionRequests.length > 0 ? (
                      subscriptionRequests.map((req) => (
                        <div key={req.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              req.status === 'pending' ? "bg-amber-50 text-amber-600" : 
                              req.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              <CreditCard size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">
                                {req.type === 'premium' ? 'Abonnement Premium' : 'Abonnement'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Par {req.user?.firstName} {req.user?.lastName} • {req.amount} FCFA • {new Date(req.createdAt).toLocaleDateString()}
                              </p>
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                                req.status === 'pending' ? "bg-amber-100 text-amber-700" : 
                                req.status === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                              )}>
                                {req.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => reviewSubscriptionRequest(req.id, 'approved')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Approuver"
                                >
                                  <Check size={18} />
                                </button>
                                <button 
                                  onClick={() => reviewSubscriptionRequest(req.id, 'rejected')}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Rejeter"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <p>Aucune demande de paiement pour le moment.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAIGenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw size={20} className="text-indigo-600" />
                Générer un concours (IA)
              </h2>
              <button onClick={() => setShowAIGenModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titre du concours</label>
                <input 
                  type="text" 
                  value={aiGenData.title}
                  onChange={(e) => setAiGenData({ ...aiGenData, title: e.target.value })}
                  placeholder="Ex: Culture Générale - session 2024"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Catégorie</label>
                <select 
                  value={aiGenData.category}
                  onChange={(e) => setAiGenData({ ...aiGenData, category: e.target.value as PublicServiceCategory })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                >
                  <option value="culture_generale">Culture Générale</option>
                  <option value="maths">Mathématiques</option>
                  <option value="droit">Droit</option>
                  <option value="economie">Économie</option>
                  <option value="svt">SVT</option>
                  <option value="physique">Physique</option>
                  <option value="chimie">Chimie</option>
                  <option value="dissertation_redaction">Dissertation / Rédaction</option>
                  <option value="tests_psychotechniques">Tests Psychotechniques</option>
                  <option value="cas_pratique">Cas pratique</option>
                  <option value="actualite_retrospective">Actualité Rétrospective</option>
                  <option value="societes_evenements">Sociétés et Événements</option>
                  <option value="institutions_nationales_internationales">Institutions Nationales/Internationales</option>
                  <option value="culture_litterature_internationales">Culture et Littérature Internationales</option>
                  <option value="culture_litteraire_artistique">Culture Littéraire et Artistique</option>
                  <option value="histoire">Histoire</option>
                  <option value="geographie">Géographie</option>
                  <option value="philosophie">Philosophie</option>
                  <option value="psychologie">Psychologie</option>
                  <option value="sociologie">Sociologie</option>
                  <option value="francais">Français</option>
                  <option value="sciences_technologie">Sciences et Technologie</option>
                  <option value="connaissances_burkina">Connaissances du Burkina</option>
                  <option value="test_niveau">Test de Niveau</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Niveau</label>
                <select 
                  value={aiGenData.level}
                  onChange={(e) => setAiGenData({ ...aiGenData, level: e.target.value as PublicServiceLevel })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                >
                  <option value="BEPC">BEPC</option>
                  <option value="BAC">BAC</option>
                  <option value="Licence">Licence</option>
                  <option value="Master">Master</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre de questions</label>
                <input 
                  type="number" 
                  min="5"
                  max="50"
                  value={aiGenData.numQuestions}
                  onChange={(e) => setAiGenData({ ...aiGenData, numQuestions: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleAIGenerateContest}
                  disabled={isGenerating || !aiGenData.title}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2",
                    isGenerating ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Générer maintenant
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualContestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus size={20} className="text-emerald-600" />
                Créer un concours (Manuel)
              </h2>
              <button onClick={() => setShowManualContestModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titre du concours</label>
                <input 
                  type="text" 
                  value={manualContestData.title}
                  onChange={(e) => setManualContestData({ ...manualContestData, title: e.target.value })}
                  placeholder="Ex: Concours d'intégration 2024"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                />
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox"
                    checked={manualContestData.shuffle}
                    onChange={(e) => setManualContestData({ ...manualContestData, shuffle: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label className="text-sm font-bold text-gray-700">Mélanger les questions</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Catégorie</label>
                  <select 
                    value={manualContestData.category}
                    onChange={(e) => setManualContestData({ ...manualContestData, category: e.target.value as PublicServiceCategory })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                  >
                    <option value="culture_generale">Culture Générale</option>
                    <option value="maths">Mathématiques</option>
                    <option value="droit">Droit</option>
                    <option value="economie">Économie</option>
                    <option value="svt">SVT</option>
                    <option value="physique">Physique</option>
                    <option value="chimie">Chimie</option>
                    <option value="dissertation_redaction">Dissertation / Rédaction</option>
                    <option value="tests_psychotechniques">Tests Psychotechniques</option>
                    <option value="cas_pratique">Cas pratique</option>
                    <option value="actualite_retrospective">Actualité Rétrospective</option>
                    <option value="societes_evenements">Sociétés et Événements</option>
                    <option value="institutions_nationales_internationales">Institutions Nationales/Internationales</option>
                    <option value="culture_litterature_internationales">Culture et Littérature Internationales</option>
                    <option value="culture_litteraire_artistique">Culture Littéraire et Artistique</option>
                    <option value="histoire">Histoire</option>
                    <option value="geographie">Géographie</option>
                    <option value="philosophie">Philosophie</option>
                    <option value="psychologie">Psychologie</option>
                    <option value="sociologie">Sociologie</option>
                    <option value="francais">Français</option>
                    <option value="sciences_technologie">Sciences et Technologie</option>
                    <option value="connaissances_burkina">Connaissances du Burkina</option>
                    <option value="test_niveau">Test de Niveau</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Niveau</label>
                  <select 
                    value={manualContestData.level}
                    onChange={(e) => setManualContestData({ ...manualContestData, level: e.target.value as PublicServiceLevel })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                  >
                    <option value="BEPC">BEPC</option>
                    <option value="BAC">BAC</option>
                    <option value="Licence">Licence</option>
                    <option value="Master">Master</option>
                    <option value="Tout Niveau">Tout Niveau</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                   <p className="text-xs text-emerald-800 flex items-center gap-2 font-medium">
                     <Plus size={14} />
                     {parsedQuestionsCount > 0 ? `${parsedQuestionsCount} questions détectées.` : "Collez vos questions au format JSON ci-dessous."}
                   </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                    <span>Questions (Format JSON Array)</span>
                    <button 
                      onClick={() => {
                        const template = `[\n  {\n    "question": "Quelle est la capitale du Burkina Faso ?",\n    "options": ["Bobo-Dioulasso", "Ouagadougou", "Koudougou", "Banfora"],\n    "bonne_reponse": 1,\n    "explication": "Ouagadougou est la capitale politique et administrative."\n  }\n]`;
                        handleJSONChange(template);
                      }}
                      className="text-emerald-600 hover:underline normal-case"
                    >
                      Insérer modèle
                    </button>
                  </label>
                  <textarea 
                    rows={10}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={manualContestData.questionsJSON}
                    onChange={(e) => handleJSONChange(e.target.value)}
                    placeholder='[{"question": "...", "options": [...], "bonne_reponse": 0}]'
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleManualContestCreate}
                  disabled={!manualContestData.title || !manualContestData.questionsJSON}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                  Enregistrer ce concours
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Selection Modal */}
      {showGroupSelectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Ajouter à un groupe
              </h2>
              <button 
                onClick={() => setShowGroupSelectModal(null)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {groups.map(group => {
                const isMember = group.members.includes(showGroupSelectModal);
                return (
                  <div key={group.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{group.name}</h3>
                      <p className="text-xs text-gray-500">{group.members.length} membres</p>
                    </div>
                    {isMember ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check size={14} />
                        Déjà membre
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleAddUserToGroup(group.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Ajouter
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Contest Participants Modal */}
      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Participants: {showParticipantsModal.title}
              </h2>
              <button 
                onClick={() => setShowParticipantsModal(null)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {contestParticipants.filter(p => p.contestId === showParticipantsModal.id).map(participant => (
                <div key={participant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img src={participant.userAvatar || `https://ui-avatars.com/api/?name=${participant.userName}`} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{participant.userName}</h3>
                      <p className="text-xs text-gray-500">Score: {participant.totalScore}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                      participant.status === 'validated' ? "bg-emerald-100 text-emerald-700" : 
                      participant.status === 'excluded' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {participant.status}
                    </span>
                    {participant.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateParticipantStatus(participant.id, 'validated')}
                          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Valider"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => updateParticipantStatus(participant.id, 'excluded')}
                          className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Exclure"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {contestParticipants.filter(p => p.contestId === showParticipantsModal.id).length === 0 && (
                <p className="text-center text-gray-400 py-4">Aucun participant pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Ad Modal */}
      {showEditInternshipModal && editingInternship && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Modifier l'offre</h2>
              <button onClick={() => setShowEditInternshipModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveInternship} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Titre</label>
                  <input
                    type="text"
                    required
                    value={editingInternship.title}
                    onChange={(e) => setEditingInternship({ ...editingInternship, title: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Entreprise</label>
                  <input
                    type="text"
                    required
                    value={editingInternship.company}
                    onChange={(e) => setEditingInternship({ ...editingInternship, company: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Lieu</label>
                  <input
                    type="text"
                    required
                    value={editingInternship.location}
                    onChange={(e) => setEditingInternship({ ...editingInternship, location: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={editingInternship.type}
                    onChange={(e) => setEditingInternship({ ...editingInternship, type: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="Stage">Stage</option>
                    <option value="Bourse">Bourse</option>
                    <option value="Emploi">Emploi</option>
                    <option value="Job Etudiant">Job Etudiant</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  value={editingInternship.description}
                  onChange={(e) => setEditingInternship({ ...editingInternship, description: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all h-32 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Mode de candidature</label>
                  <select
                    value={editingInternship.applicationMethod || 'email'}
                    onChange={(e) => setEditingInternship({ ...editingInternship, applicationMethod: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="email">Email</option>
                    <option value="url">Lien web</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email ou Lien</label>
                  <input
                    type={editingInternship.applicationMethod === 'url' ? 'url' : 'email'}
                    value={editingInternship.applicationValue || editingInternship.applicationEmail || ''}
                    onChange={(e) => setEditingInternship({ ...editingInternship, applicationValue: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Date limite</label>
                <input
                  type="date"
                  value={editingInternship.deadline || ''}
                  onChange={(e) => setEditingInternship({ ...editingInternship, deadline: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              >
                Enregistrer les modifications
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddAdModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Nouvelle Publicité</h2>
              <button onClick={() => setShowAddAdModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Titre de la publicité</label>
                <input 
                  type="text" 
                  value={newAd.title}
                  onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                  placeholder="Ex: -50% sur les fournitures" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Image de la publicité</label>
                <div className="flex flex-col gap-3">
                  {newAd.imageUrl && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-200">
                      <img src={newAd.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setNewAd({ ...newAd, imageUrl: '' })}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden" 
                      id="ad-image-upload"
                    />
                    <label 
                      htmlFor="ad-image-upload"
                      className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-all"
                    >
                      <Upload size={18} />
                      {newAd.imageUrl ? "Changer l'image" : "Charger une image"}
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                      <span className="text-xs font-bold">URL</span>
                    </div>
                    <input 
                      type="text" 
                      value={newAd.imageUrl}
                      onChange={(e) => setNewAd({ ...newAd, imageUrl: e.target.value })}
                      placeholder="Ou collez une URL d'image..." 
                      className="w-full pl-12 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Lien de redirection</label>
                <input 
                  type="text" 
                  value={newAd.linkUrl}
                  onChange={(e) => setNewAd({ ...newAd, linkUrl: e.target.value })}
                  placeholder="https://..." 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-500" 
                />
              </div>
              <div className="pt-4">
                  <button 
                  onClick={async () => {
                    if (!newAd.title || !newAd.imageUrl) {
                      return;
                    }
                    try {
                      await createAd({
                        ...newAd,
                        userId: currentUser?.id || '',
                        active: true,
                        createdAt: new Date().toISOString()
                      });
                      setShowAddAdModal(false);
                      setNewAd({ title: '', imageUrl: '', linkUrl: '', userId: '', active: true, createdAt: '' });
                    } catch (error: any) {
                      console.error("Ad creation error:", error);
                      alert('Erreur lors de la création de la publicité: ' + error.message);
                    }
                  }}
                  disabled={!newAd.title || !newAd.imageUrl}
                  className={cn(
                    "w-full py-3 text-white rounded-xl font-bold text-sm transition-all shadow-lg",
                    (!newAd.title || !newAd.imageUrl) 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                  )}
                >
                  Ajouter la publicité
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-gray-900">Liste des Utilisateurs</h2>
              <button 
                onClick={() => syncCommunityGroup()}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2"
              >
                <Users size={14} />
                Synchroniser Communauté
              </button>
              <button 
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Plus size={14} />
                Créer Utilisateur
              </button>
              <button 
                onClick={exportStudentContacts}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"
                title="Exporter les contacts des étudiants pour WhatsApp"
              >
                <Download size={14} />
                Exporter Contacts (CSV)
              </button>
              <button 
                onClick={handleImportCSV}
                className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-2"
                title="Mettre à jour les étudiants via CSV"
              >
                <Upload size={14} />
                Mettre à jour (CSV)
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher un utilisateur..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 w-full md:w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Utilisateur</th>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Université</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-gray-100" />
                        <div>
                          <p className="font-bold text-gray-900 leading-none">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-500 mt-1">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                        u.role === 'admin' ? "bg-purple-50 text-purple-700" : 
                        u.role === 'tutor' ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.university}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedUser(u)}
                          title="Voir Profil Complet"
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => setShowGroupSelectModal(u.id)}
                          title="Ajouter à un groupe"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                        <button 
                          onClick={() => u.status === 'active' ? deactivateUser(u.id) : activateUser(u.id)}
                          title={u.status === 'active' ? "Désactiver" : "Activer"}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            u.status === 'active' ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                          )}
                        >
                          {u.status === 'active' ? <Ban size={18} /> : <UserCheck size={18} />}
                        </button>
                        <button 
                          onClick={() => handleToggleUserRole(u.id)}
                          title={u.role === 'admin' ? "Rétrograder en étudiant" : "Promouvoir en admin"}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Shield size={18} />
                        </button>
                        <button 
                          onClick={() => handleForceUnlock(u.id, u.forceUnlocked || false)}
                          title={u.forceUnlocked ? "Rétablir restrictions" : "DÉBLOQUER DE FORCE (ACCÈS COMPLET)"}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            u.forceUnlocked ? "text-rose-600 bg-rose-50" : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                          )}
                        >
                          <Unlock size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          title="Supprimer l'utilisateur"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <ActivityLogsAdmin />
      )}

      {activeTab === 'stats' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* User Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Users className="text-blue-600" size={20} />
                Répartition des Utilisateurs
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Étudiants', value: adminUsers.filter(u => u.role === 'student').length },
                        { name: 'Répétiteurs & Prof de maison', value: adminUsers.filter(u => u.role === 'tutor').length },
                        { name: 'Enseignants', value: adminUsers.filter(u => u.role === 'teacher').length },
                        { name: 'Admins', value: adminUsers.filter(u => u.role === 'admin').length },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-gray-600">Étudiants ({adminUsers.filter(u => u.role === 'student').length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs text-gray-600">Répétiteurs & Prof de maison ({adminUsers.filter(u => u.role === 'tutor').length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-600">Enseignants ({adminUsers.filter(u => u.role === 'teacher').length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-xs text-gray-600">Admins ({adminUsers.filter(u => u.role === 'admin').length})</span>
                </div>
              </div>
            </div>

            {/* Document Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="text-emerald-600" size={20} />
                Types de Documents
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Examens', count: documents.filter(d => d.type === 'exam').length },
                      { name: 'Exercices', count: documents.filter(d => d.type === 'exercise').length },
                      { name: 'Résumés', count: documents.filter(d => d.type === 'summary').length },
                      { name: 'Mémoires', count: documents.filter(d => d.type === 'Mémoire' || d.type === 'thesis').length },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip cursor={{ fill: '#f9fafb' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Activity */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Activity className="text-purple-600" size={20} />
                Activité Récente (Derniers 7 jours)
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - i));
                      const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                      const count = logs.filter(l => {
                        const logDate = new Date(l.createdAt);
                        return logDate.toDateString() === date.toDateString();
                      }).length;
                      return { name: dateStr, actions: count };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="actions" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Financial Summary (Placeholder for Investors) */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-3xl text-white shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-2">Résumé Financier & Croissance</h3>
                <p className="text-emerald-100 max-w-md">
                  Ces données sont essentielles pour vos rapports aux investisseurs. Elles montrent la viabilité économique du projet.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8 w-full md:w-auto">
                <div className="text-center">
                  <span className="block text-3xl font-bold">{(subscriptionRequests.filter(r => r.status === 'approved').reduce((acc, r) => acc + r.amount, 0)).toLocaleString()} FCFA</span>
                  <span className="text-sm text-emerald-200">Revenus Totaux</span>
                </div>
                <div className="text-center">
                  <span className="block text-3xl font-bold">{((subscriptionRequests.filter(r => r.status === 'approved').length / (totalUsersCount || 1)) * 100).toFixed(1)}%</span>
                  <span className="text-sm text-emerald-200">Taux de Conversion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900">Profil Utilisateur Complet</h2>
              <button 
                onClick={() => setSelectedUser(null)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                <img 
                  src={selectedUser.avatarUrl} 
                  alt="" 
                  className="w-32 h-32 rounded-2xl object-cover bg-gray-100 shadow-lg" 
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <span className={cn(
                      "text-xs font-bold uppercase px-2 py-1 rounded-full",
                      selectedUser.role === 'admin' ? "bg-purple-50 text-purple-700" : 
                      selectedUser.role === 'tutor' ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                    )}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <p className="text-gray-500 mb-4">{selectedUser.email}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Université</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.university || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Filière</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.major || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Niveau</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.level || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Promotion</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.promotion || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Téléphone</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.phone || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">INE</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.ine || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Ville</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.city || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Quartier</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.neighborhood || 'Non renseigné'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Invitations</p>
                      <p className="text-sm font-bold text-gray-700">{selectedUser.inviteCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Statut Compte</p>
                      <p className={cn(
                        "text-sm font-bold",
                        selectedUser.status === 'active' ? "text-emerald-600" : "text-red-600"
                      )}>
                        {selectedUser.status === 'active' ? 'Actif' : 'Inactif'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button 
                      onClick={() => {
                        handleDeleteUser(selectedUser.id);
                        setSelectedUser(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                      Supprimer le compte
                    </button>
                    <button 
                      onClick={() => handleToggleUserRole(selectedUser.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                    >
                      <Shield size={18} />
                      {selectedUser.role === 'admin' ? 'Rétrograder' : 'Promouvoir Admin'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-emerald-600" />
                    Statistiques de l'utilisateur
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border border-gray-100 p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        {documents.filter(d => d.authorId === selectedUser.id).length}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Documents</p>
                    </div>
                    <div className="border border-gray-100 p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {community.filter(p => p.authorId === selectedUser.id).length}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Posts</p>
                    </div>
                    <div className="border border-gray-100 p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {marketplace.filter(m => m.sellerId === selectedUser.id).length}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Annonces</p>
                    </div>
                    <div className="border border-gray-100 p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {motoRides.filter(r => r.driverId === selectedUser.id).length}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Trajets</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-emerald-600" />
                    Historique complet des activités (Journaux)
                  </h4>
                  <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                      {logs
                        .filter(l => l.userId === selectedUser.id)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(log => (
                          <div key={log.id} className="p-4 flex justify-between items-center hover:bg-gray-100/50 transition-colors">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{log.action}</p>
                              <p className="text-[10px] text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-gray-500 italic max-w-[50%] text-right">{log.details}</p>
                          </div>
                        ))}
                      {logs.filter(l => l.userId === selectedUser.id).length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                          Aucune activité enregistrée pour cet utilisateur.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <DocumentModal 
        isOpen={isDocModalOpen} 
        onClose={() => setIsDocModalOpen(false)} 
        onSave={handleSaveDocument}
        document={editingDoc}
      />
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Créer un utilisateur</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Prénom" value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} className="w-full p-2 border rounded" />
              <input type="text" placeholder="Nom" value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} className="w-full p-2 border rounded" />
              <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full p-2 border rounded" />
              <input type="password" placeholder="Mot de passe" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full p-2 border rounded" />
              <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value as User['role']})} className="w-full p-2 border rounded">
                <option value="student">Étudiant</option>
                <option value="admin">Admin</option>
                <option value="tutor">Tuteur</option>
                <option value="company">Entreprise</option>
                <option value="teacher">Enseignant</option>
                <option value="institution">Institution</option>
              </select>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowCreateUserModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
                <button onClick={handleCreateUser} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <AddContestModal
        isOpen={showAddContestModal}
        onClose={() => { setShowAddContestModal(false); setEditingContest(null); }}
        onSave={handleSaveContest}
        contest={editingContest || newContest}
        setContest={editingContest ? setEditingContest : setNewContest}
      />
      <AddDealModal
        isOpen={showAddDealModal}
        onClose={() => { setShowAddDealModal(false); setEditingDeal(null); }}
        onSave={handleSaveDeal}
        deal={editingDeal || newDeal}
        setDeal={editingDeal ? setEditingDeal : setNewDeal}
      />
    </div>
  );
}

function AddDealModal({ isOpen, onClose, onSave, deal, setDeal }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="text-emerald-600" size={24} />
            {deal?.id ? 'Modifier le bon plan' : 'Nouveau Bon Plan'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titre de l'offre</label>
              <input
                type="text"
                required
                value={deal.title}
                onChange={(e) => setDeal({ ...deal, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="Ex: -20% sur les menus"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Partenaire</label>
              <input
                type="text"
                required
                value={deal.partnerName}
                onChange={(e) => setDeal({ ...deal, partnerName: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="Ex: Restaurant Le Gourmet"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea
              required
              rows={3}
              value={deal.description}
              onChange={(e) => setDeal({ ...deal, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm resize-none"
              placeholder="Détails de l'offre..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valeur de la réduction</label>
              <input
                type="text"
                required
                value={deal.discountValue}
                onChange={(e) => setDeal({ ...deal, discountValue: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="Ex: -20%, 500 FCFA, etc."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Catégorie</label>
              <select
                value={deal.category}
                onChange={(e) => setDeal({ ...deal, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              >
                <option value="food">Restauration</option>
                <option value="transport">Transport</option>
                <option value="leisure">Loisirs</option>
                <option value="education">Éducation</option>
                <option value="services">Services</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Code Promo (Optionnel)</label>
              <input
                type="text"
                value={deal.promoCode || ''}
                onChange={(e) => setDeal({ ...deal, promoCode: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="Ex: CAMPUS20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date d'expiration (Optionnel)</label>
              <input
                type="date"
                value={deal.validUntil || ''}
                onChange={(e) => setDeal({ ...deal, validUntil: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lien (Optionnel)</label>
              <input
                type="url"
                value={deal.linkUrl || ''}
                onChange={(e) => setDeal({ ...deal, linkUrl: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Image URL</label>
              <input
                type="url"
                value={deal.imageUrl || ''}
                onChange={(e) => setDeal({ ...deal, imageUrl: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Logo Partenaire URL</label>
              <input
                type="url"
                value={deal.partnerLogo || ''}
                onChange={(e) => setDeal({ ...deal, partnerLogo: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="https://..."
              />
            </div>
          </div>

           <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={deal.active}
                  onChange={(e) => setDeal({ ...deal, active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 transition-all"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-600 transition-colors">Actif</span>
            </label>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="px-8 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
          >
            {deal?.id ? 'Enregistrer les modifications' : 'Créer le bon plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddContestModal({ isOpen, onClose, onSave, contest, setContest }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="text-emerald-600" size={24} />
            {contest?.id ? 'Modifier le concours' : 'Nouveau Concours'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form id="contest-form" onSubmit={onSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Titre du concours</label>
              <input
                type="text"
                required
                value={contest.title}
                onChange={(e) => setContest({ ...contest, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="Ex: Concours de Mathématiques 2024"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type de concours</label>
              <select
                value={contest.type}
                onChange={(e) => setContest({ ...contest, type: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              >
                <option value="academic">Académique</option>
                <option value="documents">Documents</option>
                <option value="events">Événements</option>
                <option value="motoride">MotoRide</option>
                <option value="marketplace">Marketplace</option>
                <option value="ambassador">Ambassadeur</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
            <textarea
              required
              rows={3}
              value={contest.description}
              onChange={(e) => setContest({ ...contest, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm resize-none"
              placeholder="Décrivez les objectifs, les règles et le déroulement du concours..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date de début</label>
              <input
                type="date"
                required
                value={contest.startDate}
                onChange={(e) => setContest({ ...contest, startDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date de fin</label>
              <input
                type="date"
                required
                value={contest.endDate}
                onChange={(e) => setContest({ ...contest, endDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Résultats</label>
              <input
                type="date"
                required
                value={contest.resultsDate}
                onChange={(e) => setContest({ ...contest, resultsDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Max participants</label>
              <input
                type="number"
                required
                value={contest.maxParticipants}
                onChange={(e) => setContest({ ...contest, maxParticipants: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Récompense</label>
              <input
                type="text"
                required
                value={contest.reward}
                onChange={(e) => setContest({ ...contest, reward: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                placeholder="Ex: 50 000 CFA"
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Invitations min.</label>
                <input
                  type="number"
                  value={contest.conditions.minInvites}
                  onChange={(e) => setContest({ ...contest, conditions: { ...contest.conditions, minInvites: parseInt(e.target.value) } })}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none text-sm"
                />
              </div>
              <div className="flex items-center gap-3 pt-4 md:pt-6">
                <input
                  type="checkbox"
                  id="requireVerified"
                  checked={contest.conditions.requireVerifiedProfile}
                  onChange={(e) => setContest({ ...contest, conditions: { ...contest.conditions, requireVerifiedProfile: e.target.checked } })}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="requireVerified" className="text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">Profil vérifié</label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</label>
            <select
              value={contest.status}
              onChange={(e) => setContest({ ...contest, status: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            >
              <option value="draft">Brouillon</option>
              <option value="active">Actif</option>
              <option value="finished">Terminé</option>
              <option value="results_published">Résultats publiés</option>
            </select>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all text-sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="contest-form"
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 text-sm"
          >
            {contest?.id ? 'Enregistrer' : 'Créer le concours'}
          </button>
        </div>
      </div>
    </div>
  );
}
