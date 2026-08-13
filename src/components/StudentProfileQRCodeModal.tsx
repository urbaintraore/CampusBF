import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Share2, Copy, Check, X, GraduationCap, Building2, ShieldCheck, Sparkles, MapPin, Phone, Mail } from 'lucide-react';
import { User } from '@/types';
import html2canvas from 'html2canvas';

interface StudentProfileQRCodeModalProps {
  user: User;
  onClose: () => void;
}

export const StudentProfileQRCodeModal: React.FC<StudentProfileQRCodeModalProps> = ({ user, onClose }) => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Construct URL or structured vCard string for scanning
  const profileUrl = window.location.origin + `/profile?id=${user.id || 'student'}`;
  
  // Clean vCard formatted text if scanned with standard camera
  const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${user.firstName} ${user.lastName}
ORG:${user.university || 'Université BF'}
TITLE:${user.major || 'Étudiant'} - ${user.level || ''}
TEL:${user.phone || ''}
EMAIL:${user.email || ''}
NOTE:Profil Etudiant CampusBF - INE: ${user.ine || 'N/A'}
URL:${profileUrl}
END:VCARD`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBadge = async () => {
    if (!badgeRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Badge_CampusBF_${user.firstName}_${user.lastName}.png`;
      link.click();
    } catch (err) {
      console.error("Error generating QR code badge image:", err);
      alert("Erreur lors du téléchargement du badge QR.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Profil CampusBF - ${user.firstName} ${user.lastName}`,
          text: `Retrouvez mon profil étudiant sur CampusBF !`,
          url: profileUrl,
        });
      } catch (err) {
        console.warn("Share failed:", err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col relative">
        
        {/* Sticky Modal Header with Close Button */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 rounded-xl">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Badge Réseautage & QR Code</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Présente ce QR Code lors des événements</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Printable/Downloadable Badge Body */}
        <div className="p-4 sm:p-6 flex flex-col items-center overflow-y-auto space-y-4">
          <div 
            ref={badgeRef}
            className="w-full bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-5 shadow-xl border border-emerald-500/30 relative overflow-hidden flex flex-col items-center text-center space-y-3"
          >
            {/* Background pattern */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Header branding */}
            <div className="flex items-center justify-between w-full border-b border-white/10 pb-2.5">
              <span className="font-extrabold tracking-tight text-emerald-400 text-xs flex items-center gap-1.5">
                <Sparkles size={14} /> CampusBF
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} /> Badge Étudiant
              </span>
            </div>

            {/* Student Photo & Identity */}
            <div className="flex flex-col items-center pt-1">
              <img 
                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=0D9488&color=fff`} 
                alt={user.firstName} 
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border-2 border-emerald-400/50 shadow-lg object-cover mb-2"
              />
              <h2 className="text-lg font-bold tracking-tight text-white">{user.firstName} {user.lastName}</h2>
              <p className="text-xs text-emerald-300 font-medium">{user.major || 'Filière non renseignée'} {user.level ? `• ${user.level}` : ''}</p>
              
              {user.university && (
                <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                  <Building2 size={12} className="text-emerald-400" />
                  {user.university}
                </p>
              )}
            </div>

            {/* QR Code Canvas */}
            <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-100 my-1 flex flex-col items-center">
              <QRCodeSVG 
                value={profileUrl}
                size={130}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/graduation-cap.svg",
                  x: undefined,
                  y: undefined,
                  height: 20,
                  width: 20,
                  excavate: true,
                }}
              />
              <p className="text-[9px] text-slate-500 font-semibold mt-1.5 uppercase tracking-wider">Scannez pour me contacter</p>
            </div>

            {/* Verification Footer */}
            <div className="text-[10px] text-slate-400 flex items-center justify-between w-full pt-2 border-t border-white/10">
              <span>INE: {user.ine || 'Certifié CampusBF'}</span>
              <span>www.campusbf.bf</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
            <button 
              onClick={handleDownloadBadge}
              disabled={downloading}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Download size={15} />
              {downloading ? 'Génération...' : 'Télécharger Image'}
            </button>

            <button 
              onClick={handleShare}
              className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Share2 size={15} />
              Partager
            </button>
          </div>

          <button 
            onClick={handleCopyLink}
            className="w-full py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            {copied ? 'Lien de profil copié !' : 'Copier le lien direct de profil'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
          >
            Fermer le badge
          </button>
        </div>
      </div>
    </div>
  );
};
