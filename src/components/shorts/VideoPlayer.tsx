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
  RotateCcw,
  RotateCw,
  Flag,
  Maximize,
  Minimize
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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likesCount, setLikesCount] = useState(video.likesCount);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSkip = (seconds: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div ref={containerRef} className={`relative h-full w-full bg-black flex flex-col shadow-2xl overflow-hidden ${isFullscreen ? '' : 'md:max-w-md md:mx-auto md:border-x md:border-white/10'}`}>
      {/* Container vidéo avec layout flex */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden min-h-0" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          className="h-full w-full object-contain"
          loop
          muted={isMuted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />

        {/* Overlay UI (juste un léger gradient top pour les actions du haut) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />

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

        {/* Action Buttons (Absolute right) */}
        <div className="absolute right-3 bottom-6 flex flex-col items-center gap-5 z-20 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-1 group">
            <button 
              onClick={handleLike}
              className={`p-3 rounded-full transition-all active:scale-125 shadow-lg ${isLiked ? 'bg-red-500 text-white' : 'bg-black/60 text-white hover:bg-black/80 backdrop-blur-md'}`}
            >
              <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <span className="text-white text-[11px] font-bold drop-shadow-md">{likesCount}</span>
          </div>

          <div className="flex flex-col items-center gap-1 group">
            <button 
              onClick={() => setShowComments(true)}
              className="p-3 bg-black/60 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-black/80 transition-all active:scale-125"
            >
              <MessageCircle size={24} />
            </button>
            <span className="text-white text-[11px] font-bold drop-shadow-md">{video.commentsCount}</span>
          </div>

          <div className="flex flex-col items-center gap-1 group">
            <button 
              onClick={handleShare}
              className="p-3 bg-black/60 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-black/80 transition-all active:scale-125"
            >
              <Share2 size={24} />
            </button>
            <span className="text-white text-[11px] font-bold drop-shadow-md">{video.sharesCount}</span>
          </div>

          <button className="p-3 bg-black/60 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-black/80 transition-all">
            <Bookmark size={24} />
          </button>

          <button 
            onClick={() => videoService.reportVideo(video.id, 'Contenu inapproprié')}
            className="p-3 bg-black/60 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-black/80 transition-all text-red-400"
          >
            <Flag size={18} />
          </button>
        </div>

        {/* Controls Overlay (Mute & Fullscreen) */}
        <div className="absolute top-4 right-4 z-20 flex gap-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 bg-black/50 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-black/70 transition-all"
            title={isMuted ? "Activer le son" : "Désactiver le son"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2.5 bg-black/50 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-black/70 transition-all"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
        
        {/* Rewind/Forward Gestures Overlay (Invisible click areas if preferred, but explicit buttons added below) */}
      </div>

      {/* Video Info - Placé EN DESSOUS de la vidéo */}
      <div className="w-full flex-none bg-gray-950 p-4 border-t border-white/5 z-20">
        
        {/* Custom Progress Bar */}
        <div className="flex flex-col gap-2 mb-3">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="any"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%)`
            }}
          />
          
          <div className="flex justify-between items-center px-1">
            <span className="text-white/60 text-[11px] font-mono font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex gap-4">
              <button onClick={(e) => handleSkip(-10, e)} className="text-white/60 hover:text-white transition-colors" title="Reculer 10s">
                <RotateCcw size={16} />
              </button>
              <button onClick={(e) => handleSkip(10, e)} className="text-white/60 hover:text-white transition-colors" title="Avancer 10s">
                <RotateCw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Author info */}
        <div className="flex items-center gap-3 mb-3">
          <img 
            src={video.userPhoto || `https://ui-avatars.com/api/?name=${video.username}`} 
            alt={video.username}
            className="w-10 h-10 rounded-full border border-white/20 shadow-md"
          />
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-sm">@{video.username}</span>
              {video.isVerifiedEducational && (
                <CheckCircle size={14} className="text-blue-400 fill-white" />
              )}
            </div>
            <span className="text-white/60 text-[10px] font-medium">{video.university}</span>
          </div>
          <button className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all border border-white/10 shadow-sm">
            Suivre
          </button>
        </div>

        {/* Video Description */}
        <div className="pr-2">
          <h3 className="text-white font-bold text-sm mb-1">{video.title}</h3>
          
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer mb-2"
          >
            <p className={`text-white/80 text-xs leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
              {video.description}
            </p>
            {video.description && video.description.length > 80 && (
              <span className="text-blue-400 hover:text-blue-300 text-[11px] font-bold mt-1 inline-block">
                {isExpanded ? 'voir moins' : 'voir plus'}
              </span>
            )}
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {video.hashtags.map((tag, i) => (
              <span key={i} className="text-blue-300/80 hover:text-blue-400 text-[11px] font-bold cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>


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
