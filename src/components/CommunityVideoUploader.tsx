import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { communityVideoService } from '@/services/communityVideoService';
import { auth } from '@/lib/firebase';
import { CommunityVideo } from '@/types';
import { ChevronDown, ChevronUp, FileText, Video } from 'lucide-react';

export const VIDEO_CATEGORIES: ('Orientation' | 'Universités' | 'Bourses' | 'IA & Tech' | 'Carrière' | 'Entrepreneuriat' | 'Motivation' | 'Sciences' | 'Examens' | 'Vie Étudiante')[] = [
  'Orientation', 'Universités', 'Bourses', 'IA & Tech', 'Carrière', 'Entrepreneuriat', 'Motivation', 'Sciences', 'Examens', 'Vie Étudiante'
];

export const CommunityVideoUploader = ({ onSuccess }: { onSuccess: () => void }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof VIDEO_CATEGORIES[0]>('Orientation');
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!auth.currentUser) throw new Error('Connectez-vous pour publier une vidéo.');
      
      const ytRegExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const vimeoRegExp = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
      const isMp4 = videoUrl.match(/\.(mp4|webm|ogg)$/i);
      
      let platform: 'youtube' | 'vimeo' | 'tiktok' | 'facebook' | 'dailymotion' = 'youtube';
      let videoId = null;
      let thumbnailInfo = '';

      if (videoUrl.match(ytRegExp)) {
        platform = 'youtube';
        const match = videoUrl.match(ytRegExp);
        if (match && match[2].length === 11) {
          videoId = match[2];
          thumbnailInfo = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        } else {
          throw new Error('Lien YouTube invalide.');
        }
      } else if (videoUrl.match(vimeoRegExp)) {
        platform = 'vimeo';
        const match = videoUrl.match(vimeoRegExp);
        if (match && match[1]) {
          videoId = match[1];
        } else {
          throw new Error('Lien Vimeo invalide.');
        }
      } else if (isMp4) {
        platform = 'youtube';
      } else {
        throw new Error('Plateforme non supportée. Veuillez utiliser un lien YouTube, Vimeo ou un lien vidéo direct (mp4).');
      }

      const finalTitle = title.trim() || (videoId ? `Vidéo ${platform} ${videoId}` : 'Nouvelle vidéo pédagogique');
      const finalDesc = description.trim() || 'Ressource vidéo partagée sur CampusBF';

      const metadata = {
        userId: auth.currentUser?.uid || '',
        username: auth.currentUser?.displayName || 'Anonyme',
        userPhoto: auth.currentUser?.photoURL || '',
        university: 'CampusBF',
        videoUrl,
        platform, 
        title: finalTitle,
        description: finalDesc,
        category,
        hashtags: [],
        thumbnail: thumbnailInfo,
        duration: '0:00'
      };
      
      await communityVideoService.publishVideo(metadata, auth.currentUser);
      toast.success('Vidéo publiée avec succès !');
      onSuccess();
      setVideoUrl('');
      setTitle('');
      setDescription('');
    } catch (e: any) {
      toast.error(e.message || 'Lien vidéo invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Video size={20} className="text-blue-600" />
        <h3 className="font-bold text-slate-800 text-base">Publier une nouvelle vidéo communautaire</h3>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Lien de la vidéo (YouTube, Vimeo, MP4)</label>
        <input 
          type="url" 
          value={videoUrl} 
          onChange={e => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          required
          className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie thématique</label>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value as any)} 
            className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {VIDEO_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full mt-5 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText size={16} className="text-blue-600" />
              Titre & Description personnalisée
            </span>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-4 pt-2 border-t border-slate-100 animate-fadeIn">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Titre de la vidéo</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Cours magistral d'Algèbre Linéaire - Semestre 1"
              className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description détaillée & objectifs pédagogiques</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Décrivez brièvement le contenu de la vidéo, les prérequis et les notions abordées..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button 
          type="submit" 
          disabled={loading} 
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
        >
          {loading ? 'Publication en cours...' : 'Publier la vidéo'}
        </button>
      </div>
    </form>
  );
};

