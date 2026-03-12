import React, { useState } from 'react';
import { Users, FileText, AlertTriangle, Activity, Shield, GraduationCap, Check, X, Download, Search, MoreVertical, Ban, UserCheck, Briefcase, ShoppingBag, MessageSquare, Trash2, Megaphone, Plus, ExternalLink, Eye, EyeOff, Upload, CreditCard, Library } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_USERS, MOCK_DOCUMENTS, MOCK_INTERNSHIPS, MOCK_MARKETPLACE, MOCK_COMMUNITY } from '@/data/mock';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { 
    applications, 
    reviewApplication, 
    teacherApplications,
    reviewTeacherApplication,
    subscriptionRequests, 
    reviewSubscriptionRequest, 
    users, 
    updateUserRole, 
    deleteUser,
    ads,
    updateAds
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content'>('overview');
  const [contentTab, setContentTab] = useState<'documents' | 'stages' | 'marketplace' | 'community' | 'ads' | 'teachers'>('documents');
  const [userSearch, setUserSearch] = useState('');
  
  // Content states
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [internships, setInternships] = useState(MOCK_INTERNSHIPS);
  const [marketplace, setMarketplace] = useState(MOCK_MARKETPLACE);
  const [community, setCommunity] = useState(MOCK_COMMUNITY);
  const [showAddAdModal, setShowAddAdModal] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', imageUrl: '', linkUrl: '' });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAd({ ...newAd, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const pendingTeacherApplications = teacherApplications.filter(app => app.status === 'pending');
  const rejectedTeacherApplications = teacherApplications.filter(app => app.status === 'rejected');
  const pendingSubscriptions = subscriptionRequests.filter(req => req.status === 'pending');

  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleToggleUserRole = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      updateUserRole(userId, user.role === 'admin' ? 'student' : 'admin');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      deleteUser(userId);
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
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Utilisateurs', count: users.length.toString(), icon: Users, color: 'bg-blue-50 text-blue-700' },
              { label: 'Documents', count: '3,890', icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Signalements', count: '12', icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
              { label: 'Demandes Répétiteur', count: pendingApplications.length.toString(), icon: GraduationCap, color: 'bg-amber-50 text-amber-700' },
              { label: 'Demandes Enseignant', count: pendingTeacherApplications.length.toString(), icon: Library, color: 'bg-emerald-50 text-emerald-700' },
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
                        <img src={req.user.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100" />
                        <div>
                          <h3 className="font-bold text-gray-900">{req.user.firstName} {req.user.lastName}</h3>
                          <p className="text-xs text-gray-500 mb-2">{req.user.email} • {req.user.phone || 'Pas de numéro'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                              req.type === 'exam' ? "bg-blue-50 text-blue-700" : 
                              req.type === 'premium' ? "bg-purple-50 text-purple-700" : 
                              req.type === 'motoride' ? "bg-orange-50 text-orange-700" : 
                              req.type === 'event' ? "bg-indigo-50 text-indigo-700" : 
                              req.type === 'institution' ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                            )}>
                              {req.type === 'exam' ? 'Abonnement Examens' : 
                               req.type === 'premium' ? 'Abonnement Premium' : 
                               req.type === 'motoride' ? 'Abonnement MotoRide' : 
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
                        <img src={app.user.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100" />
                        <div>
                          <h3 className="font-bold text-gray-900">{app.user.firstName} {app.user.lastName}</h3>
                          <p className="text-xs text-gray-500 mb-2">{app.user.university} • {app.user.major}</p>
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
                        <a 
                          href={app.documentUrl} 
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                        >
                          <Download size={16} />
                          Voir le dossier
                        </a>
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
                <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-1 rounded-full">3 nouveaux</span>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { type: 'Commentaire', reason: 'Contenu inapproprié', user: 'User123', date: 'Il y a 2h' },
                  { type: 'Document', reason: 'Copyright', user: 'User456', date: 'Il y a 5h' },
                  { type: 'Annonce', reason: 'Arnaque potentielle', user: 'User789', date: 'Il y a 1j' },
                ].map((report, i) => (
                  <div key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{report.type} - {report.reason}</p>
                      <p className="text-xs text-gray-500">Signalé par {report.user} • {report.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Supprimer</button>
                      <button className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Ignorer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">État du Système</h2>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: 'Base de données', status: 'Opérationnel', color: 'text-emerald-600' },
                  { label: 'Stockage Fichiers', status: 'Opérationnel', color: 'text-emerald-600' },
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
        </>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            {[
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'stages', label: 'Stages', icon: Briefcase },
              { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
              { id: 'community', label: 'Communauté', icon: MessageSquare },
              { id: 'ads', label: 'Publicités', icon: Megaphone },
              { id: 'teachers', label: 'Enseignants', icon: Library },
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
                      <p className="text-xs text-gray-500">{doc.course} • {doc.university}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

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
                  <button 
                    onClick={() => setInternships(prev => prev.filter(i => i.id !== job.id))}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {contentTab === 'marketplace' && marketplace.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.price.toLocaleString()} CFA • {item.seller.firstName}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMarketplace(prev => prev.filter(m => m.id !== item.id))}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {contentTab === 'community' && community.map(post => (
                <div key={post.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={post.author.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm line-clamp-1">{post.content}</p>
                      <p className="text-xs text-gray-500">Par {post.author.firstName} • {post.likes} likes • {post.comments.length} commentaires</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setCommunity(prev => prev.filter(p => p.id !== post.id))}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
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
                      onClick={() => updateAds(ads.map(a => a.id === ad.id ? { ...a, active: !a.active } : a))}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title={ad.active ? "Désactiver" : "Activer"}
                    >
                      {ad.active ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button 
                      onClick={() => updateAds(ads.filter(a => a.id !== ad.id))}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
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
                              <img src={app.user.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100" />
                              <div>
                                <h3 className="font-bold text-gray-900">{app.user.firstName} {app.user.lastName}</h3>
                                <p className="text-xs text-gray-500 mb-2">{app.user.university} • {app.academicRank}</p>
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
                                <a 
                                  href={app.cvUrl} 
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                >
                                  <Download size={16} />
                                  Voir CV
                                </a>
                                <a 
                                  href={app.diplomaUrl} 
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                >
                                  <Download size={16} />
                                  Voir Diplôme
                                </a>
                                <a 
                                  href={app.rankProofUrl} 
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                                >
                                  <Download size={16} />
                                  Preuve Grade
                                </a>
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
                                <img src={app.user.avatarUrl} alt="" className="w-12 h-12 rounded-full bg-gray-100 grayscale" />
                                <div>
                                  <h3 className="font-bold text-gray-900">{app.user.firstName} {app.user.lastName}</h3>
                                  <p className="text-xs text-gray-500 mb-2">{app.user.university} • {app.academicRank}</p>
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
            </div>
          </div>
        </div>
      )}

      {/* Add Ad Modal */}
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
                  onClick={() => {
                    const ad = {
                      id: `ad-${Date.now()}`,
                      ...newAd,
                      active: true,
                      createdAt: new Date().toISOString()
                    };
                    updateAds([ad, ...ads]);
                    setShowAddAdModal(false);
                    setNewAd({ title: '', imageUrl: '', linkUrl: '' });
                  }}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
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
            <h2 className="font-bold text-gray-900">Liste des Utilisateurs</h2>
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
                          <Ban size={18} />
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
    </div>
  );
}
