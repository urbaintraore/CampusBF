import React, { useState, useEffect } from 'react';
import { Share2, Copy, X, Check, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface InviteFriendsModalProps {
  onClose: () => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const referralsCount = user?.referralsCount || 0;
  const progress = Math.min((referralsCount / 5) * 100, 100);

  const referralLink = user?.referralCode 
    ? `https://campusbf.com/signup?ref=${user.referralCode}`
    : `https://campusbf.com/signup`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareData = {
    title: 'Rejoins CampusBF',
    text: 'Rejoins CampusBF pour accéder aux documents académiques et plus !',
    url: referralLink,
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">📚 Débloquez ce document</h2>
          <p className="text-slate-500">Pour continuer, vous devez inviter au moins 5 étudiants à rejoindre CampusBF. Vos amis doivent s'inscrire via ce lien pour que vous puissiez accéder au document.</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl space-y-2">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-600">Progression</span>
            <span className="text-emerald-600">{referralsCount} / 5 invitations</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={share} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700">
            <Share2 size={20} /> Partager le lien
          </button>
          <button onClick={copyToClipboard} className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200">
            {copied ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />} 
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
        </div>
        
        <p className="text-xs text-center text-slate-400">Plus vous invitez d’étudiants, plus vous accédez aux ressources exclusives de CampusBF.</p>
      </div>
    </div>
  );
};
