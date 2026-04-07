import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    // Start login immediately to preserve the browser's "user gesture" for popups
    const loginPromise = loginWithGoogle();
    setIsLoading(true);
    
    try {
      await loginPromise;
      const currentUser = auth.currentUser;
      if (currentUser) {
        const isAdminEmail = (email: string | null | undefined) => {
          if (!email) return false;
          const lowerEmail = email.toLowerCase();
          return lowerEmail === 'urbain.traoreurb@gmail.com' || 
                 lowerEmail === 'urbain.traoreurb@gmail' || 
                 lowerEmail === 'urbain.traoreurb@gmail.com.';
        };

        if (isAdminEmail(currentUser.email)) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('popup-closed-by-user')) {
        setError('La fenêtre de connexion a été fermée. Si le problème persiste, vous pouvez utiliser le compte de test : admin@campusbf.bf / admin');
      } else if (err.message?.includes('popup-blocked')) {
        setError('Le popup a été bloqué. Veuillez autoriser les popups ou utiliser le compte : admin@campusbf.bf / admin');
      } else if (err.message?.includes('unauthorized-domain')) {
        setError("Ce domaine n'est pas autorisé. Ajoutez-le dans la console Firebase (Authentication > Settings > Authorized domains).");
      } else {
        setError(err.message || 'Erreur de connexion avec Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      const isAdminEmail = (email: string | null | undefined) => {
        if (!email) return false;
        const lowerEmail = email.toLowerCase();
        return lowerEmail === 'urbain.traoreurb@gmail.com' || 
               lowerEmail === 'urbain.traoreurb@gmail' || 
               lowerEmail === 'urbain.traoreurb@gmail.com.';
      };

      if (email.toLowerCase() === 'admin@campusbf.bf' || isAdminEmail(email)) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl p-8 sm:p-10 space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white font-display font-bold text-3xl mx-auto mb-6 shadow-lg shadow-emerald-500/30 ring-4 ring-white">
              C
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Bienvenue sur CampusBF</h1>
            <p className="text-slate-500 text-sm">Connectez-vous pour accéder à votre espace étudiant.</p>
          </div>

          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-slate-700">Mot de passe</label>
                <Link to="/forgot-password" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">Oublié ?</Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-medium py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Se connecter'}
            </button>
          </form>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200/60"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Ou continuer avec</span>
            <div className="flex-grow border-t border-slate-200/60"></div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-medium py-3.5 px-4 border border-slate-200/60 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-sm hover:shadow active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Google
            </button>
            <p className="text-[10px] text-center text-slate-400 font-medium uppercase tracking-widest">
              Réservé aux administrateurs
            </p>
          </div>

          <div className="text-center text-sm text-slate-500 pt-2">
            Pas encore de compte ? <Link to="/signup" className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">S'inscrire</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
