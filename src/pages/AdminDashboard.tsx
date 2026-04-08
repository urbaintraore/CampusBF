import React, { useState } from 'react';
import { Users, FileText, AlertTriangle, Activity, Shield, GraduationCap, Check, X, Download, Search, MoreVertical, Ban, UserCheck, Briefcase, ShoppingBag, MessageSquare, Trash2, Megaphone, Plus, ExternalLink, Eye, EyeOff, Upload, CreditCard, Library, Calendar, MapPin, Newspaper, Bike, Edit2, RefreshCw, BookOpen, CheckCircle2, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { User, Log, Contest } from '@/types';
import { uploadFile } from '@/services/storageService';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { DocumentModal } from '@/components/DocumentModal';

export default function AdminDashboard() {
  const { 
    user: currentUser,
    applications, 
    reviewApplication, 
    teacherApplications,
    reviewTeacherApplication,
    subscriptionRequests, 
    reviewSubscriptionRequest, 
    syncCommunityGroup,
    users, 
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
    logs
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'logs'>('overview');
  const [contentTab, setContentTab] = useState<'documents' | 'stages' | 'marketplace' | 'community' | 'ads' | 'teachers' | 'events' | 'lostAndFound' | 'news' | 'tutors' | 'reports' | 'motoRide' | 'payments' | 'formations' | 'contests'>('documents');
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
  const [editingContest, setEditingContest] = useState<any>(null);
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
        await updateContest(editingContest.id, newContest);
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
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'enregistrement du concours');
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

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const pendingTeacherApplications = teacherApplications.filter(app => app.status === 'pending');
  console.log("AdminDashboard: pendingTeacherApplications:", pendingTeacherApplications.map(app => ({ id: app.id, status: app.status })));
  const rejectedTeacherApplications = teacherApplications.filter(app => app.status === 'rejected');
  const pendingSubscriptions = subscriptionRequests.filter(req => req.status === 'pending');

  const filteredUsers = users.filter(u => 
    u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleToggleUserRole = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      updateUserRole(userId, user.role === 'admin' ? 'student' : 'admin');
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
          <p className="text-gray-500 mt-1">Vue d'ensemble et modération de CampusBF.</p>
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
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Utilisateurs', count: users.length.toString(), icon: Users, color: 'bg-blue-50 text-blue-700' },
              { label: 'Documents', count: documents.length.toString(), icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
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
                <button className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-2">
                  <Download size={14} />
                  Rapport résumé
                </button>
                <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2">
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
                      { label: 'Étudiants', count: users.filter(u => u.role === 'student').length, color: 'bg-blue-500' },
                      { label: 'Répétiteurs', count: users.filter(u => u.tutorStatus === 'approved').length, color: 'bg-amber-500' },
                      { label: 'Enseignants', count: users.filter(u => u.role === 'teacher').length, color: 'bg-emerald-500' },
                      { label: 'Entreprises', count: users.filter(u => u.role === 'company').length, color: 'bg-purple-500' },
                      { label: 'Admins', count: users.filter(u => u.role === 'admin').length, color: 'bg-red-500' },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="text-gray-900 font-bold">{item.count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color}`} 
                            style={{ width: `${(item.count / Math.max(users.length, 1)) * 100}%` }}
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
                      <p className="text-xl font-bold text-gray-900">{documents.length}</p>
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
                        <p className="text-xs text-gray-500">7 derniers jours : {users.filter(u => {
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
              { id: 'stages', label: 'Stages & Emplois & Bourses', icon: Briefcase },
              { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
              { id: 'community', label: 'Communauté', icon: MessageSquare },
              { id: 'events', label: 'Événements', icon: Calendar },
              { id: 'lostAndFound', label: 'Objets Perdus', icon: MapPin },
              { id: 'news', label: 'Actualités', icon: Newspaper },
              { id: 'ads', label: 'Publicités', icon: Megaphone },
              { id: 'teachers', label: 'Enseignants', icon: Library },
              { id: 'tutors', label: 'Répétiteurs', icon: GraduationCap },
              { id: 'reports', label: 'Signalements', icon: AlertTriangle },
              { id: 'motoRide', label: 'MotoRide', icon: Bike },
              { id: 'formations', label: 'Formations', icon: BookOpen },
              { id: 'contests', label: 'Concours', icon: Trophy },
              { id: 'payments', label: 'Paiements', icon: CreditCard },
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
            </div>
            
            <div className="divide-y divide-gray-50">
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
                        if(confirm('Supprimer cet événement ?')) deleteEvent(event.id);
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
                      Demandes Répétiteurs en attente
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
                      Répétiteurs actifs
                    </h3>
                    <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {users.filter(u => u.tutorStatus === 'approved').length} actifs
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {users.filter(u => u.tutorStatus === 'approved').map(tutor => (
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
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">{pendingTeacherApplications.length} en attente</span>
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
                      {users.filter(u => u.role === 'teacher' && u.teacherStatus === 'approved').length} actifs
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {users.filter(u => u.role === 'teacher' && u.teacherStatus === 'approved').map(teacher => (
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
                    {users.filter(u => u.role === 'teacher' && u.teacherStatus === 'approved').length === 0 && (
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
                        {users.filter(u => u.isVerified && !u.isDriverVerified && u.vehicleDetails).length} vérifications en attente
                      </span>
                    </div>
                  </div>

                  {/* Driver Verification Requests */}
                  <div className="p-4 bg-blue-50/30 border-b border-blue-100">
                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Vérifications Conducteurs en attente</h4>
                    <div className="space-y-3">
                      {users.filter(u => u.isVerified && !u.isDriverVerified && u.vehicleDetails).map(user => (
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
                      {users.filter(u => u.isVerified && !u.isDriverVerified && u.vehicleDetails).length === 0 && (
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
                      {users.filter(u => u.motoRideStatus === 'suspended').map(user => (
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
                      {users.filter(u => u.motoRideStatus === 'suspended').length === 0 && (
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
                                onClick={() => { setEditingContest(contest); setShowAddContestModal(true); }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                <Edit2 size={16} />
                                Modifier
                              </button>
                              <button 
                                onClick={() => {
                                  if(confirm('Supprimer ce concours et tous ses participants ?')) deleteContest(contest.id);
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
                    await createAd({
                      ...newAd,
                      userId: currentUser?.id || '',
                      active: true,
                      createdAt: new Date().toISOString()
                    });
                    setShowAddAdModal(false);
                    setNewAd({ title: '', imageUrl: '', linkUrl: '', userId: '', active: true, createdAt: '' });
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="font-bold text-gray-900">Journaux d'activité</h2>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] rounded-full font-bold">
                    Aujourd'hui : {logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
                  </span>
                  <span className="px-2 py-1 bg-gray-50 text-gray-700 text-[10px] rounded-full font-bold">
                    Total : {logs.length}
                  </span>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher dans les journaux..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 w-full md:w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Date & Heure</th>
                    <th className="px-6 py-4">Utilisateur</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs
                    .filter(l => 
                      l.action?.toLowerCase().includes(logSearch.toLowerCase()) || 
                      l.userName?.toLowerCase().includes(logSearch.toLowerCase()) ||
                      l.details?.toLowerCase().includes(logSearch.toLowerCase())
                    )
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                            {log.userName?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{log.userName || 'Système'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-700">{log.action}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                        Aucun journal d'activité trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
    </div>
  );
}

function AddContestModal({ isOpen, onClose, onSave, contest, setContest }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="text-emerald-600" size={24} />
            {contest?.id ? 'Modifier le concours' : 'Nouveau Concours'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Titre du concours</label>
              <input
                type="text"
                required
                value={contest.title}
                onChange={(e) => setContest({ ...contest, title: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ex: Concours de Mathématiques 2024"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Type de concours</label>
              <select
                value={contest.type}
                onChange={(e) => setContest({ ...contest, type: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
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

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Description</label>
            <textarea
              required
              rows={4}
              value={contest.description}
              onChange={(e) => setContest({ ...contest, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              placeholder="Décrivez les objectifs, les règles et le déroulement du concours..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Date de début</label>
              <input
                type="date"
                required
                value={contest.startDate}
                onChange={(e) => setContest({ ...contest, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Date de fin</label>
              <input
                type="date"
                required
                value={contest.endDate}
                onChange={(e) => setContest({ ...contest, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Date résultats</label>
              <input
                type="date"
                required
                value={contest.resultsDate}
                onChange={(e) => setContest({ ...contest, resultsDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Nombre max participants</label>
              <input
                type="number"
                required
                value={contest.maxParticipants}
                onChange={(e) => setContest({ ...contest, maxParticipants: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Récompense</label>
              <input
                type="text"
                required
                value={contest.reward}
                onChange={(e) => setContest({ ...contest, reward: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ex: 50 000 CFA + Certificat"
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Conditions de participation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">Invitations minimales</label>
                <input
                  type="number"
                  value={contest.conditions.minInvites}
                  onChange={(e) => setContest({ ...contest, conditions: { ...contest.conditions, minInvites: parseInt(e.target.value) } })}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="requireVerified"
                  checked={contest.conditions.requireVerifiedProfile}
                  onChange={(e) => setContest({ ...contest, conditions: { ...contest.conditions, requireVerifiedProfile: e.target.checked } })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="requireVerified" className="text-sm font-medium text-gray-700">Profil vérifié requis</label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Statut</label>
            <select
              value={contest.status}
              onChange={(e) => setContest({ ...contest, status: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="draft">Brouillon</option>
              <option value="active">Actif</option>
              <option value="finished">Terminé</option>
              <option value="results_published">Résultats publiés</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              {contest?.id ? 'Enregistrer les modifications' : 'Créer le concours'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
