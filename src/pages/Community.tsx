import React, { useState, useRef } from 'react';
import { Users, MessageSquare, Share2, CreditCard, AlertCircle, Send, X, Plus, CheckCircle2 } from 'lucide-react';
import { MOCK_GROUPS, MOCK_POSTS } from '@/data/mock';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import MobileMoneyPayment from '@/components/shared/MobileMoneyPayment';

export default function Community() {
  const { user, payPostSubscription } = useAuth();
  const [showPayModal, setShowPayModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [groups, setGroups] = useState(MOCK_GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0].id);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>(['g1']);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', type: 'university' as const });
  const [showSuccessToast, setShowSuccessToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCreatePost = () => {
    if (!user) return;
    
    if (user.role !== 'admin' && user.postSubscriptionStatus !== 'active') {
      setShowPayModal(true);
      return;
    }
    
    if (!postContent.trim()) {
      alert('Veuillez entrer du contenu pour votre publication.');
      return;
    }

    if (!selectedGroupId) {
      alert('Veuillez sélectionner un groupe pour publier.');
      return;
    }

    const newPost = {
      id: `p-${Date.now()}`,
      groupId: selectedGroupId,
      authorId: user.id,
      author: user,
      content: postContent,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
    };

    setPosts([newPost, ...posts]);
    setPostContent('');
    showToast('Publication partagée avec succès !');
  };

  const handleJoinGroup = (groupId: string) => {
    if (joinedGroupIds.includes(groupId)) return;
    setJoinedGroupIds([...joinedGroupIds, groupId]);
    showToast('Vous avez rejoint le groupe !');
  };

  const handleLeaveGroup = (groupId: string) => {
    if (!joinedGroupIds.includes(groupId)) return;
    setJoinedGroupIds(joinedGroupIds.filter(id => id !== groupId));
    if (selectedGroupId === groupId) {
      const remaining = joinedGroupIds.filter(id => id !== groupId);
      setSelectedGroupId(remaining.length > 0 ? remaining[0] : '');
    }
    showToast('Vous avez quitté le groupe.');
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupData.name || !newGroupData.description) return;

    const newGroup = {
      id: `g-${Date.now()}`,
      name: newGroupData.name,
      description: newGroupData.description,
      type: newGroupData.type,
      membersCount: 1,
    };

    setGroups([...groups, newGroup]);
    setJoinedGroupIds([...joinedGroupIds, newGroup.id]);
    setSelectedGroupId(newGroup.id);
    setShowCreateModal(false);
    setNewGroupData({ name: '', description: '', type: 'university' });
    showToast('Groupe créé avec succès !');
  };

  const showToast = (message: string) => {
    setShowSuccessToast({ show: true, message });
    setTimeout(() => setShowSuccessToast({ show: false, message: '' }), 3000);
  };

  const handlePaymentSuccess = () => {
    payPostSubscription();
    setShowPayModal(false);
    showToast('Abonnement activé ! Vous pouvez maintenant publier.');
  };

  const scrollToCreate = () => {
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Success Toast */}
      {showSuccessToast.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
            <CheckCircle2 size={20} />
            <span className="font-medium">{showSuccessToast.message}</span>
          </div>
        </div>
      )}

      {/* Feed Section */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Fil d'actualité</h1>
          <button 
            onClick={scrollToCreate}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
          >
            <Plus size={18} />
            Nouvelle publication
          </button>
        </div>

        {/* Create Post Input */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex gap-4">
            <img src={user?.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-emerald-100 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Publier dans :</span>
                <select 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="text-xs font-bold text-emerald-700 bg-emerald-50 border-none rounded-lg px-2 py-1 focus:ring-0 outline-none cursor-pointer"
                >
                  {groups.filter(g => joinedGroupIds.includes(g.id)).map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                  {joinedGroupIds.length === 0 && <option value="">Rejoignez un groupe d'abord</option>}
                </select>
              </div>
              <textarea 
                ref={textareaRef}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Partagez quelque chose avec votre communauté..." 
                className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 focus:ring-0 text-sm resize-none h-24"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 italic">
              {user?.postSubscriptionStatus === 'active' ? 'Abonnement actif' : 'Abonnement requis pour publier'}
            </p>
            <button 
              onClick={handleCreatePost}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md"
            >
              <Send size={16} />
              Publier
            </button>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post) => {
            const group = groups.find(g => g.id === post.groupId);
            return (
              <div key={post.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-100 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={post.author.avatarUrl} alt={post.author.firstName} className="w-10 h-10 rounded-full bg-gray-100" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{post.author.firstName} {post.author.lastName}</h3>
                      <p className="text-xs text-gray-500">{post.author.major} • {post.createdAt.split('T')[0]}</p>
                    </div>
                  </div>
                  {group && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                      {group.name}
                    </span>
                  )}
                </div>
                
                <p className="text-gray-800 mb-4 leading-relaxed">
                  {post.content}
                </p>

                <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
                  <button className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 text-sm font-medium transition-colors group">
                    <span className="p-1.5 rounded-full bg-gray-50 group-hover:bg-emerald-50 transition-colors">👍</span>
                    {post.likes}
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 text-sm font-medium transition-colors group">
                    <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                    {post.comments}
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 text-sm font-medium transition-colors ml-auto group">
                    <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar: Groups */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Vos Groupes</h2>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Créer un groupe"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-3">
          {groups.map((group) => {
            const isJoined = joinedGroupIds.includes(group.id);
            return (
              <div key={group.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-colors",
                    isJoined ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                  )}>
                    <Users size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{group.name}</h3>
                    <p className="text-xs text-gray-500">{group.membersCount + (isJoined ? 1 : 0)} membres</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{group.description}</p>
                {isJoined ? (
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                      <CheckCircle2 size={14} />
                      Membre
                    </button>
                    <button 
                      onClick={() => handleLeaveGroup(group.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Quitter
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleJoinGroup(group.id)}
                    className="w-full py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Rejoindre
                  </button>
                )}
              </div>
            );
          })}
          
          <button 
            onClick={() => setShowJoinModal(true)}
            className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Découvrir d'autres groupes
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MobileMoneyPayment 
            amount={5000} 
            onSuccess={handlePaymentSuccess} 
            onCancel={() => setShowPayModal(false)}
            title="Abonnement Communauté CampusBF"
          />
        </div>
      )}

      {/* Join Group Modal (Discovery) */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Rejoindre un groupe</h2>
              <button onClick={() => setShowJoinModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Recherchez des groupes par filière ou par centre d'intérêt.</p>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ex: Droit, Médecine, Sport..." 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="pt-4">
                <button 
                  onClick={() => {
                    setShowJoinModal(false);
                    showToast('Recherche en cours...');
                  }}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
                >
                  Rechercher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Créer un nouveau groupe</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nom du groupe</label>
                <input 
                  type="text" 
                  required
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                  placeholder="Ex: Club de Lecture UJKZ" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Type de groupe</label>
                <select 
                  value={newGroupData.type}
                  onChange={(e) => setNewGroupData({ ...newGroupData, type: e.target.value as any })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                >
                  <option value="university">Université</option>
                  <option value="major">Filière</option>
                  <option value="class">Classe</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Description</label>
                <textarea 
                  required
                  value={newGroupData.description}
                  onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                  placeholder="Décrivez l'objectif de ce groupe..." 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-24 resize-none"
                />
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  Créer le groupe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
