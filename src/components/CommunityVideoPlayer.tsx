import React, { useState, useMemo } from 'react';
import { MessageCircle, Share2, ThumbsUp, AlertCircle, Loader2 } from 'lucide-react';
import { CommunityVideo } from '@/types';

export const CommunityVideoPlayer = ({ video }: { video: CommunityVideo }) => {
  const [liked, setLiked] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Détection intelligente du type de lecteur
  const playerInfo = useMemo(() => {
    const url = video?.videoUrl || '';
    
    // YouTube
    const ytRegExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
      return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=0&rel=0&modestbranding=1` };
    }

    // Vimeo
    const vimeoRegExp = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
    const vimeoMatch = url.match(vimeoRegExp);
    if (vimeoMatch && vimeoMatch[1]) {
      return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=0` };
    }

    // Direct MP4 / WebM
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return { type: 'native', src: url };
    }

    // Default fallback (try as iframe)
    return { type: 'unknown', src: url };
  }, [video?.videoUrl]);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 flex flex-col h-full">
      <div className="aspect-video w-full bg-slate-900 relative flex items-center justify-center">
        {hasError ? (
          <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <AlertCircle size={48} className="mb-2 opacity-50" />
            <p className="font-medium text-white">Vidéo indisponible</p>
            <p className="text-sm mt-1">Le lien fourni n'est pas ou plus valide.</p>
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
              >
                Votre navigateur ne supporte pas la balise vidéo.
              </video>
            ) : (
              <iframe
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                src={playerInfo.src}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setIsLoading(false)}
                onError={() => setHasError(true)}
              />
            )}
          </>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-slate-900 line-clamp-2" title={video?.title || "Vidéo sans titre"}>{video?.title || "Vidéo sans titre"}</h3>
        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{video?.description}</p>
        
        <div className="mt-auto pt-4 flex gap-4 text-slate-500">
            <button onClick={() => setLiked(!liked)} className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-blue-600': 'hover:text-slate-800'}`}>
                <ThumbsUp size={18} className={liked ? "fill-current" : ""} /> 
                <span className="text-sm font-medium">{video?.likesCount + (liked ? 1 : 0)}</span>
            </button>
            <button className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                <MessageCircle size={18} /> 
                <span className="text-sm font-medium">{video?.commentsCount}</span>
            </button>
            <button className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
                <Share2 size={18} /> 
                <span className="text-sm font-medium">Partager</span>
            </button>
        </div>
      </div>
    </div>
  );
};

