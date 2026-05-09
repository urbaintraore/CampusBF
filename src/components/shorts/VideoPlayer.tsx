import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreVertical, 
  CheckCircle,
  Eye,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Flag
} from 'lucide-react';
import { CommunityVideo, VideoComment } from '@/types';
import { auth } from '@/lib/firebase';
import { videoService } from '@/services/videoService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VideoPlayerProps {
  video: CommunityVideo;
  isActive: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likesCount, setLikesCount] = useState(video.likesCount);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
      videoService.incrementView(video.id);
    } else if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = async () => {
    const res = await videoService.likeVideo(video.id);
    setIsLiked(res);
    setLikesCount(prev => res ? prev + 1 : prev - 1);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.href,
      });
    }
  };

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        className="h-full w-full object-cover lg:object-contain"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Action Buttons */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={handleLike}
            className={`p-3 rounded-full transition-all active:scale-125 ${isLiked ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-black/60'}`}
          >
            <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-lg">{likesCount}</span>
        </div>

        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={() => setShowComments(true)}
            className="p-3 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all active:scale-125"
          >
            <MessageCircle size={28} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-lg">{video.commentsCount}</span>
        </div>

        <div className="flex flex-col items-center gap-1 group">
          <button 
            onClick={handleShare}
            className="p-3 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all active:scale-125"
          >
            <Share2 size={28} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-lg">{video.sharesCount}</span>
        </div>

        <button className="p-3 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all">
          <Bookmark size={28} />
        </button>

        <button 
          onClick={() => videoService.reportVideo(video.id, 'Contenu inapproprié')}
          className="p-3 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all text-red-400"
        >
          <Flag size={20} />
        </button>
      </div>

      {/* Video Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-12 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none">
        <div className="flex items-center gap-3 mb-3 pointer-events-auto">
          <img 
            src={video.userPhoto || `https://ui-avatars.com/api/?name=${video.username}`} 
            alt={video.username}
            className="w-10 h-10 rounded-full border-2 border-white shadow-lg"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-sm shadow-black drop-shadow-md">@{video.username}</span>
              {video.isVerifiedEducational && (
                <CheckCircle size={14} className="text-blue-400 fill-white" />
              )}
            </div>
            <span className="text-white/80 text-[10px] font-medium">{video.university}</span>
          </div>
          <button className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-full text-[10px] font-bold transition-all border border-white/20">
            Suivre
          </button>
        </div>

        <div className="pointer-events-auto">
          <h3 className="text-white font-bold text-base mb-1 drop-shadow-lg">{video.title}</h3>
          <p className="text-white/90 text-sm line-clamp-2 mb-2 drop-shadow-md">{video.description}</p>
          <div className="flex flex-wrap gap-2">
            {video.hashtags.map((tag, i) => (
              <span key={i} className="text-blue-300 text-xs font-bold hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-all"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* Play/Pause indicator center */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <div className="p-6 bg-black/40 rounded-full text-white border border-white/20 backdrop-blur-sm">
              <Play size={48} fill="currentColor" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Drawer (Simulated) */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl h-[70%] z-50 flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
                <span className="font-bold text-gray-900">{video.commentsCount} commentaires</span>
                <button 
                  onClick={() => setShowComments(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Comments list would go here */}
                <div className="text-center py-10 text-gray-400">
                  <MessageCircle size={40} className="mx-auto mb-2 opacity-20" />
                  <p>Pas encore de commentaires...</p>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex items-center gap-3">
                <div className="flex-1 bg-white rounded-full px-4 py-2 border flex items-center">
                  <input 
                    type="text" 
                    placeholder="Ajouter un commentaire..." 
                    className="flex-1 outline-none text-sm"
                  />
                  <button className="text-blue-600 font-bold text-sm ml-2">Publier</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
