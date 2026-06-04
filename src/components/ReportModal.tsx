import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { reportService } from '@/services/reportService';
import { toast } from 'sonner';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedItemId: string;
  reportedItemType: 'post' | 'comment' | 'document' | 'internship' | 'marketplace' | 'event' | 'lostAndFound' | 'news' | 'colocation' | 'message';
  onReportingSuccess?: () => void;
}

const REPORT_REASONS = [
  "Contenu inapproprié ou offensant",
  "Harcèlement, discrimination ou haine",
  "Spam, publicité non sollicitée ou arnaque",
  "Infraction aux droits d'auteur",
  "Fausses informations / Contenu trompeur",
  "Autre raison"
];

export function ReportModal({ isOpen, onClose, reportedItemId, reportedItemType, onReportingSuccess }: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [customDetails, setCustomDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté pour signaler du contenu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const reasonText = selectedReason === "Autre raison" 
        ? `Autre: ${customDetails}` 
        : `${selectedReason}${customDetails ? ` - Détails: ${customDetails}` : ''}`;

      await reportService.addReport({
        reportedItemId,
        reportedItemType,
        reason: reasonText,
        reporterId: user.id || '',
        reporterName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur'
      });

      toast.success("Signalement envoyé avec succès. Merci de nous aider à garder notre communauté sûre !");
      if (onReportingSuccess) {
        onReportingSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Error adding report: ", err);
      toast.error("Une erreur s'est produite lors de l'envoi du signalement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative z-10 overflow-hidden transform transition-all border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Signaler un contenu</h3>
              <p className="text-xs text-amber-800 font-medium font-sans">
                Aidez-nous à modérer CampusBF
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          {!user ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
              Vous devez être connecté à votre compte pour déposer un signalement.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Motif du signalement
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <label 
                      key={reason} 
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedReason === reason 
                          ? 'bg-amber-50/50 border-amber-500 text-amber-900 ring-2 ring-amber-500/10' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="reportReason" 
                        value={reason} 
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-slate-300"
                      />
                      <span className="text-sm font-semibold">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Détails ou précisions supplémentaires (Optionnel)
                </label>
                <textarea
                  value={customDetails}
                  onChange={(e) => setCustomDetails(e.target.value)}
                  placeholder="Décrivez brièvement pourquoi ce contenu pose problème..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-sans"
                />
              </div>

              <div className="text-xs text-slate-500 italic leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                ⚠️ Les signalements abusifs répétés peuvent entraîner des sanctions ou la suspension temporaire de votre compte.
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !user}
              className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-bold text-sm rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-amber-600/10 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Envoi...</span>
                </>
              ) : (
                <span>Confirmer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
