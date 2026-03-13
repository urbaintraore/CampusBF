import React, { useState, useRef, useEffect } from 'react';
import { Users, MessageSquare, Share2, AlertCircle, Send, X, Plus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Post, Comment, Group, CampusEvent } from '@/types';

export default function Community() {
  const { user, groups, users } = useAuth();
  const [postContent, setPostContent] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState<string | null>(null);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', type: 'university' as const });
  const [showSuccessToast, setShowSuccessToast] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const joinedGroupIds = user ? groups.filter(g => g.members.includes(user.id)).map(g => g.id) : [];

  useEffect(() => {
    if (joinedGroupIds.length > 0 && !selectedGroupId) {
      setSelectedGroupId(joinedGroupIds[0]);
    }
  }, [joinedGroupIds, selectedGroupId]);

  useEffect(() => {
    let q;
    if (viewingGroupId) {
      q = query(
        collection(db, 'posts'),
        where('groupId', '==', viewingGroupId),
        orderBy('createdAt', 'desc')
      );
    } else if (joinedGroupIds.length > 0) {
      // Firestore 'in' query limit is 10. For simplicity, we'll just fetch all if many or limit to first 10
      q = query(
        collection(db, 'posts'),
        where('groupId', 'in', joinedGroupIds.slice(0, 10)),
        orderBy('createdAt', 'desc')
      );
    } else {
      setPosts([]);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));

    return () => unsubscribe();
  }, [viewingGroupId, joinedGroupIds.join(',')]);

  const handleCreatePost = async () => {
    if (!user) return;
    
    if (!postContent.trim()) {
      alert('Veuillez entrer du contenu pour votre publication.');
      return;
    }

    if (!selectedGroupId) {
      alert('Veuillez sélectionner un groupe pour publier.');
      return;
    }

    try {
      await addDoc(collection(db, 'posts'), {
        groupId: selectedGroupId,
        authorId: user.id,
        content: postContent,
        likes: 0,
        likedBy: [],
        createdAt: new Date().toISOString(), // Using ISO string for consistency with other parts
      });

      setPostContent('');
      showToast('Publication partagée avec succès !');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleGroupClick = (groupId: string) => {
    setViewingGroupId(groupId);
    if (joinedGroupIds.includes(groupId)) {
      setSelectedGroupId(groupId);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.likedBy?.includes(user.id);

    try {
      await updateDoc(doc(db, 'posts', postId), {
        likes: isLiked ? post.likes - 1 : post.likes + 1,
        likedBy: isLiked ? arrayRemove(user.id) : arrayUnion(user.id)
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
    } else {
      setActiveCommentPostId(postId);
      setCommentContent('');
    }
  };

  const handleReplyToComment = (post: any, comment: any) => {
    const author = users.find(u => u.id === comment.authorId);
    if (!author) return;

    setActiveCommentPostId(post.id);
    setCommentContent(`@${author.firstName} ${author.lastName} `);
    
    setTimeout(() => {
        const input = document.getElementById(`comment-input-${post.id}`);
        if (input) {
            (input as HTMLInputElement).focus();
        }
    }, 100);
  };

  const handleSubmitComment = async (postId: string) => {
    if (!user || !commentContent.trim()) return;

    try {
      await addDoc(collection(db, 'comments'), {
        postId,
        authorId: user.id,
        content: commentContent,
        createdAt: new Date().toISOString(),
      });

      setCommentContent('');
      setActiveCommentPostId(null);
      showToast('Commentaire ajouté !');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(user.id)
      });
      showToast('Vous avez rejoint le groupe !');
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(user.id)
      });
      showToast('Vous avez quitté le groupe.');
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupData.name || !newGroupData.description) return;

    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupData.name,
        description: newGroupData.description,
        category: newGroupData.type,
        members: [user.id],
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      });

      setShowCreateModal(false);
      setNewGroupData({ name: '', description: '', type: 'university' });
      showToast('Groupe créé avec succès !');
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const showToast = (message: string) => {
    setShowSuccessToast({ show: true, message });
    setTimeout(() => setShowSuccessToast({ show: false, message: '' }), 3000);
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
          <div className="flex items-center justify-end pt-2 border-t border-gray-50">
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
          {posts.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-gray-100 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune publication</h3>
              <p className="text-gray-500">
                {viewingGroupId 
                  ? "Ce groupe n'a pas encore de publication." 
                  : "Rejoignez des groupes pour voir les publications ici !"}
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const group = groups.find(g => g.id === post.groupId);
              const author = users.find(u => u.id === post.authorId);
              const isLiked = user && post.likedBy?.includes(user.id);
              const showComments = activeCommentPostId === post.id;

              if (!author) return null;

              return (
                <div key={post.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-100 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={author.avatarUrl} alt={author.firstName} className="w-10 h-10 rounded-full bg-gray-100" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{author.firstName} {author.lastName}</h3>
                      <p className="text-xs text-gray-500">{author.major} • {new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {group && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                      {group.name}
                    </span>
                  )}
                </div>
                
                <p className="text-gray-800 mb-4 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors group",
                      isLiked ? "text-emerald-600" : "text-gray-500 hover:text-emerald-600"
                    )}
                  >
                    <span className={cn(
                      "p-1.5 rounded-full transition-colors",
                      isLiked ? "bg-emerald-50" : "bg-gray-50 group-hover:bg-emerald-50"
                    )}>👍</span>
                    {post.likes}
                  </button>
                  <button 
                    onClick={() => handleComment(post.id)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors group",
                      showComments ? "text-emerald-600" : "text-gray-500 hover:text-emerald-600"
                    )}
                  >
                    <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                    {/* We need to fetch comments for each post or have them in the post document */}
                    {/* For now, let's assume we fetch them separately or they are in subcollection */}
                    <PostComments postId={post.id} showComments={showComments} onReply={(comment) => handleReplyToComment(post, comment)} />
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 text-sm font-medium transition-colors ml-auto group">
                    <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                {showComments && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <div className="flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                      <img src={user?.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-emerald-100 flex-shrink-0" />
                      <div className="flex-1 flex gap-2">
                        <input 
                          id={`comment-input-${post.id}`}
                          type="text" 
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder="Écrivez un commentaire..." 
                          className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitComment(post.id);
                            }
                          }}
                        />
                        <button 
                          onClick={() => handleSubmitComment(post.id)}
                          disabled={!commentContent.trim()}
                          className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              );
            })
          )}
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
          <button 
            onClick={() => setViewingGroupId(null)}
            className={cn(
              "w-full p-4 rounded-xl border shadow-sm text-left transition-all flex items-center gap-3",
              viewingGroupId === null 
                ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500/20" 
                : "bg-white border-gray-100 hover:border-emerald-100 hover:shadow-md"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-colors",
              viewingGroupId === null ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
            )}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className={cn("font-bold text-sm", viewingGroupId === null ? "text-emerald-900" : "text-gray-900")}>Fil d'actualité</h3>
              <p className="text-xs text-gray-500">Toutes les publications</p>
            </div>
          </button>

          {groups.map((group) => {
            const isJoined = joinedGroupIds.includes(group.id);
            const isViewing = viewingGroupId === group.id;
            
            return (
              <div 
                key={group.id} 
                className={cn(
                  "bg-white p-4 rounded-xl border shadow-sm transition-all relative group-card",
                  isViewing ? "border-emerald-200 ring-1 ring-emerald-500/20 bg-emerald-50/30" : "border-gray-100 hover:shadow-md"
                )}
              >
                <div 
                  className="flex items-center gap-3 mb-2 cursor-pointer"
                  onClick={() => handleGroupClick(group.id)}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-colors",
                    isJoined ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                  )}>
                    <Users size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("font-bold text-sm truncate", isViewing ? "text-emerald-900" : "text-gray-900")}>{group.name}</h3>
                    <p className="text-xs text-gray-500">{group.members?.length || 0} membres</p>
                  </div>
                </div>
                <p 
                  className="text-xs text-gray-500 line-clamp-2 mb-3 cursor-pointer"
                  onClick={() => handleGroupClick(group.id)}
                >
                  {group.description}
                </p>
                {isJoined ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMembersModal(group.id);
                      }}
                      className="flex-1 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Users size={14} />
                      Membres
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveGroup(group.id);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Quitter
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinGroup(group.id);
                    }}
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
      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Membres du groupe
              </h2>
              <button onClick={() => setShowMembersModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
              {users.filter(u => {
                const group = groups.find(g => g.id === showMembersModal);
                return group?.members.includes(u.id);
              }).map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                  <img src={member.avatarUrl} alt={member.firstName} className="w-10 h-10 rounded-full bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 truncate">{member.firstName} {member.lastName}</h3>
                    <p className="text-xs text-gray-500 truncate">{member.major} • {member.level}</p>
                  </div>
                  {member.role === 'admin' && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostComments({ postId, showComments, onReply }: { postId: string, showComments: boolean, onReply: (comment: Comment) => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const { users } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [postId]);

  if (!showComments && (!comments || comments.length === 0)) return <span>0</span>;
  if (!showComments) return <span>{comments?.length || 0}</span>;

  return (
    <>
      <span>{comments?.length || 0}</span>
      <div className="mt-4 pt-4 border-t border-gray-50 space-y-4 w-full text-left">
        {comments?.map((comment) => {
          const author = users.find(u => u.id === comment.authorId);
          if (!author) return null;

          return (
            <div key={comment.id} className="flex gap-3">
              <img src={author.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="bg-gray-50 rounded-2xl rounded-tl-none p-3 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900">{author.firstName} {author.lastName}</span>
                  <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
                <button 
                  onClick={() => onReply(comment)}
                  className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 mt-1"
                >
                  Répondre
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
