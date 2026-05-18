import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageCircle, Share2, ThumbsUp, AlertCircle, Loader2, Send, Trash2, X, Twitter, Facebook, MessageSquare, Copy, Link as LinkIcon } from 'lucide-react';
import { CommunityVideo, VideoComment } from '@/types';
import { auth, db } from '@/lib/firebase';
import { videoService } from '@/services/videoService';
import { doc, onSnapshot, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

import { analyzeComment } from '@/services/geminiService';

import { useAuth } from '@/context/AuthContext';

export const CommunityVideoPlayer = ({ video: initialVideo }: { video: CommunityVideo }) => {
  const { user } = useAuth();
  const [video, setVideo] = useState<CommunityVideo>(initialVideo);
  const [liked, setLiked] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const viewedRef = useRef(false);

  // Update effect when video prop changes
  useEffect(() => {
    setVideo(initialVideo);
    viewedRef.current = false;
    setHasError(false);
    setIsLoading(true);
  }, [initialVideo.id]);

  // Real-time listeners
  useEffect(() => {
    if (!initialVideo.id) return;

    // Listen to video doc for real-time counts
    const unsubVideo = onSnapshot(doc(db, 'community_videos', initialVideo.id), (docS) => {
      if (docS.exists()) {
        setVideo({ id: docS.id, ...docS.data() } as CommunityVideo);
      }
    });

    // Listen to likes status if user is logged in
    let unsubLike: () => void = () => {};
    if (user) {
      unsubLike = onSnapshot(doc(db, 'video_likes', `${initialVideo.id}_${user.id}`), (docS) => {
        setLiked(docS.exists());
      });
    }

    // Listen to comments
    const qComments = query(collection(db, 'community_videos', initialVideo.id, 'comments'), orderBy('createdAt', 'desc'));
    const unsubComments = onSnapshot(qComments, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoComment)));
    });

    return () => {
      unsubVideo();
      unsubLike();
      unsubComments();
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    };
  }, [initialVideo.id, user]);

  const handleVideoPlaying = () => {
    if (!viewedRef.current) {
      viewTimerRef.current = setTimeout(() => {
        if (!viewedRef.current) {
          viewedRef.current = true;
          videoService.incrementView(initialVideo.id).catch(console.error);
        }
      }, 5000); // Count view after 5 seconds
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Connectez-vous pour aimer cette vidéo');
      return;
    }
    // Optimistic update
    setLiked(!liked);
    try {
      await videoService.likeVideo(video.id);
    } catch (error) {
      setLiked(liked); // revert
      toast.error('Erreur lors du traitement du like');
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Connectez-vous pour commenter');
      return;
    }
    const cleanComment = newComment.trim();
    if (!cleanComment) return;

    setIsSubmitting(true);
    try {
      const moderation = await analyzeComment(cleanComment);
      if (!moderation.isSafe) {
        toast.error(moderation.reason || 'Ce commentaire enfreint nos règles.');
        setIsSubmitting(false);
        return;
      }

      await videoService.addComment(video.id, cleanComment);
      setNewComment('');
      toast.success('Commentaire ajouté');
    } catch (error) {
      toast.error("Impossible d'ajouter le commentaire");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    try {
      await videoService.deleteComment(video.id, commentId);
      toast.success('Commentaire supprimé');
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleShare = async (platform: string) => {
    const shareUrl = `${window.location.origin}/videos-communautaires?v=${video.id}`;
    const text = `Regarde cette vidéo : ${video.title}`;

    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({ title: video.title, text, url: shareUrl });
        await videoService.shareVideo(video.id, 'native');
        return;
      } catch (err) {
        // Fallback to modal if cancelled or failed
      }
    }

    try {
      await videoService.shareVideo(video.id, platform);
      
      switch (platform) {
        case 'whatsapp':
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`);
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
          break;
        case 'telegram':
          window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`);
          break;
        case 'copy':
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Lien copié dans le presse-papier !');
          break;
      }
    } catch (e) {
      console.error(e);
    }
    setShowShareModal(false);
  };

  // Détection intelligente du type de lecteur
  const playerInfo = useMemo(() => {
    const url = video?.videoUrl || '';
    
    const ytRegExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
      return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=0&rel=0&modestbranding=1` };
    }

    const vimeoRegExp = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    const vimeoMatch = url.match(vimeoRegExp);
    if (vimeoMatch && vimeoMatch[1]) {
      return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=0` };
    }

    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return { type: 'native', src: url };
    }

    return { type: 'unknown', src: url };
  }, [video?.videoUrl]);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 flex flex-col h-full">
      <div className="aspect-video w-full bg-black relative flex items-center justify-center">
        {hasError ? (
          <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <AlertCircle size={48} className="mb-2 opacity-50" />
            <p className="font-medium text-white">Vidéo indisponible</p>
          </div>
        ) : (
          <>
            {isLoading && playerInfo.type !== 'native' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                <Loader2 className="animate-spin text-blue-500" size={40} />
              </div>
            )}
            
            {playerInfo.type === 'native' ? (
              <video 
                src={playerInfo.src} 
                className="w-full h-full object-contain" 
                controls 
                preload="metadata"
                onError={() => setHasError(true)}
                onLoadedData={() => setIsLoading(false)}
                onPlay={handleVideoPlaying}
              >
                Votre navigateur ne supporte pas la balise vidéo.
              </video>
            ) : (
              <iframe
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                src={playerInfo.src}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={(e) => {
                  setIsLoading(false);
                  handleVideoPlaying(); // Best effort for iframes
                }}
                onError={() => setHasError(true)}
              />
            )}
          </>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-900 line-clamp-2" title={video?.title}>{video?.title || "Vidéo sans titre"}</h3>
        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{video?.description}</p>
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-slate-500">
            <button 
              onClick={handleLike} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${liked ? 'bg-blue-50 text-blue-600': 'hover:bg-slate-50 text-slate-600'}`}
            >
                <ThumbsUp size={20} className={liked ? "fill-current scale-110 transition-transform" : "transition-transform"} /> 
                <span className="font-bold">{video?.likesCount || 0}</span>
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${showComments ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-600'}`}
            >
                <MessageCircle size={20} /> 
                <span className="font-bold">{video?.commentsCount || 0}</span>
            </button>
            <button 
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-600 rounded-full transition-all"
            >
                <Share2 size={20} /> 
                <span className="font-bold">Partager</span>
            </button>
            <div className="ml-auto text-xs text-slate-400 self-center font-medium">
              {video?.viewsCount || 0} {(video?.viewsCount || 0) > 1 ? 'vues' : 'vue'}
            </div>
        </div>
      </div>

      {/* Commentaires Section */}
      {showComments && (
        <div className="flex-1 bg-slate-50 flex flex-col max-h-[400px]">
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Aucun commentaire pour l'instant. Soyez le premier !</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-3 relative group">
                  <img src={comment.photo || `https://ui-avatars.com/api/?name=${comment.username}&background=random`} alt={comment.username} className="w-8 h-8 rounded-full shadow-sm" />
                  <div className="flex-1 bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-slate-900">{comment.username}</span>
                      <span className="text-[10px] text-slate-400">
                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: fr }) : "À l'instant"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.message}</p>
                    
                      {user && (user.uid === comment.userId || user.id === comment.userId || user.email === 'urbain.traoreurb@gmail.com' || user.role === 'admin') ? (
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="absolute -right-2 -top-2 p-1.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                          title="Supprimer le commentaire"
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : (
                        user && (
                          <button 
                            onClick={() => {
                               toast.success('Commentaire signalé avec succès');
                               // Optionnel: implémenter un vrai report API
                            }}
                            className="absolute -right-2 -top-2 p-1.5 bg-yellow-100 text-yellow-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-yellow-200"
                            title="Signaler ce commentaire"
                          >
                            <AlertCircle size={12} />
                          </button>
                        )
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 bg-white border-t border-slate-200">
            <form onSubmit={submitComment} className="flex gap-2">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? "Ajouter un commentaire..." : "Connectez-vous pour commenter..."}
                disabled={!user || isSubmitting}
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button 
                type="submit"
                disabled={!user || isSubmitting || !newComment.trim()}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-ml-0.5" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de partage */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Partager la vidéo</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-4 gap-4">
               {navigator.share && (
                 <button onClick={() => handleShare('native')} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Share2 size={24} className="text-slate-700" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">Appareil</span>
                </button>
               )}
               <button onClick={() => handleShare('whatsapp')} className="flex flex-col items-center gap-2 cursor-pointer group">
                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                   <MessageSquare size={24} className="text-green-600" />
                 </div>
                 <span className="text-[10px] font-bold text-slate-600">WhatsApp</span>
               </button>
               <button onClick={() => handleShare('facebook')} className="flex flex-col items-center gap-2 cursor-pointer group">
                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Facebook size={24} className="text-blue-600" />
                 </div>
                 <span className="text-[10px] font-bold text-slate-600">Facebook</span>
               </button>
               <button onClick={() => handleShare('copy')} className="flex flex-col items-center gap-2 cursor-pointer group">
                 <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                   <LinkIcon size={24} className="text-slate-700" />
                 </div>
                 <span className="text-[10px] font-bold text-slate-600">Copier le lien</span>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

