import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Home, 
  Compass, 
  TrendingUp, 
  Sparkles,
  Trophy,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { VideoPlayer } from '@/components/shorts/VideoPlayer';
import { ShortsUpload } from '@/components/shorts/ShortsUpload';
import { videoService } from '@/services/videoService';
import { CommunityVideo } from '@/types';
import { auth } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

const CATEGORIES = [
  "Tous",
  "Cours", 
  "Astuces Examens", 
  "Vie Étudiante", 
  "Orientation", 
  "Opportunités", 
  "Humour Campus", 
  "Motivation"
];

export default function CampusShorts() {
  const [videos, setVideos] = useState<CommunityVideo[]>([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVideos();
  }, [selectedCategory]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveVideoIndex(index);
            }
          }
        });
      },
      {
        root: feedRef.current,
        threshold: 0.6, // Active when at least 60% visible
      }
    );

    const elements = document.querySelectorAll('.video-container');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [videos]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const data = await videoService.getVideos(
        selectedCategory === "Tous" ? undefined : selectedCategory
      );
      setVideos(data);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des vidéos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-black flex flex-col md:flex-row relative overflow-hidden">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:flex w-64 border-r border-white/10 bg-black flex-col p-6 gap-8 z-10">
        <h1 className="text-2xl font-black text-white italic tracking-tighter">
          CAMPUS<span className="text-blue-600">SHORTS</span>
        </h1>

        <nav className="space-y-2">
          <MenuButton icon={Home} label="Pour vous" active />
          <MenuButton icon={Compass} label="Explorer" />
          <MenuButton icon={TrendingUp} label="Populaires" />
        </nav>

        <div>
          <h3 className="text-[10px] font-black text-white/40 uppercase mb-4 tracking-widest pl-3">Catégories</h3>
          <div className="space-y-1">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-amber-400" size={16} />
              <span className="text-white text-xs font-black uppercase">Points Shorts</span>
            </div>
            <p className="text-white/60 text-[10px] leading-tight">Publiez des vidéos et gagnez des points pour devenir le top contributeur !</p>
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 flex flex-col relative">
        {/* Mobile Header */}
        <div className="md:hidden absolute top-0 left-0 right-0 p-4 z-30 flex items-center justify-between pointer-events-none">
          <h1 className="text-xl font-black text-white italic tracking-tighter drop-shadow-lg pointer-events-auto">
            CAMPUS<span className="text-blue-600">SHORTS</span>
          </h1>
          <div className="flex gap-3 pointer-events-auto">
            <button className="p-2 bg-black/40 rounded-full text-white backdrop-blur-md border border-white/20">
              <Search size={20} />
            </button>
            <button 
              onClick={() => setShowUpload(true)}
              className="p-2 bg-blue-600 rounded-full text-white shadow-lg shadow-blue-600/20"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Video Scroller */}
        <div 
          ref={feedRef}
          className="flex-1 overflow-y-auto md:snap-y md:snap-mandatory scrollbar-none scroll-smooth bg-gray-100 md:bg-black"
        >
          {loading && videos.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
          ) : videos.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-10 bg-black">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <AlertCircle className="text-white/20" size={40} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Pas encore de vidéos</h2>
              <p className="text-white/60 mb-8 max-w-xs">Soyez le premier à partager un moment avec la communauté !</p>
              <button 
                onClick={() => setShowUpload(true)}
                className="px-8 py-3 bg-blue-600 text-white rounded-full font-black shadow-xl shadow-blue-600/20"
              >
                Publier ma première vidéo
              </button>
            </div>
          ) : (
            <div className="md:h-full flex flex-col md:block">
              {videos.map((video, index) => {
                if (!video || !video.id) return null;
                return (
                <div 
                  key={video.id} 
                  data-index={index}
                  className="video-container w-full md:h-full md:snap-start md:snap-always mb-2 md:mb-0 bg-black"
                >
                  <VideoPlayer 
                    video={video} 
                    isActive={activeVideoIndex === index} 
                  />
                </div>
              )})}
            </div>
          )}
        </div>

        {/* Desktop Upload Button */}
        <button 
          onClick={() => setShowUpload(true)}
          className="hidden md:flex absolute bottom-8 right-8 p-5 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 border-4 border-black group transition-all hover:scale-110 active:scale-95 z-30"
        >
          <Plus size={32} />
          <span className="absolute right-full mr-4 bg-blue-600 px-4 py-2 rounded-xl text-sm font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Publier une vidéo
          </span>
        </button>
      </div>

      {/* Fixed Modals */}
      <AnimatePresence>
        {showUpload && (
          <ShortsUpload 
            onClose={() => setShowUpload(false)} 
            onSuccess={fetchVideos}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
      active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`}>
      <Icon size={24} className={active ? 'text-blue-600' : ''} />
      <span className="font-bold">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_10px_#2563eb]" />}
    </button>
  );
}
