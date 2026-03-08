import React, { useState, useEffect } from 'react';
import { Shield, Lock, Smartphone, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'exam' | 'premium' | 'tutor' | 'marketplace';
  amount: number;
  title: string;
  description: string;
}

export function ManualPaymentModal({ isOpen, onClose, type, amount, title, description }: ManualPaymentModalProps) {
  const { submitSubscriptionRequest } = useAuth();
  const [step, setStep] = useState<'info' | 'success'>('info');

  useEffect(() => {
    if (isOpen) {
      setStep('info');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePaymentConfirm = () => {
    submitSubscriptionRequest(type, amount);
    setStep('success');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-emerald-700">
            <Lock size={18} />
            <span className="font-semibold text-sm">Paiement Manuel</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 'info' && (
            <div className="animate-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
                <p className="text-slate-500 text-sm">{description}</p>
                <div className="mt-4 inline-block bg-slate-100 px-4 py-2 rounded-lg font-mono text-xl font-bold text-slate-800">
                  {amount.toLocaleString()} FCFA
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-sm text-slate-700 font-medium text-center">
                  Veuillez effectuer le dépôt sur l'un des numéros suivants :
                </p>
                
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">OM</div>
                    <span className="font-semibold text-slate-800">Orange Money</span>
                  </div>
                  <span className="font-mono font-bold text-lg text-orange-700">+226 54 75 32 81</span>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Moov</div>
                    <span className="font-semibold text-slate-800">Moov Money</span>
                  </div>
                  <span className="font-mono font-bold text-lg text-blue-700">+226 63 37 52 57</span>
                </div>
              </div>

              <button 
                onClick={handlePaymentConfirm}
                className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
              >
                J'ai payé
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="font-bold text-2xl text-slate-900 mb-2 text-center">Demande envoyée !</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Votre abonnement sera activé dans au maximum <span className="font-bold text-emerald-600">1h</span>.
              </p>
              <button 
                onClick={onClose}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
