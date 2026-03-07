import React, { useState } from 'react';
import { Smartphone, CheckCircle, Clock, AlertCircle, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMoneyPaymentProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
}

type PaymentStep = 'method' | 'phone' | 'otp' | 'processing' | 'success';
type PaymentMethod = 'orange' | 'moov';

export default function MobileMoneyPayment({ amount, onSuccess, onCancel, title = "Paiement Mobile Money" }: MobileMoneyPaymentProps) {
  const [step, setStep] = useState<PaymentStep>('method');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isError, setIsError] = useState(false);

  const handleMethodSelect = (m: PaymentMethod) => {
    setMethod(m);
    setStep('phone');
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 8) {
      setIsError(true);
      return;
    }
    setIsError(false);
    setStep('otp');
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setIsError(true);
      return;
    }
    setIsError(false);
    setStep('processing');
    
    // Simulate processing
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
        <span className="text-sm text-gray-600">Montant à payer</span>
        <span className="text-lg font-bold text-emerald-600">{amount.toLocaleString()} CFA</span>
      </div>

      {step === 'method' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">Choisissez votre mode de paiement :</p>
          <button 
            onClick={() => handleMethodSelect('orange')}
            className="w-full p-4 border-2 border-gray-100 rounded-xl flex items-center gap-4 hover:border-orange-500 hover:bg-orange-50 transition-all group"
          >
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              OM
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 group-hover:text-orange-700">Orange Money</p>
              <p className="text-xs text-gray-500">Paiement via USSD *144*4*6#</p>
            </div>
            <ArrowRight size={18} className="ml-auto text-gray-300 group-hover:text-orange-500" />
          </button>
          
          <button 
            onClick={() => handleMethodSelect('moov')}
            className="w-full p-4 border-2 border-gray-100 rounded-xl flex items-center gap-4 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              MOOV
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 group-hover:text-blue-700">Moov Money</p>
              <p className="text-xs text-gray-500">Paiement via USSD *555*4*1#</p>
            </div>
            <ArrowRight size={18} className="ml-auto text-gray-300 group-hover:text-blue-500" />
          </button>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Numéro de téléphone {method === 'orange' ? 'Orange' : 'Moov'}</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="7X XX XX XX" 
                className={cn(
                  "w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl outline-none transition-all",
                  isError ? "border-red-500 focus:ring-red-500/20" : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                )}
                autoFocus
              />
            </div>
            {isError && <p className="text-xs text-red-500 mt-1">Veuillez entrer un numéro valide.</p>}
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
          >
            Continuer
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="text-center space-y-2 mb-4">
            <p className="text-sm text-gray-600">
              Un code de confirmation a été envoyé au <span className="font-bold text-gray-900">{phone}</span>.
            </p>
            <p className="text-xs text-gray-400 italic">
              (Simulation : Entrez n'importe quel code à 4 chiffres)
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Code de confirmation (OTP)</label>
            <input 
              type="text" 
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000" 
              className={cn(
                "w-full p-3 bg-gray-50 border rounded-xl text-center text-2xl tracking-[1em] outline-none transition-all",
                isError ? "border-red-500" : "border-gray-200 focus:border-emerald-500"
              )}
              autoFocus
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
          >
            Confirmer le paiement
          </button>
          <button 
            type="button"
            onClick={() => setStep('phone')}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Changer de numéro
          </button>
        </form>
      )}

      {step === 'processing' && (
        <div className="py-12 text-center space-y-4">
          <Clock size={48} className="mx-auto text-emerald-600 animate-spin" />
          <div>
            <p className="font-bold text-gray-900">Traitement en cours...</p>
            <p className="text-sm text-gray-500">Veuillez ne pas fermer cette fenêtre.</p>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="py-12 text-center space-y-4 animate-in fade-in zoom-in-95">
          <CheckCircle size={64} className="mx-auto text-emerald-600" />
          <div>
            <p className="text-xl font-bold text-gray-900">Paiement réussi !</p>
            <p className="text-sm text-gray-500">Votre transaction a été confirmée.</p>
          </div>
        </div>
      )}
    </div>
  );
}
