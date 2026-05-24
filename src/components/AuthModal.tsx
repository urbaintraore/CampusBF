import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Loader2, X, Lock, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '@/components/Logo';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, authModalCallback, setAuthModalCallback } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  if (!showAuthModal) return null;

  const handleClose = () => {
    setShowAuthModal(false);
    setAuthModalCallback(null);
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      
      // Successfully authenticated!
      setShowAuthModal(false);
      
      // Execute pending action if any
      if (authModalCallback) {
        authModalCallback();
        setAuthModalCallback(null);
      }
    } catch (err: any) {
      console.error("[AuthModal] caught error:", err);
      let errorMessage = err.message || 'Erreur de connexion';
      const errorCode = err.code || (err.message?.includes('auth/') ? err.message : null);

      if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        errorMessage = `Ce domaine (${window.location.hostname}) n'est pas autorisé.`;
      } else if (errorCode === 'auth/network-request-failed' || errorMessage.includes('network-request-failed')) {
        errorMessage = "Erreur réseau. Vérifiez votre connexion internet.";
      } else if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
        errorMessage = "Identifiants invalides ou incorrects.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    handleClose();
    // Redirect to signup, storing current location
    navigate('/signup', { state: { from: location } });
  };

  const handleForgotRedirect = () => {
    handleClose();
    navigate('/forgot-password', { state: { from: location } });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl relative overflow-hidden z-10 p-8 sm:p-10"
        >
          {/* Decorative design elements */}
          <div className="absolute top-[-20%] left-[-20%] w-60 h-60 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-60 h-60 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none"></div>

          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          {/* Content */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <Logo size="md" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                <Lock size={16} className="animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Accès Visiteur • Connexion Requise</span>
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Connectez-vous pour continuer</h2>
              <p className="text-slate-500 text-sm">
                Pour profiter de toutes les fonctionnalités de CampusBF, connectez-vous ou inscrivez-vous gratuitement.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 border border-red-100 p-3.5 rounded-2xl text-xs font-medium text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mot de passe</label>
                  <button 
                    type="button"
                    onClick={handleForgotRedirect}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm pointer-events-auto"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Se connecter'}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-5 text-center space-y-3">
              <p className="text-slate-500 text-xs">Pas encore de compte ?</p>
              <button 
                onClick={handleRegisterRedirect}
                className="w-full border-2 border-slate-200 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 font-bold py-3 rounded-xl transition-all text-sm cursor-pointer"
              >
                Créer un compte CampusBF (Gratuit)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
