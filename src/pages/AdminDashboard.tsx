import React, { useState } from 'react';
import { Users, FileText, AlertTriangle, Activity, Shield, GraduationCap, Check, X, Download, Search, MoreVertical, Ban, UserCheck, Briefcase, ShoppingBag, MessageSquare, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_USERS, MOCK_DOCUMENTS, MOCK_INTERNSHIPS, MOCK_MARKETPLACE, MOCK_COMMUNITY } from '@/data/mock';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { applications, reviewApplication } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content'>('overview');
  const [contentTab, setContentTab] = useState<'documents' | 'stages' | 'marketplace' | 'community'>('documents');
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState(MOCK_USERS);
  
  // Content states
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [internships, setInternships] = useState(MOCK_INTERNSHIPS);
  const [marketplace, setMarketplace] = useState(MOCK_MARKETPLACE);
  const [community, setCommunity] = useState(MOCK_COMMUNITY);

  const pendingApplications = applications.filter(app => app.status === 'pending');

  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const toggleUserRole = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, role: u.role === 'admin' ? 'student' : 'admin' };
      }
      return u;
    }));
  };

  const deleteUser = (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setUsers(prev => prev.filter(u => u.id !== userId));
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Utilisateurs', count: users.length.toString(), icon: Users, color: 'bg-blue-50 text-blue-700' },
              { label: 'Documents', count: '3,890', icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Signalements', count: '12', icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
              { label: 'Demandes Répétiteur', count: pendingApplications.length.toString(), icon: GraduationCap, color: 'bg-amber-50 text-amber-700' },
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

          <div className="grid lg:grid-cols-2 gap-8">
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
            <div className="p-6 border-b border-gray-50">
              <h2 className="font-bold text-gray-900 capitalize">Modération : {contentTab}</h2>
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
                          onClick={() => toggleUserRole(u.id)}
                          title={u.role === 'admin' ? "Rétrograder en étudiant" : "Promouvoir en admin"}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Shield size={18} />
                        </button>
                        <button 
                          onClick={() => deleteUser(u.id)}
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
