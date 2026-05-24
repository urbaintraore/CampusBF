import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'motion/react';
import { Lock, LogIn, UserPlus, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LockedSection({ title = "Contenu Privé" }: { title?: string }) {
  const { openAuthModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Automatically trigger the beautiful login popup/modal
    openAuthModal();
  }, []);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 relative overflow-hidden py-12">
      {/* Decorative floating shapes */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-emerald-600/5 rounded-full blur-2xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-lg bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 sm:p-12 text-center border border-slate-100 shadow-xl shadow-slate-200/50 relative z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner group">
            <Lock className="w-8 h-8 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold tracking-wider uppercase mb-2">
            <Sparkles size={12} className="animate-spin duration-3000" />
            Espace Membres CampusBF
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            Cette fonctionnalité est réservée aux membres inscrits de notre plateforme. Rejoignez la communauté d'étudiants pour y accéder en quelques secondes !
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => openAuthModal()}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/15 transition-all text-sm active:scale-95 cursor-pointer"
          >
            <LogIn size={18} />
            Se connecter
          </button>
          
          <button
            onClick={() => navigate('/signup', { state: { from: location } })}
            className="flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-slate-200 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 font-bold rounded-xl transition-all text-sm active:scale-95 cursor-pointer"
          >
            Créer un compte
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <span>✓ 100% Gratuit</span>
          <span>•</span>
          <span>✓ Accès instantané</span>
          <span>•</span>
          <span>✓ Offres exclusives</span>
        </div>
      </motion.div>
    </div>
  );
}
