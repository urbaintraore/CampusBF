import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { communityVideoService } from '@/services/communityVideoService';
import { CommunityVideo } from '@/types';
import { CommunityVideoUploader, VIDEO_CATEGORIES } from '@/components/CommunityVideoUploader';
import { CommunityVideoPlayer } from '@/components/CommunityVideoPlayer';
import { Share2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommunityVideos() {
  const [searchParams] = useSearchParams();
  const videoIdParam = searchParams.get('v');
  const [videos, setVideos] = useState<CommunityVideo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | 'Tous'>('Tous');
  const [activeVideo, setActiveVideo] = useState<CommunityVideo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  useEffect(() => {
    loadVideos();
  }, [selectedCategory]);

  const loadVideos = async () => {
    const data = await communityVideoService.getCommunityVideos(selectedCategory);
    setVideos(data);
    
    // If we have a video ID in the URL, try to find and set it
    if (videoIdParam && data.find(v => v.id === videoIdParam)) {
      setActiveVideo(data.find(v => v.id === videoIdParam) || null);
    } else if (!activeVideo || data.findIndex(v => v.id === activeVideo.id) === -1) {
       setActiveVideo(data[0] || null);
    }
  };

  const handleQuickShare = async (e: React.MouseEvent, video: CommunityVideo) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/videos-communautaires?v=${video.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Regarde cette vidéo : ${video.title}`,
          url: shareUrl
        });
        return;
      } catch (err) {
        // Fallback to copy if native share fails or is cancelled
      }
    }
    
    // Fallback to copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(video.id);
      toast.success('Lien de la vidéo copié !');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Impossible de copier le lien');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Vidéos Académiques</h1>
      <CommunityVideoUploader onSuccess={loadVideos} />
      
      <div className="flex gap-2 mt-8 mb-6 overflow-x-auto pb-2 scrollbar-none">
        <button onClick={() => setSelectedCategory('Tous')} className={`px-4 py-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors ${selectedCategory === 'Tous' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'}`}>Tous</button>
        {VIDEO_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50'}`}>{cat}</button>
        ))}
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-6">
        {/* Liste des autres vidéos à gauche */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 max-h-[800px] overflow-y-auto pr-2">
           {videos.map(video => (
             <button 
               key={video.id} 
               onClick={() => setActiveVideo(video)}
               className={`flex gap-3 p-3 rounded-xl border text-left transition-all relative group ${activeVideo?.id === video.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
             >
               <div className="w-32 h-20 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 relative pointer-events-none flex items-center justify-center">
                  {/* Miniature */}
                  {(() => {
                    const ytMatch = video.videoUrl.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                    const vimeoMatch = video.videoUrl.match(/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i);
                    let thumb = video.thumbnail;
                    if (!thumb && ytMatch && ytMatch[2].length === 11) {
                      thumb = `https://img.youtube.com/vi/${ytMatch[2]}/hqdefault.jpg`;
                    } else if (!thumb && vimeoMatch && vimeoMatch[1]) {
                      thumb = '';
                    }

                    return thumb ? (
                      <img 
                        src={thumb} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-xs text-slate-400 font-medium tracking-wide">VIDEO</div>
                    );
                  })()}
               </div>
               <div className="flex flex-col flex-1 overflow-hidden pr-6">
                 <h4 className="font-bold text-sm text-slate-900 line-clamp-2">{video.title}</h4>
                 <p className="text-xs text-slate-500 mt-1 line-clamp-1">{video.username}</p>
                 <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full self-start mt-1">
                   {video.category}
                 </span>
               </div>
               
               {/* Quick Share Button */}
               <div 
                 onClick={(e) => handleQuickShare(e, video)}
                 className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                 title="Partager"
               >
                 {copiedId === video.id ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
               </div>
             </button>
           ))}
           {videos.length === 0 && (
             <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
               Aucune vidéo dans cette catégorie.
             </div>
           )}
        </div>

        {/* Vidéo en cours à droite/centre (en bas des catégories) */}
        <div className="w-full lg:w-2/3">
           {activeVideo ? (
             <CommunityVideoPlayer video={activeVideo} />
           ) : (
             <div className="w-full aspect-video bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-400 font-medium">Sélectionnez une vidéo pour commencer la lecture</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
