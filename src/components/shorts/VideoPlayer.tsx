import React, { useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
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
  const playerRef = useRef<any>(null);
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

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
      videoService.incrementView(video.id);
    } else {
      setIsPlaying(false);
    }
  }, [isActive, video.id]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await videoService.likeVideo(video.id);
    setIsLiked(res);
    setLikesCount(prev => res ? prev + 1 : prev - 1);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.href,
      });
    }
  };

  const handleProgress = (state: any) => {
    setCurrentTime(state.playedSeconds);
  };

  const handleDuration = (dur: any) => {
    setDuration(dur);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (playerRef.current) {
      playerRef.current.seekTo(time);
    }
  };

  const handleSkip = (seconds: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
    }
  };

  return (
    <div ref={containerRef} className={`relative md:h-full w-full bg-black flex flex-col shadow-2xl overflow-hidden ${isFullscreen ? '' : 'w-full'}`}>
      {/* Container vidéo */}
      <div className="relative w-full max-h-[40vh] sm:max-h-[60vh] md:max-h-none flex-shrink-0 md:flex-1 bg-black overflow-hidden flex items-center justify-center" onClick={togglePlay}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* @ts-ignore */}
          {React.createElement(ReactPlayer as any, {
            ref: playerRef,
            url: video.videoUrl,
            width: "100%",
            height: "100%",
            playing: isPlaying,
            loop: true,
            muted: isMuted,
            playsinline: true,
            onProgress: handleProgress,
            onDuration: handleDuration,
            style: { pointerEvents: 'none' },
            config: {
              youtube: {
                playerVars: { controls: 0, rel: 0 }
              }
            }
          })}
        </div>

        {/* Action Buttons (Floating over video on the right like TikTok/Reels) - Hidden on mobile, shown on desktop */}
        <div className="hidden md:flex absolute right-3 bottom-6 flex-col items-center gap-5 z-20 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-1 group">
            <button 
              onClick={handleLike}
              className={`p-3 rounded-full transition-all active:scale-125 shadow-lg ${isLiked ? 'bg-red-500/90 text-white' : 'bg-black/40 text-white hover:bg-black/60 backdrop-blur-md'}`}
            >
              <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <span className="text-white text-[11px] font-bold drop-shadow-md">{likesCount}</span>
          </div>

          <div className="flex flex-col items-center gap-1 group">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-black/60 transition-all active:scale-125"
            >
              <MessageCircle size={24} />
            </button>
            <span className="text-white text-[11px] font-bold drop-shadow-md">{video.commentsCount}</span>
          </div>

          <div className="flex flex-col items-center gap-1 group">
            <button 
              onClick={handleShare}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full shadow-lg text-white hover:bg-black/60 transition-all active:scale-125"
            >
              <Share2 size={24} />
            </button>
            <span className="text-white text-[11px] font-bold drop-shadow-md">{video.sharesCount}</span>
          </div>
        </div>

        {/* Play/Pause center overlay animation when toggled */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div 
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <div className="p-6 bg-black/40 rounded-full text-white border border-white/20 backdrop-blur-sm shadow-xl">
                <Play size={48} fill="currentColor" className="ml-2" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Playback Controls & Timeline Overlay on top of video at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-white/80 text-[11px] font-mono w-9 text-right font-medium drop-shadow-md">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="any"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all relative overflow-hidden"
              style={{
                background: `linear-gradient(to right, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%)`
              }}
            />
            <span className="text-white/80 text-[11px] font-mono w-9 font-medium drop-shadow-md">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 text-white drop-shadow-md">
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="hover:text-blue-400 hover:scale-110 transition-all"
                title={isPlaying ? "Pause" : "Lecture"}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              
              <button onClick={(e) => handleSkip(-10, e)} className="hover:text-blue-400 hover:scale-110 transition-all" title="Reculer de 10s">
                <RotateCcw size={18} />
              </button>
              
              <button onClick={(e) => handleSkip(10, e)} className="hover:text-blue-400 hover:scale-110 transition-all" title="Avancer de 10s">
                <RotateCw size={18} />
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="hover:text-blue-400 hover:scale-110 transition-colors"
                title={isMuted ? "Activer le son" : "Désactiver le son"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
            
            <button 
              onClick={toggleFullscreen}
              className="text-white/90 hover:text-white hover:scale-110 transition-colors drop-shadow-md"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel and Video Info - Placed strictly below the video */}
      <div className="w-full flex-none bg-gray-950 z-20 flex flex-col relative pb-4 border-b-8 border-black md:border-b-0">
        {/* Video Details */}
        <div className="px-4 py-4 flex flex-col gap-3">
          
          {/* Title and Views */}
          <div className="flex flex-col gap-1">
            <h3 className="text-white font-bold text-base leading-tight">{video.title}</h3>
            <div className="flex items-center gap-2 text-white/50 text-[11px] font-medium">
              <span>{video.viewsCount || 0} vues</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true, locale: fr })}</span>
            </div>
          </div>

          {/* Author info (YouTube style) */}
          <div className="flex items-center gap-3 py-1">
            <img 
              src={video.userPhoto || `https://ui-avatars.com/api/?name=${video.username}`} 
              alt={video.username}
              className="w-10 h-10 rounded-full border border-white/10 shadow-sm"
            />
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center gap-1">
                <span className="text-white font-bold text-sm truncate">@{video.username}</span>
                {video.isVerifiedEducational && (
                  <CheckCircle size={14} className="text-blue-400 fill-white shrink-0" />
                )}
              </div>
              <span className="text-white/50 text-[10px] font-medium truncate">{video.university}</span>
            </div>
            <button className="px-5 py-1.5 bg-white text-black hover:bg-gray-200 rounded-full text-xs font-bold transition-all whitespace-nowrap">
              S'abonner
            </button>
            <button 
              onClick={() => videoService.reportVideo(video.id, 'Contenu inapproprié')}
              className="p-2 ml-1 text-white/50 hover:text-red-400 transition-colors"
              title="Signaler"
            >
              <Flag size={18} />
            </button>
          </div>

          {/* Mobile Action Buttons (Horizontal Row Like YouTube) */}
          <div className="flex md:hidden items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 ${isLiked ? 'text-red-400' : 'text-white'}`}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              <span className="text-xs font-bold">{likesCount}</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white"
            >
              <MessageCircle size={18} />
              <span className="text-xs font-bold">{video.commentsCount}</span>
            </button>

            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white"
            >
              <Share2 size={18} />
              <span className="text-xs font-bold">Partager</span>
            </button>
          </div>

          {/* Description & Hashtags Container */}
          <div className="flex flex-col bg-white/5 rounded-xl p-3 mt-1 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
            <div className={`text-white/80 text-xs leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
              {video.description || "Aucune description"}
            </div>
            {video.description && video.description.length > 80 && (
              <span className="text-white font-bold text-[11px] mt-1">
                {isExpanded ? 'Moins' : 'Plus'}
              </span>
            )}
            
            {/* Hashtags */}
            {video.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {video.hashtags.map((tag, i) => (
                  <span key={i} className="text-blue-400 hover:text-blue-300 text-[11px] font-medium transition-colors">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl h-[75%] z-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
                <span className="font-bold text-gray-900">{video.commentsCount} commentaires</span>
                <button 
                  onClick={() => setShowComments(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                  <MessageCircle size={48} className="mb-3 opacity-20" />
                  <p className="font-medium">Pas encore de commentaires...</p>
                  <p className="text-sm">Soyez le premier à réagir !</p>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex items-center gap-3">
                <div className="flex-1 bg-white rounded-full px-4 py-2.5 border shadow-sm flex items-center focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <input 
                    type="text" 
                    placeholder="Ajouter un commentaire..." 
                    className="flex-1 outline-none text-sm bg-transparent"
                  />
                  <button className="text-blue-600 font-bold text-sm ml-2 hover:text-blue-700 transition-colors">Publier</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
