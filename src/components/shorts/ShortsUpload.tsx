import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Video, 
  Type, 
  Hash, 
  Globe, 
  Users, 
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileVideo,
  Link as LinkIcon
} from 'lucide-react';
import { generateVideoThumbnail } from '@/utils/videoUtils';
import { videoService } from '@/services/videoService';
import { analyzeCampusShort } from '@/services/geminiService';
import { toast } from 'react-hot-toast';

interface ShortsUploadProps {
  onClose: () => void;
  onSuccess: (videoId: string) => void;
}

const CATEGORIES = [
  "Cours", 
  "Astuces Examens", 
  "Vie Étudiante", 
  "Orientation", 
  "Opportunités", 
  "Humour Campus", 
  "Motivation"
];

const VISIBILITIES = [
  { id: 'public', label: 'Public', icon: Globe, description: 'Visible par tout le monde' },
  { id: 'university', label: 'Université', icon: ShieldCheck, description: 'Seulement votre université' },
  { id: 'friends', label: 'Amis', icon: Users, description: 'Seulement vos amis' },
  { id: 'group', label: 'Groupe', icon: Users, description: 'Seulement vos groupes' }
];

import { useAuth } from '@/context/AuthContext';

export const ShortsUpload: React.FC<ShortsUploadProps> = ({ onClose, onSuccess }) => {
  const { user, logActivity } = useAuth();
  const [uploadType, setUploadType] = useState<'file' | 'link'>('link');
  const [videoLink, setVideoLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<Blob | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [visibility, setVisibility] = useState('public');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Format non supporté. Utilisez MP4, WebM ou MOV.');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('La vidéo est trop grande. Maximum 50 MB.');
      return;
    }

    // Check duration
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    
    videoElement.onloadedmetadata = async () => {
      window.URL.revokeObjectURL(videoElement.src);
      
      setFile(selectedFile);
      try {
        const thumb = await generateVideoThumbnail(selectedFile);
        setThumbnail(thumb);
        setThumbnailUrl(URL.createObjectURL(thumb));
      } catch (err) {
        console.error('Thumbnail error:', err);
        toast.error('Erreur lors de la génération de la miniature');
      }
    };
    
    videoElement.src = URL.createObjectURL(selectedFile);
  };

  const handleUpload = async () => {
    if (uploadType === 'file' && (!file || !thumbnail)) {
      toast.error('Veuillez sélectionner une vidéo');
      return;
    }

    let finalLink = videoLink.trim();
    if (uploadType === 'link') {
      if (!finalLink) {
        toast.error('Veuillez fournir un lien vidéo');
        return;
      }
      if (!finalLink.startsWith('http')) {
        finalLink = 'https://' + finalLink;
      }
    }

    if (!title.trim()) {
      toast.error('Veuillez ajouter un titre');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10); // Start progress

    try {
      const hashtagsArray = hashtags
        .split(' ')
        .map(h => h.trim().replace('#', ''))
        .filter(h => h.length > 0);

      // 1. Analyse par l'IA
      setUploadProgress(20);
      toast('Analyse de la vidéo par l\'IA de modération...', { icon: '🤖' });
      const currentVideoUrl = uploadType === 'link' ? finalLink : 'Fichier uploadé';
      const moderationResult = await analyzeCampusShort(title, description, hashtagsArray, category, currentVideoUrl);

      if (!moderationResult.approved) {
        setIsUploading(false);
        setUploadProgress(0);
        toast.error(`Refusé : ${moderationResult.reason}`, { duration: 5000 });
        return;
      }

      toast.success('Approuvé par le modérateur CampusBF !');
      setUploadProgress(40);

      // Simulate further progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.floor(Math.random() * 10) + 1;
        });
      }, 500);

      // 2. Upload effectif
      const videoSource = uploadType === 'link' ? finalLink : file!;
      const videoId = await videoService.uploadVideo(videoSource, uploadType === 'file' ? thumbnail : null, {
        title,
        description,
        hashtags: hashtagsArray,
        category: category as any,
        visibility: visibility as any,
        username: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.firstName || 'Anonyme'),
        userPhoto: user?.avatarUrl || '',
        university: user?.university || 'Université non spécifiée',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (logActivity) {
        logActivity({
          action: 'Upload de Campus Short',
          module: 'Campus Shorts',
          details: `Upload: ${title}`,
          metadata: { videoId, category, uploadType }
        });
      }

      setTimeout(() => {
        toast.success('Vidéo publiée avec succès !');
        onSuccess(videoId);
        onClose();
      }, 500);
    } catch (err: any) {
      setUploadProgress(0);
      console.error('Upload error details:', err);
      if (err.message?.includes('Bucket not found')) {
        toast.error('Erreur Supabase: Les buckets "videos" et "thumbnails" n\'ont pas été créés.');
      } else {
        toast.error(`Erreur: ${err.message || 'Problème lors de la publication'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const isReady = uploadType === 'file' ? !!file : !!videoLink.trim();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
      >
        {/* Left Side: Video Preview & Selection */}
        <div className="w-full md:w-1/2 bg-gray-950 flex flex-col p-6 relative min-h-[300px]">
          
          <div className="flex bg-gray-800 rounded-xl p-1 mb-6 relative z-10 w-full max-w-xs mx-auto">
            <button
              onClick={() => setUploadType('file')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                uploadType === 'file' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
              }`}
            >
              Fichier
            </button>
            <button
              onClick={() => setUploadType('link')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                uploadType === 'link' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white'
              }`}
            >
              Lien Web
            </button>
          </div>

          {uploadType === 'file' ? (
            <div className="flex-1 flex flex-col items-center justify-center relative">
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500 hover:bg-white/5 transition-all group"
                >
                  <div className="p-4 bg-gray-900 rounded-full group-hover:scale-110 transition-transform">
                    <Upload className="text-gray-400 group-hover:text-blue-500" size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">Sélectionner une vidéo</p>
                    <p className="text-gray-500 text-xs mt-1">MP4, MOV ou WebM • Max 50MB</p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="video/mp4,video/webm,video/quicktime" 
                    className="hidden" 
                    onChange={handleFileSelect}
                  />
                </div>
              ) : (
                <div className="w-full h-full relative group flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-gray-800">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} className="w-full h-full object-contain" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileVideo className="text-white animate-pulse" size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => { setFile(null); setThumbnailUrl(null); }}
                      className="px-4 py-2 bg-white text-black rounded-lg font-bold text-sm shadow-xl hover:bg-gray-200"
                    >
                      Changer de vidéo
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full px-4 mb-4">
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl mb-6">
                  <p className="text-blue-200 text-sm text-center">
                    Collez le lien direct vers une vidéo éducative, astuce ou autre respectant notre ligne éditoriale.
                  </p>
                </div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">URL de la vidéo</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="url" 
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              {videoLink && (
                <div className="mt-8 flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle2 size={16} /> Lien prêt à être analysé
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Metadata Form */}
        <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Video className="text-blue-600" />
              Détails de la vidéo
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 flex-1">
            {/* Title & Description */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Titre</label>
                <div className="relative">
                  <Type className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Qu'est-ce que vous partagez ?"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dites-en plus sur votre vidéo..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Hashtags</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="examens studentlife burkina..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Category & Visibility */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Catégorie</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        category === cat 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Visibilité</label>
                <div className="grid grid-cols-2 gap-2">
                  {VISIBILITIES.map(vis => (
                    <button
                      key={vis.id}
                      onClick={() => setVisibility(vis.id)}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                        visibility === vis.id 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <vis.icon size={16} className={visibility === vis.id ? 'text-blue-600' : 'text-gray-400'} />
                      <span className={`text-[10px] font-black uppercase mt-1 ${visibility === vis.id ? 'text-blue-600' : 'text-gray-900'}`}>{vis.label}</span>
                      <span className="text-[10px] text-gray-500 leading-tight mt-0.5">{vis.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button 
              onClick={handleUpload}
              disabled={isUploading || !isReady}
              className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl relative overflow-hidden ${
                isUploading || !isReady
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20 active:scale-[0.98]'
              }`}
            >
              {/* Progress Bar Background */}
              {isUploading && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-300 ease-out opacity-20"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              
              <div className="relative z-10 flex items-center gap-3">
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Publication en cours... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload size={24} />
                    Publier Campus Short
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
