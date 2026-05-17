import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { communityVideoService } from '@/services/communityVideoService';
import { auth } from '@/lib/firebase';
import { CommunityVideo } from '@/types';

export const VIDEO_CATEGORIES: ('Orientation' | 'Universités' | 'Bourses' | 'IA & Tech' | 'Carrière' | 'Entrepreneuriat' | 'Motivation' | 'Sciences' | 'Examens' | 'Vie Étudiante')[] = [
  'Orientation', 'Universités', 'Bourses', 'IA & Tech', 'Carrière', 'Entrepreneuriat', 'Motivation', 'Sciences', 'Examens', 'Vie Étudiante'
];

export const CommunityVideoUploader = ({ onSuccess }: { onSuccess: () => void }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState<typeof VIDEO_CATEGORIES[0]>('Orientation');
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
        platform = 'youtube'; // Defaulting direct links as handled generically
      } else {
        throw new Error('Plateforme non supportée. Veuillez utiliser un lien YouTube, Vimeo ou un lien vidéo direct (mp4).');
      }

      const metadata = {
        userId: auth.currentUser?.uid || '',
        username: auth.currentUser?.displayName || 'Anonyme',
        userPhoto: auth.currentUser?.photoURL || '',
        university: 'CampusBF',
        videoUrl,
        platform, 
        title: videoId ? `Video ${platform} ${videoId}` : 'Nouvelle vidéo',
        description: 'Vidéos utiles pour les étudiants',
        category,
        hashtags: [],
        thumbnail: thumbnailInfo,
        duration: '0:00'
      };
      
      await communityVideoService.publishVideo(metadata, auth.currentUser);
      toast.success('Vidéo soumise avec succès !');
      onSuccess();
      setVideoUrl(''); // Reset standard upload behavior
    } catch (e: any) {
      toast.error(e.message || 'Lien vidéo invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200">
      <input 
        type="url" 
        value={videoUrl} 
        onChange={e => setVideoUrl(e.target.value)}
        placeholder="Collez le lien YouTube ici"
        className="w-full p-2 border rounded-lg"
      />
      <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full mt-2 p-2 border rounded-lg">
        {VIDEO_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
      </select>
      <button type="submit" disabled={loading} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">
        {loading ? 'Analyse en cours...' : 'Publier'}
      </button>
    </form>
  );
};
